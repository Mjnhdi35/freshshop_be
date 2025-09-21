import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  Repository,
  FindManyOptions,
  FindOneOptions,
  DeepPartial,
} from 'typeorm';
import { BaseEntity } from '../entities/base.entity';
import { ReflectionService } from '../reflection/reflection.service';
import { AdvancedQueryBuilderService } from '../query-builder/advanced-query-builder.service';
import {
  QueryBuilderOptions,
  PaginatedResult,
  QueryResult,
  AdvancedQueryOptions,
  QueryContext,
  QueryExecutionOptions,
} from '../interfaces/pagination.interface';

@Injectable()
export abstract class BaseService<T extends BaseEntity> {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly repository: Repository<T>,
    protected readonly reflectionService: ReflectionService,
    protected readonly queryBuilderService: AdvancedQueryBuilderService,
  ) {}

  /**
   * Create a new entity
   */
  async create(createDto: DeepPartial<T>, context?: QueryContext): Promise<T> {
    try {
      const entity = this.repository.create(createDto);

      // Set audit fields
      if (context?.user) {
        entity.createdBy = context.user.id;
        entity.updatedBy = context.user.id;
      }

      const savedEntity = await this.repository.save(entity);
      this.logger.log(`✅ ${this.getEntityName()} created: ${savedEntity.id}`);
      return savedEntity;
    } catch (error) {
      this.logger.error(`❌ Failed to create ${this.getEntityName()}:`, error);
      throw error;
    }
  }

  /**
   * Find all entities with optional query options
   */
  async findAll(
    options?: QueryBuilderOptions,
    executionOptions?: QueryExecutionOptions,
  ): Promise<QueryResult<T>> {
    try {
      if (options) {
        return await this.queryBuilderService.executeQuery(
          this.repository,
          this.getEntityClass(),
          options,
          executionOptions,
        );
      }

      const data = await this.repository.find();
      return { data };
    } catch (error) {
      this.logger.error(
        `❌ Failed to find all ${this.getEntityName()}s:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Find entities with pagination
   */
  async findWithPagination(
    options?: QueryBuilderOptions,
    executionOptions?: QueryExecutionOptions,
  ): Promise<PaginatedResult<T>> {
    try {
      const queryOptions = options || this.getDefaultQueryOptions();
      return await this.queryBuilderService.executePaginatedQuery(
        this.repository,
        this.getEntityClass(),
        queryOptions,
        executionOptions,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to find ${this.getEntityName()}s with pagination:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Find one entity by ID
   */
  async findOne(id: string): Promise<T | null> {
    try {
      const entity = await this.repository.findOne({ where: { id } as any });
      return entity;
    } catch (error) {
      this.logger.error(
        `❌ Failed to find ${this.getEntityName()} ${id}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Find one entity by ID or throw error
   */
  async findOneOrFail(id: string): Promise<T> {
    const entity = await this.findOne(id);
    if (!entity) {
      throw new NotFoundException(
        `${this.getEntityName()} with ID ${id} not found`,
      );
    }
    return entity;
  }

  /**
   * Update an entity
   */
  async update(
    id: string,
    updateDto: DeepPartial<T>,
    context?: QueryContext,
  ): Promise<T> {
    try {
      const entity = await this.findOneOrFail(id);

      // Set audit fields
      if (context?.user) {
        updateDto.updatedBy = context.user.id;
        updateDto.version = (entity.version || 1) + 1;
      }

      Object.assign(entity, updateDto);
      const updatedEntity = await this.repository.save(entity);

      this.logger.log(
        `✅ ${this.getEntityName()} updated: ${updatedEntity.id}`,
      );
      return updatedEntity;
    } catch (error) {
      this.logger.error(
        `❌ Failed to update ${this.getEntityName()} ${id}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Remove an entity (soft delete)
   */
  async remove(id: string, context?: QueryContext): Promise<void> {
    try {
      const entity = await this.findOneOrFail(id);

      // Set audit fields for soft delete
      if (context?.user) {
        entity.updatedBy = context.user.id;
        entity.deletedAt = new Date();
        entity.version = (entity.version || 1) + 1;
        await this.repository.save(entity);
      } else {
        await this.repository.softDelete(id);
      }

      this.logger.log(`✅ ${this.getEntityName()} removed: ${id}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to remove ${this.getEntityName()} ${id}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Count entities
   */
  async count(options?: QueryBuilderOptions): Promise<number> {
    try {
      if (options) {
        const result = await this.queryBuilderService.executeQuery(
          this.repository,
          this.getEntityClass(),
          options,
        );
        return result.total || 0;
      }

      return await this.repository.count();
    } catch (error) {
      this.logger.error(`❌ Failed to count ${this.getEntityName()}s:`, error);
      throw error;
    }
  }

  /**
   * Check if entity exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const count = await this.repository.count({ where: { id } as any });
      return count > 0;
    } catch (error) {
      this.logger.error(
        `❌ Failed to check if ${this.getEntityName()} ${id} exists:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Activate an entity
   */
  async activate(id: string, context?: QueryContext): Promise<T> {
    try {
      return await this.update(
        id,
        { isActive: true } as DeepPartial<T>,
        context,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to activate ${this.getEntityName()} ${id}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Deactivate an entity
   */
  async deactivate(id: string, context?: QueryContext): Promise<T> {
    try {
      return await this.update(
        id,
        { isActive: false } as DeepPartial<T>,
        context,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to deactivate ${this.getEntityName()} ${id}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Bulk create entities
   */
  async bulkCreate(
    createDtos: DeepPartial<T>[],
    context?: QueryContext,
  ): Promise<T[]> {
    try {
      const entities = createDtos.map((dto) => {
        const entity = this.repository.create(dto);
        if (context?.user) {
          entity.createdBy = context.user.id;
          entity.updatedBy = context.user.id;
        }
        return entity;
      });

      const savedEntities = await this.repository.save(entities);
      this.logger.log(
        `✅ ${savedEntities.length} ${this.getEntityName()}s created`,
      );
      return savedEntities;
    } catch (error) {
      this.logger.error(
        `❌ Failed to bulk create ${this.getEntityName()}s:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Bulk update entities
   */
  async bulkUpdate(
    updates: Array<{ id: string; data: DeepPartial<T> }>,
    context?: QueryContext,
  ): Promise<T[]> {
    try {
      const results: T[] = [];
      for (const update of updates) {
        const result = await this.update(update.id, update.data, context);
        results.push(result);
      }

      this.logger.log(`✅ ${results.length} ${this.getEntityName()}s updated`);
      return results;
    } catch (error) {
      this.logger.error(
        `❌ Failed to bulk update ${this.getEntityName()}s:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get default query options using runtime reflection
   */
  protected getDefaultQueryOptions(): QueryBuilderOptions {
    const entityClass = this.getEntityClass();
    const config = this.reflectionService.getQueryConfig(
      entityClass,
      this.repository,
    );

    return {
      pagination: {
        page: 1,
        limit: config.defaultLimit || 20,
      },
      sort: config.defaultSort ? [config.defaultSort] : [],
      filters: [],
      search: {
        query: '',
        fields: config.searchable || [],
        mode: 'partial',
        caseSensitive: false,
      },
      relations: {
        relations: config.relations || [],
        maxDepth: 1,
        eager: false,
      },
      select: {
        fields: config.filterable || [],
        exclude: [],
      },
    };
  }

  /**
   * Get entity class (to be implemented by subclasses)
   */
  protected abstract getEntityClass(): new () => T;

  /**
   * Get entity name (to be implemented by subclasses)
   */
  protected abstract getEntityName(): string;
}
