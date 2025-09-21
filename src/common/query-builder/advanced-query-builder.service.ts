import { Injectable, Logger } from '@nestjs/common';
import { SelectQueryBuilder, Repository, ObjectLiteral } from 'typeorm';
import {
  QueryBuilderOptions,
  FilterOptions,
  SortOptions,
  SearchOptions,
  RelationOptions,
  SelectOptions,
  PaginatedResult,
  QueryResult,
  AdvancedQueryOptions,
  QueryContext,
  QueryExecutionOptions,
} from '../interfaces/pagination.interface';
import { ReflectionService } from '../reflection/reflection.service';

@Injectable()
export class AdvancedQueryBuilderService {
  private readonly logger = new Logger(AdvancedQueryBuilderService.name);

  constructor(private readonly reflectionService: ReflectionService) {}

  /**
   * Build advanced query with all options
   */
  async buildAdvancedQuery<T extends ObjectLiteral>(
    repository: Repository<T>,
    entity: new () => T,
    options: AdvancedQueryOptions,
    executionOptions?: QueryExecutionOptions,
  ): Promise<SelectQueryBuilder<T>> {
    const queryBuilder = repository.createQueryBuilder();

    // Apply select fields
    if (options.select?.fields?.length) {
      this.applySelect(queryBuilder, options.select);
    }

    // Apply relations
    if (options.relations?.relations?.length) {
      this.applyRelations(queryBuilder, options.relations);
    }

    // Apply filters
    if (options.filters?.length) {
      this.applyFilters(queryBuilder, entity, options.filters);
    }

    // Apply search
    if (options.search?.query) {
      this.applySearch(queryBuilder, entity, options.search);
    }

    // Apply sorting
    if (options.sort?.length) {
      this.applySorting(queryBuilder, entity, options.sort);
    }

    // Apply group by
    if (options.groupBy?.length) {
      this.applyGroupBy(queryBuilder, options.groupBy);
    }

    // Apply having
    if (options.having?.length) {
      this.applyHaving(queryBuilder, entity, options.having);
    }

    // Apply distinct
    if (options.distinct) {
      queryBuilder.distinct(true);
    }

    // Apply cache
    if (options.cache) {
      queryBuilder.cache(
        typeof options.cache === 'number' ? options.cache : true,
      );
    }

    // Apply lock
    if (options.lock) {
      queryBuilder.setLock(options.lock, undefined);
    }

    // Note: timeout and explain are not available in TypeORM SelectQueryBuilder
    // These would need to be implemented at the database level

    return queryBuilder;
  }

