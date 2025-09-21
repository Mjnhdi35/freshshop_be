import { Injectable, Logger } from '@nestjs/common';
import { SelectQueryBuilder, Repository, ObjectLiteral } from 'typeorm';
import {
  QueryBuilderOptions,
  FilterOptions,
  SortOptions,
  SearchOptions,
  PaginatedResult,
  QueryResult,
} from '../interfaces/pagination.interface';
import { ReflectionService } from '../reflection/reflection.service';

/**
 * Simple filter interface for easy frontend usage
 */
export interface SimpleFilter {
  field: string;
  value: any;
  operator?:
    | 'eq'
    | 'ne'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'like'
    | 'in'
    | 'between'
    | 'isNull'
    | 'isNotNull';
}

/**
 * Simple sort interface
 */
export interface SimpleSort {
  field: string;
  direction?: 'ASC' | 'DESC';
}

/**
 * Simple search interface
 */
export interface SimpleSearch {
  query: string;
  fields?: string[];
}

/**
 * Dynamic query options for easy frontend usage
 */
export interface DynamicQueryOptions {
  // Simple filters
  filters?: SimpleFilter[];
  // Simple search
  search?: SimpleSearch;
  // Simple sort
  sort?: SimpleSort[];
  // Pagination
  page?: number;
  limit?: number;
  // Relations to include
  include?: string[];
  // Fields to select
  select?: string[];
  // Exclude fields
  exclude?: string[];
}

@Injectable()
export class DynamicQueryBuilderService {
  private readonly logger = new Logger(DynamicQueryBuilderService.name);

  constructor(private readonly reflectionService: ReflectionService) {}

  /**
   * Build query from simple options (frontend-friendly)
   */
  async buildDynamicQuery<T extends ObjectLiteral>(
    repository: Repository<T>,
    entity: new () => T,
    options: DynamicQueryOptions,
  ): Promise<SelectQueryBuilder<T>> {
    const queryBuilder = repository.createQueryBuilder();

    // Apply select fields
    if (options.select?.length) {
      const fields = options.select
        .map((field) => `entity.${field}`)
        .join(', ');
      queryBuilder.select(fields);
    }

    // Apply relations
    if (options.include?.length) {
      options.include.forEach((relation) => {
        queryBuilder.leftJoinAndSelect(`entity.${relation}`, relation);
      });
    }

    // Apply filters
    if (options.filters?.length) {
      this.applySimpleFilters(queryBuilder, entity, options.filters);
    }

    // Apply search
    if (options.search?.query) {
      this.applySimpleSearch(queryBuilder, entity, options.search);
    }

    // Apply sorting
    if (options.sort?.length) {
      this.applySimpleSorting(queryBuilder, entity, options.sort);
    }

    return queryBuilder;
  }

  /**
   * Execute dynamic query with pagination
   */
  async executeDynamicQuery<T extends ObjectLiteral>(
    repository: Repository<T>,
    entity: new () => T,
    options: DynamicQueryOptions,
  ): Promise<PaginatedResult<T>> {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100); // Max 100 items
    const offset = (page - 1) * limit;

    // Build query
    const queryBuilder = await this.buildDynamicQuery(
      repository,
      entity,
      options,
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
   * Execute dynamic query without pagination
   */
  async executeDynamicQueryAll<T extends ObjectLiteral>(
    repository: Repository<T>,
    entity: new () => T,
    options: DynamicQueryOptions,
  ): Promise<QueryResult<T>> {
    const queryBuilder = await this.buildDynamicQuery(
      repository,
      entity,
      options,
    );
    const data = await queryBuilder.getMany();

    return { data };
  }

  /**
   * Apply simple filters
   */
  private applySimpleFilters<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    entity: new () => T,
    filters: SimpleFilter[],
  ): void {
    filters.forEach((filter, index) => {
      const { field, value, operator = 'eq' } = filter;
      const paramName = `filter_${index}`;

      // Validate field
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
        case 'like':
          queryBuilder.andWhere(`entity.${field} ILIKE :${paramName}`, {
            [paramName]: `%${value}%`,
          });
          break;
        case 'in':
          if (Array.isArray(value)) {
            queryBuilder.andWhere(`entity.${field} IN (:...${paramName})`, {
              [paramName]: value,
            });
          }
          break;
        case 'between':
          if (Array.isArray(value) && value.length === 2) {
            queryBuilder.andWhere(
              `entity.${field} BETWEEN :${paramName}_start AND :${paramName}_end`,
              {
                [`${paramName}_start`]: value[0],
                [`${paramName}_end`]: value[1],
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
        default:
          this.logger.warn(`Unsupported filter operator: ${operator}`);
      }
    });
  }

  /**
   * Apply simple search
   */
  private applySimpleSearch<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    entity: new () => T,
    search: SimpleSearch,
  ): void {
    const { query, fields = [] } = search;

    if (!query || !fields.length) return;

    const searchConditions = fields
      .filter((field) =>
        this.reflectionService.validateField(entity, field, 'search'),
      )
      .map((field) => `entity.${field} ILIKE :searchQuery`);

    if (searchConditions.length > 0) {
      queryBuilder.andWhere(`(${searchConditions.join(' OR ')})`, {
        searchQuery: `%${query}%`,
      });
    }
  }

  /**
   * Apply simple sorting
   */
  private applySimpleSorting<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    entity: new () => T,
    sort: SimpleSort[],
  ): void {
    sort.forEach(({ field, direction = 'ASC' }) => {
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
   * Get available fields for an entity
   */
  getAvailableFields<T extends ObjectLiteral>(
    entity: new () => T,
  ): {
    searchable: string[];
    filterable: string[];
    sortable: string[];
    relations: string[];
  } {
    // Create a mock repository for getting config
    const mockRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
    } as any;

    const config = this.reflectionService.getQueryConfig(entity, mockRepo);
    return {
      searchable: config.searchable || [],
      filterable: config.filterable || [],
      sortable: config.sortable || [],
      relations: config.relations || [],
    };
  }

  /**
   * Validate query options
   */
  validateQueryOptions<T extends ObjectLiteral>(
    entity: new () => T,
    options: DynamicQueryOptions,
  ): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const availableFields = this.getAvailableFields(entity);

    // Validate filters
    if (options.filters) {
      options.filters.forEach((filter, index) => {
        if (!availableFields.filterable.includes(filter.field)) {
          errors.push(
            `Filter ${index}: Field '${filter.field}' is not filterable`,
          );
        }
      });
    }

    // Validate search fields
    if (options.search?.fields) {
      options.search.fields.forEach((field) => {
        if (!availableFields.searchable.includes(field)) {
          errors.push(`Search field '${field}' is not searchable`);
        }
      });
    }

    // Validate sort fields
    if (options.sort) {
      options.sort.forEach((sort, index) => {
        if (!availableFields.sortable.includes(sort.field)) {
          errors.push(`Sort ${index}: Field '${sort.field}' is not sortable`);
        }
      });
    }

    // Validate relations
    if (options.include) {
      options.include.forEach((relation) => {
        if (!availableFields.relations.includes(relation)) {
          errors.push(`Relation '${relation}' does not exist`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
