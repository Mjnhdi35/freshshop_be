import { Injectable, Logger } from '@nestjs/common';
import { Repository, ObjectLiteral } from 'typeorm';
import { FieldValidator, QueryConfig } from '../decorators/metadata.decorators';

@Injectable()
export class ReflectionService {
  private readonly logger = new Logger(ReflectionService.name);

  /**
   * Get query configuration for an entity using runtime reflection
   */
  getQueryConfig<T extends ObjectLiteral>(
    entity: new () => T,
    repository: Repository<T>,
  ): QueryConfig {
    try {
      // Get entity metadata from TypeORM
      const metadata = repository.metadata;
      const columns = metadata.columns;

      // Auto-detect field capabilities
      const searchable: string[] = [];
      const filterable: string[] = [];
      const sortable: string[] = [];
      const relations: string[] = [];

      // Analyze columns
      columns.forEach((column) => {
        const fieldName = column.propertyName;

        // Add to filterable (all fields can be filtered)
        filterable.push(fieldName);

        // Add to sortable if it's a comparable type
        if (this.isSortableType(column.type)) {
          sortable.push(fieldName);
        }

        // Add to searchable if it's a string type
        if (this.isSearchableType(column.type)) {
          searchable.push(fieldName);
        }
      });

      // Analyze relations
      metadata.relations.forEach((relation) => {
        relations.push(relation.propertyName);
      });

      return {
        searchable,
        filterable,
        sortable,
        relations,
        defaultSort: { field: 'createdAt', direction: 'DESC' },
        defaultLimit: 20,
        maxLimit: 100,
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
      switch (operation) {
        case 'search':
          return FieldValidator.isSearchableField(entity, field);
        case 'filter':
          return FieldValidator.isFilterableField(entity, field);
        case 'sort':
          return FieldValidator.isSortableField(entity, field);
        default:
          return false;
      }
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
      return FieldValidator.getAvailableFields(entity);
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
   * Check if column type is sortable
   */
  private isSortableType(type: any): boolean {
    const sortableTypes = [
      'string',
      'varchar',
      'text',
      'int',
      'integer',
      'bigint',
      'float',
      'double',
      'decimal',
      'date',
      'datetime',
      'timestamp',
      'boolean',
      'bool',
    ];

    const typeString = type.toString().toLowerCase();
    return sortableTypes.some((sortableType) =>
      typeString.includes(sortableType),
    );
  }

  /**
   * Check if column type is searchable
   */
  private isSearchableType(type: any): boolean {
    const searchableTypes = ['string', 'varchar', 'text'];
    const typeString = type.toString().toLowerCase();
    return searchableTypes.some((searchableType) =>
      typeString.includes(searchableType),
    );
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
