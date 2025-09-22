import { Injectable, Logger } from '@nestjs/common';
import { Repository, ObjectLiteral } from 'typeorm';
import { QueryConfig } from '../decorators/metadata.decorators';
import { AdvancedMetadataService } from '../metadata/advanced-metadata.service';

@Injectable()
export class ReflectionService {
  private readonly logger = new Logger(ReflectionService.name);

  constructor(private readonly metadataService: AdvancedMetadataService) {}

  /**
   * Get query configuration for an entity using runtime reflection
   */
  getQueryConfig<T extends ObjectLiteral>(
    entity: new () => T,
    repository: Repository<T>,
  ): QueryConfig {
    try {
      const capabilities = this.metadataService.getQueryCapabilities(entity);
      return {
        searchable: capabilities.searchable,
        filterable: capabilities.filterable,
        sortable: capabilities.sortable,
        relations: capabilities.relations,
        defaultSort: capabilities.defaultSort,
        defaultLimit: capabilities.defaultLimit,
        maxLimit: capabilities.maxLimit,
      };
    } catch (error) {
      this.logger.error('Failed to get query config:', error);
      return this.getDefaultConfig();
    }
  }

  /**
   * Validate if a field can be used for a specific operation
   */
  validateField<T>(
    entity: new () => T,
    field: string,
    operation: 'search' | 'filter' | 'sort',
  ): boolean {
    try {
      const capabilities = this.metadataService.getQueryCapabilities(entity);
      if (operation === 'search')
        return capabilities.searchable.includes(field);
      if (operation === 'filter')
        return capabilities.filterable.includes(field);
      if (operation === 'sort') return capabilities.sortable.includes(field);
      return false;
    } catch (error) {
      this.logger.warn(`Field validation failed for ${field}:`, error);
      return false;
    }
  }

  /**
   * Get all available fields for an entity
   */
  getAvailableFields<T>(entity: new () => T): string[] {
    try {
      const metadata = this.metadataService.getEntityMetadata(entity);
      return metadata.columns.map((c) => c.name);
    } catch (error) {
      this.logger.error('Failed to get available fields:', error);
      return [];
    }
  }

  /**
   * Check if a relation exists
   */
  validateRelation<T extends ObjectLiteral>(
    entity: new () => T,
    repository: Repository<T>,
    relation: string,
  ): boolean {
    try {
      const metadata = repository.metadata;
      return metadata.relations.some((rel) => rel.propertyName === relation);
    } catch (error) {
      this.logger.warn(`Relation validation failed for ${relation}:`, error);
      return false;
    }
  }

  /**
   * Get entity information for debugging
   */
  getEntityInfo<T extends ObjectLiteral>(
    entity: new () => T,
    repository: Repository<T>,
  ): any {
    try {
      const metadata = repository.metadata;
      return {
        tableName: metadata.tableName,
        columns: metadata.columns.map((col) => ({
          name: col.propertyName,
          type: col.type,
          nullable: col.isNullable,
          unique: (col as any).isUnique || false,
        })),
        relations: metadata.relations.map((rel) => ({
          name: rel.propertyName,
          type: rel.type,
          target: rel.target,
        })),
      };
    } catch (error) {
      this.logger.error('Failed to get entity info:', error);
      return null;
    }
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): QueryConfig {
    return {
      searchable: [],
      filterable: [],
      sortable: [],
      relations: [],
      defaultSort: { field: 'createdAt', direction: 'DESC' },
      defaultLimit: 20,
      maxLimit: 100,
    };
  }
}
