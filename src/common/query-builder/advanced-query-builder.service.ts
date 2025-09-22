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
    const queryBuilder = repository.createQueryBuilder('entity');

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
    if (!relations.relations?.length) return;

    relations.relations.forEach((path) => {
      this.ensureJoinsForPath(
        queryBuilder,
        path,
        relations.eager === true ? true : false,
      );
    });
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

      // Hỗ trợ field theo path lồng nhau: relation1.relation2.field
      let targetAlias = 'entity';
      let targetField = field;
      if (field.includes('.')) {
        const resolved = this.reflectionService.resolvePath(entity, field);
        if (!resolved.valid || !resolved.finalField) {
          this.logger.warn(`Invalid filter path: ${field}`);
          return;
        }
        // Tạo join cho phần quan hệ, trả về alias cuối
        const relationPath = field.split('.').slice(0, -1).join('.');
        targetAlias = this.ensureJoinsForPath(
          queryBuilder,
          relationPath,
          false,
        );
        targetField = resolved.finalField;
      } else {
        // Validate field là filterable ở entity gốc
        if (!this.reflectionService.validateField(entity, field, 'filter')) {
          this.logger.warn(
            `Field ${field} is not filterable for entity ${entity.name}`,
          );
          return;
        }
      }

      switch (operator) {
        case 'eq':
          queryBuilder.andWhere(
            `${targetAlias}.${targetField} = :${paramName}`,
            {
              [paramName]: value,
            },
          );
          break;
        case 'ne':
          queryBuilder.andWhere(
            `${targetAlias}.${targetField} != :${paramName}`,
            {
              [paramName]: value,
            },
          );
          break;
        case 'gt':
          queryBuilder.andWhere(
            `${targetAlias}.${targetField} > :${paramName}`,
            {
              [paramName]: value,
            },
          );
          break;
        case 'gte':
          queryBuilder.andWhere(
            `${targetAlias}.${targetField} >= :${paramName}`,
            {
              [paramName]: value,
            },
          );
          break;
        case 'lt':
          queryBuilder.andWhere(
            `${targetAlias}.${targetField} < :${paramName}`,
            {
              [paramName]: value,
            },
          );
          break;
        case 'lte':
          queryBuilder.andWhere(
            `${targetAlias}.${targetField} <= :${paramName}`,
            {
              [paramName]: value,
            },
          );
          break;
        case 'in':
          queryBuilder.andWhere(
            `${targetAlias}.${targetField} IN (:...${paramName})`,
            {
              [paramName]: values || [value],
            },
          );
          break;
        case 'nin':
          queryBuilder.andWhere(
            `${targetAlias}.${targetField} NOT IN (:...${paramName})`,
            {
              [paramName]: values || [value],
            },
          );
          break;
        case 'like':
          queryBuilder.andWhere(
            `${targetAlias}.${targetField} LIKE :${paramName}`,
            {
              [paramName]: `%${value}%`,
            },
          );
          break;
        case 'ilike':
          queryBuilder.andWhere(
            `${targetAlias}.${targetField} ILIKE :${paramName}`,
            {
              [paramName]: `%${value}%`,
            },
          );
          break;
        case 'between':
          if (values && values.length === 2) {
            queryBuilder.andWhere(
              `${targetAlias}.${targetField} BETWEEN :${paramName}_start AND :${paramName}_end`,
              {
                [`${paramName}_start`]: values[0],
                [`${paramName}_end`]: values[1],
              },
            );
          }
          break;
        case 'isNull':
          queryBuilder.andWhere(`${targetAlias}.${targetField} IS NULL`);
          break;
        case 'isNotNull':
          queryBuilder.andWhere(`${targetAlias}.${targetField} IS NOT NULL`);
          break;
        case 'contains':
          queryBuilder.andWhere(
            `${targetAlias}.${targetField} ILIKE :${paramName}`,
            {
              [paramName]: `%${value}%`,
            },
          );
          break;
        case 'startsWith':
          queryBuilder.andWhere(
            `${targetAlias}.${targetField} ILIKE :${paramName}`,
            {
              [paramName]: `${value}%`,
            },
          );
          break;
        case 'endsWith':
          queryBuilder.andWhere(
            `${targetAlias}.${targetField} ILIKE :${paramName}`,
            {
              [paramName]: `%${value}`,
            },
          );
          break;
        case 'regex':
          queryBuilder.andWhere(
            `${targetAlias}.${targetField} ~ :${paramName}`,
            {
              [paramName]: value,
            },
          );
          break;
        case 'dateRange':
          if (values && values.length === 2) {
            queryBuilder.andWhere(
              `${targetAlias}.${targetField} BETWEEN :${paramName}_start AND :${paramName}_end`,
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

    const searchConditions: string[] = [];
    fields.forEach((field) => {
      let alias = 'entity';
      let col = field;
      if (field.includes('.')) {
        const resolved = this.reflectionService.resolvePath(entity, field);
        if (!resolved.valid || !resolved.finalField) return;
        const relationPath = field.split('.').slice(0, -1).join('.');
        alias = this.ensureJoinsForPath(queryBuilder, relationPath, false);
        col = resolved.finalField;
      } else if (
        !this.reflectionService.validateField(entity, field, 'search')
      ) {
        return;
      }
      const operator = caseSensitive ? 'LIKE' : 'ILIKE';
      searchConditions.push(`${alias}.${col} ${operator} :searchQuery`);
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
      let alias = 'entity';
      let col = field;
      if (field.includes('.')) {
        const resolved = this.reflectionService.resolvePath(entity, field);
        if (!resolved.valid || !resolved.finalField) {
          this.logger.warn(`Invalid sort path: ${field}`);
          return;
        }
        const relationPath = field.split('.').slice(0, -1).join('.');
        alias = this.ensureJoinsForPath(queryBuilder, relationPath, false);
        col = resolved.finalField;
      } else if (!this.reflectionService.validateField(entity, field, 'sort')) {
        this.logger.warn(
          `Field ${field} is not sortable for entity ${entity.name}`,
        );
        return;
      }
      queryBuilder.addOrderBy(`${alias}.${col}`, direction);
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
      let alias = 'entity';
      let col = field;
      if (field.includes('.')) {
        const resolved = this.reflectionService.resolvePath(entity, field);
        if (!resolved.valid || !resolved.finalField) return;
        const relationPath = field.split('.').slice(0, -1).join('.');
        alias = this.ensureJoinsForPath(queryBuilder, relationPath, false);
        col = resolved.finalField;
      }

      switch (operator) {
        case 'eq':
          queryBuilder.having(`${alias}.${col} = :${paramName}`, {
            [paramName]: value,
          });
          break;
        case 'gt':
          queryBuilder.having(`${alias}.${col} > :${paramName}`, {
            [paramName]: value,
          });
          break;
        case 'gte':
          queryBuilder.having(`${alias}.${col} >= :${paramName}`, {
            [paramName]: value,
          });
          break;
        case 'lt':
          queryBuilder.having(`${alias}.${col} < :${paramName}`, {
            [paramName]: value,
          });
          break;
        case 'lte':
          queryBuilder.having(`${alias}.${col} <= :${paramName}`, {
            [paramName]: value,
          });
          break;
        default:
          this.logger.warn(`Unsupported having operator: ${operator}`);
      }
    });
  }

  /**
   * Đảm bảo đã join đầy đủ cho path lồng nhau, trả về alias cuối cùng
   * Ví dụ: "profile.address" -> join entity.profile AS profile, profile.address AS profile_address
   */
  private ensureJoinsForPath<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    path: string,
    select: boolean,
  ): string {
    const parts = path.split('.').filter(Boolean);
    let currentAlias = 'entity';
    let builtPath = '';
    parts.forEach((part, idx) => {
      const nextAlias = builtPath ? `${builtPath}_${part}` : part;
      const joinPath = `${currentAlias}.${part}`;
      // tránh join trùng: TypeORM không expose check dễ, dùng addOrderBy trick không hợp lý; ta thử catch lỗi join trùng bằng try-catch? tránh rủi ro, cứ leftJoin với alias duy nhất
      if (select) {
        queryBuilder.leftJoinAndSelect(joinPath, nextAlias);
      } else {
        queryBuilder.leftJoin(joinPath, nextAlias);
      }
      currentAlias = nextAlias;
      builtPath = nextAlias;
    });
    return currentAlias || 'entity';
  }
}