  /**
   * Execute paginated query
   */
  async executePaginatedQuery<T extends ObjectLiteral>(
    repository: Repository<T>,
    entity: new () => T,
    options: QueryBuilderOptions,
    executionOptions?: QueryExecutionOptions,
  ): Promise<PaginatedResult<T>> {
    const { page = 1, limit = 10 } = options.pagination || {};
    const offset = (page - 1) * limit;

    // Build query
    const queryBuilder = await this.buildAdvancedQuery(
      repository,
      entity,
      options,
      executionOptions,
    );

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    queryBuilder.skip(offset).take(limit);

    // Execute query
    const data = await queryBuilder.getMany();

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        offset,
      },
    };
  }

  /**
   * Execute simple query
   */
  async executeQuery<T extends ObjectLiteral>(
    repository: Repository<T>,
    entity: new () => T,
    options: QueryBuilderOptions,
    executionOptions?: QueryExecutionOptions,
  ): Promise<QueryResult<T>> {
    const queryBuilder = await this.buildAdvancedQuery(
      repository,
      entity,
      options,
      executionOptions,
    );

    const data = await queryBuilder.getMany();

    // Get total if pagination is requested
    let total: number | undefined;
    if (options.pagination) {
      const countQueryBuilder = await this.buildAdvancedQuery(
        repository,
        entity,
        { ...options, pagination: undefined },
        executionOptions,
      );
      total = await countQueryBuilder.getCount();
    }

    return { data, total };
  }

  /**
   * Apply select fields
   */
  private applySelect<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    select: SelectOptions,
  ): void {
    if (select.fields?.length) {
      const fields = select.fields.map((field) => `entity.${field}`).join(', ');
      queryBuilder.select(fields);
    }

    if (select.exclude?.length) {
      // Note: TypeORM doesn't have direct exclude, would need custom implementation
      this.logger.warn(
        'Exclude fields not fully supported in TypeORM query builder',
      );
    }
  }

  /**
   * Apply relations
   */
  private applyRelations<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    relations: RelationOptions,
  ): void {
    if (relations.relations?.length) {
      relations.relations.forEach((relation) => {
        if (relations.eager) {
          queryBuilder.leftJoinAndSelect(`entity.${relation}`, relation);
        } else {
          queryBuilder.leftJoin(`entity.${relation}`, relation);
        }
      });
    }
  }

  /**
   * Apply filters
   */
  private applyFilters<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    entity: new () => T,
    filters: FilterOptions[],
  ): void {
    filters.forEach((filter, index) => {
      const { field, operator, value, values } = filter;
      const paramName = `filter_${index}`;

      // Validate field is filterable using runtime reflection
      if (!this.reflectionService.validateField(entity, field, 'filter')) {
        this.logger.warn(
          `Field ${field} is not filterable for entity ${entity.name}`,
        );
        return;
      }

      switch (operator) {
        case 'eq':
          queryBuilder.andWhere(`entity.${field} = :${paramName}`, {
            [paramName]: value,
          });
          break;
        case 'ne':
          queryBuilder.andWhere(`entity.${field} != :${paramName}`, {
            [paramName]: value,
          });
          break;
        case 'gt':
          queryBuilder.andWhere(`entity.${field} > :${paramName}`, {
            [paramName]: value,
          });
          break;
        case 'gte':
          queryBuilder.andWhere(`entity.${field} >= :${paramName}`, {
            [paramName]: value,
          });
          break;
        case 'lt':
          queryBuilder.andWhere(`entity.${field} < :${paramName}`, {
            [paramName]: value,
          });
          break;
        case 'lte':
          queryBuilder.andWhere(`entity.${field} <= :${paramName}`, {
            [paramName]: value,
          });
          break;
        case 'in':
          queryBuilder.andWhere(`entity.${field} IN (:...${paramName})`, {
            [paramName]: values || [value],
          });
          break;
        case 'nin':
          queryBuilder.andWhere(`entity.${field} NOT IN (:...${paramName})`, {
            [paramName]: values || [value],
          });
          break;
        case 'like':
          queryBuilder.andWhere(`entity.${field} LIKE :${paramName}`, {
            [paramName]: `%${value}%`,
          });
          break;
        case 'ilike':
          queryBuilder.andWhere(`entity.${field} ILIKE :${paramName}`, {
            [paramName]: `%${value}%`,
          });
          break;
        case 'between':
          if (values && values.length === 2) {
            queryBuilder.andWhere(
              `entity.${field} BETWEEN :${paramName}_start AND :${paramName}_end`,
              {
                [`${paramName}_start`]: values[0],
                [`${paramName}_end`]: values[1],
              },
            );
          }
          break;
        case 'isNull':
          queryBuilder.andWhere(`entity.${field} IS NULL`);
          break;
        case 'isNotNull':
          queryBuilder.andWhere(`entity.${field} IS NOT NULL`);
          break;
        case 'contains':
          queryBuilder.andWhere(`entity.${field} ILIKE :${paramName}`, {
            [paramName]: `%${value}%`,
          });
          break;
        case 'startsWith':
          queryBuilder.andWhere(`entity.${field} ILIKE :${paramName}`, {
            [paramName]: `${value}%`,
          });
          break;
        case 'endsWith':
          queryBuilder.andWhere(`entity.${field} ILIKE :${paramName}`, {
            [paramName]: `%${value}`,
          });
          break;
        case 'regex':
          queryBuilder.andWhere(`entity.${field} ~ :${paramName}`, {
            [paramName]: value,
          });
          break;
        case 'dateRange':
          if (values && values.length === 2) {
            queryBuilder.andWhere(
              `entity.${field} BETWEEN :${paramName}_start AND :${paramName}_end`,
              {
                [`${paramName}_start`]: values[0],
                [`${paramName}_end`]: values[1],
              },
            );
          }
          break;
        default:
          this.logger.warn(`Unsupported filter operator: ${operator}`);
      }
    });
  }

  /**
   * Apply search
   */
  private applySearch<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    entity: new () => T,
    search: SearchOptions,
  ): void {
    const {
      query,
      fields = [],
      mode = 'partial',
      caseSensitive = false,
    } = search;

    if (!query || !fields.length) return;

    const searchConditions = fields
      .filter((field) =>
        this.reflectionService.validateField(entity, field, 'search'),
      )
      .map((field) => {
        const searchValue = mode === 'exact' ? query : `%${query}%`;
        const operator = caseSensitive ? 'LIKE' : 'ILIKE';
        return `entity.${field} ${operator} :searchQuery`;
      });

    if (searchConditions.length > 0) {
      queryBuilder.andWhere(`(${searchConditions.join(' OR ')})`, {
        searchQuery: mode === 'exact' ? query : `%${query}%`,
      });
    }
  }

  /**
   * Apply sorting
   */
  private applySorting<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    entity: new () => T,
    sort: SortOptions[],
  ): void {
    sort.forEach(({ field, direction }) => {
      if (this.reflectionService.validateField(entity, field, 'sort')) {
        queryBuilder.addOrderBy(`entity.${field}`, direction);
      } else {
        this.logger.warn(
          `Field ${field} is not sortable for entity ${entity.name}`,
        );
      }
    });
  }

  /**
   * Apply group by
   */
  private applyGroupBy<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    groupBy: string[],
  ): void {
    groupBy.forEach((field) => {
      queryBuilder.addGroupBy(`entity.${field}`);
    });
  }

  /**
   * Apply having conditions
   */
  private applyHaving<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    entity: new () => T,
    having: FilterOptions[],
  ): void {
    having.forEach((condition, index) => {
      const { field, operator, value } = condition;
      const paramName = `having_${index}`;

      switch (operator) {
        case 'eq':
          queryBuilder.having(`entity.${field} = :${paramName}`, {
            [paramName]: value,
          });
          break;
        case 'gt':
          queryBuilder.having(`entity.${field} > :${paramName}`, {
            [paramName]: value,
          });
          break;
        case 'gte':
          queryBuilder.having(`entity.${field} >= :${paramName}`, {
            [paramName]: value,
          });
          break;
        case 'lt':
          queryBuilder.having(`entity.${field} < :${paramName}`, {
            [paramName]: value,
          });
          break;
        case 'lte':
          queryBuilder.having(`entity.${field} <= :${paramName}`, {
            [paramName]: value,
          });
          break;
        default:
          this.logger.warn(`Unsupported having operator: ${operator}`);
      }
    });
  }
}
