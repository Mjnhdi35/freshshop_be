import 'reflect-metadata';
import { Injectable, Logger } from '@nestjs/common';
import { Repository, ObjectLiteral } from 'typeorm';
import { Type } from '@nestjs/common';

/**
 * SOLID Principles Implementation:
 * S - Single Responsibility: Only handles metadata reflection
 * O - Open/Closed: Extensible through interfaces
 * L - Liskov Substitution: All implementations are substitutable
 * I - Interface Segregation: Focused interfaces
 * D - Dependency Inversion: Depends on abstractions
 */

// Interfaces following Interface Segregation Principle
export interface IEntityMetadata {
  name: string;
  tableName: string;
  columns: IColumnMetadata[];
  relations: IRelationMetadata[];
  indices: IIndexMetadata[];
}

export interface IColumnMetadata {
  name: string;
  type: string;
  isNullable: boolean;
  isPrimary: boolean;
  isUnique: boolean;
  dbName?: string;
  defaultValue?: any;
  length?: number;
  precision?: number;
  scale?: number;
  comment?: string;
}

export interface IRelationMetadata {
  name: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  target: string;
  inverseSide?: string;
  joinColumn?: string;
  joinTable?: string;
}

export interface IIndexMetadata {
  name: string;
  columns: string[];
  unique: boolean;
  sparse?: boolean;
}

export interface IQueryCapabilities {
  searchable: string[];
  filterable: string[];
  sortable: string[];
  relations: string[];
  defaultSort?: { field: string; direction: 'ASC' | 'DESC' };
  defaultLimit?: number;
  maxLimit?: number;
}

export interface IRuntimeValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Abstract base class following Dependency Inversion Principle
export abstract class BaseMetadataService {
  protected readonly logger = new Logger(this.constructor.name);

  abstract getEntityMetadata<T>(entity: Type<T>): IEntityMetadata;
  abstract getQueryCapabilities<T>(entity: Type<T>): IQueryCapabilities;
  abstract validateFieldAccess<T>(
    entity: Type<T>,
    field: string,
    operation: string,
  ): IRuntimeValidation;
}

@Injectable()
export class AdvancedMetadataService extends BaseMetadataService {
  private readonly metadataCache = new Map<string, IEntityMetadata>();
  private readonly capabilitiesCache = new Map<string, IQueryCapabilities>();

  constructor() {
    super();
    this.logger.log('🚀 AdvancedMetadataService initialized');
  }

  /**
   * Get comprehensive entity metadata using TypeORM reflection
   */
  getEntityMetadata<T>(entity: Type<T>): IEntityMetadata {
    const entityName = entity.name;

    // Check cache first
    if (this.metadataCache.has(entityName)) {
      return this.metadataCache.get(entityName)!;
    }

    try {
      const metadata = this.extractEntityMetadata(entity);
      this.metadataCache.set(entityName, metadata);

      this.logger.debug(`📊 Extracted metadata for ${entityName}:`, {
        columns: metadata.columns.length,
        relations: metadata.relations.length,
        indices: metadata.indices.length,
      });

      return metadata;
    } catch (error) {
      this.logger.error(
        `❌ Failed to extract metadata for ${entityName}:`,
        error,
      );
      throw new Error(
        `Metadata extraction failed for ${entityName}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Get query capabilities based on entity metadata
   */
  getQueryCapabilities<T>(entity: Type<T>): IQueryCapabilities {
    const entityName = entity.name;

    if (this.capabilitiesCache.has(entityName)) {
      return this.capabilitiesCache.get(entityName)!;
    }

    const metadata = this.getEntityMetadata(entity);
    const capabilities = this.buildQueryCapabilities(metadata);

    this.capabilitiesCache.set(entityName, capabilities);
    return capabilities;
  }

  /**
   * Mapping field (property) -> column DB name và kiểu chuẩn hóa
   */
  getFieldColumnMap<T>(
    entity: Type<T>,
  ): Record<string, { dbName: string; type: string }> {
    const meta = this.getEntityMetadata(entity);
    const map: Record<string, { dbName: string; type: string }> = {};
    meta.columns.forEach((c) => {
      map[c.name] = {
        dbName: c.dbName || this.toSnakeCase(c.name),
        type: this.normalizeType(c.type),
      };
    });
    return map;
  }

  /**
   * Danh sách trường có index/unique index
   */
  getIndexedFields<T>(entity: Type<T>): {
    indexed: string[];
    unique: string[];
  } {
    const meta = this.getEntityMetadata(entity);
    const indexed = new Set<string>();
    const unique = new Set<string>();
    meta.indices.forEach((idx) => {
      idx.columns.forEach((col) => indexed.add(col));
      if (idx.unique) {
        idx.columns.forEach((col) => unique.add(col));
      }
    });
    return { indexed: Array.from(indexed), unique: Array.from(unique) };
  }

  /**
   * Bản đồ quan hệ: relation name -> info
   */
  getRelationsMap<T>(entity: Type<T>): Record<string, IRelationMetadata> {
    const meta = this.getEntityMetadata(entity);
    return meta.relations.reduce(
      (acc, r) => {
        acc[r.name] = r;
        return acc;
      },
      {} as Record<string, IRelationMetadata>,
    );
  }

  /**
   * Kiểm tra đường dẫn lồng nhau: "profile.address.city"
   * Trả về chain quan hệ và trường cuối (nếu có)
   */
  resolvePath<T>(
    entity: Type<T>,
    path: string,
  ): {
    valid: boolean;
    relationChain: string[];
    finalField?: string;
    errors?: string[];
  } {
    const parts = path.split('.').filter(Boolean);
    const errors: string[] = [];
    let current: Type<any> = entity;
    const chain: string[] = [];

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const relMap = this.getRelationsMap(current);
      const rel = relMap[part];
      if (rel) {
        chain.push(part);
        // best-effort: we only keep target name
        // In runtime, upper layer có thể map sang class thực tế.
        // Ở đây, chỉ xác nhận tồn tại quan hệ.
        continue;
      }

      // Không phải quan hệ: coi như field cuối
      const fieldMap = this.getFieldColumnMap(current);
      if (fieldMap[part]) {
        const isLast = i === parts.length - 1;
        if (!isLast) {
          errors.push(
            `Field '${part}' không phải quan hệ nên không thể đi sâu tiếp`,
          );
          return {
            valid: false,
            relationChain: chain,
            finalField: part,
            errors,
          };
        }
        return {
          valid: errors.length === 0,
          relationChain: chain,
          finalField: part,
          errors: errors.length ? errors : undefined,
        };
      }

      errors.push(
        `Không tìm thấy quan hệ/field '${part}' trên ${current.name}`,
      );
      return { valid: false, relationChain: chain, errors };
    }

    return {
      valid: errors.length === 0,
      relationChain: chain,
      errors: errors.length ? errors : undefined,
    };
  }

  /** Kiểu dữ liệu chuẩn hóa */
  normalizeType(type: string): string {
    const t = type.toLowerCase();
    if (t.includes('character varying')) return 'varchar';
    if (t.includes('timestamp')) return 'timestamp';
    if (t.includes('datetime')) return 'datetime';
    if (t.includes('decimal') || t.includes('numeric')) return 'decimal';
    if (t.includes('int')) return 'int';
    if (t === 'bool') return 'boolean';
    return t;
  }

  /** snake_case từ camelCase */
  private toSnakeCase(name: string): string {
    return name
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/\s+/g, '_')
      .toLowerCase();
  }

  /**
   * Runtime validation of field access
   */
  validateFieldAccess<T>(
    entity: Type<T>,
    field: string,
    operation: string,
  ): IRuntimeValidation {
    const validation: IRuntimeValidation = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    try {
      const capabilities = this.getQueryCapabilities(entity);
      const metadata = this.getEntityMetadata(entity);

      // Check if field exists
      const column = metadata.columns.find((col) => col.name === field);
      if (!column) {
        validation.isValid = false;
        validation.errors.push(
          `Field '${field}' does not exist in ${entity.name}`,
        );
        return validation;
      }

      // Validate operation-specific access
      switch (operation) {
        case 'search':
          if (!capabilities.searchable.includes(field)) {
            validation.isValid = false;
            validation.errors.push(`Field '${field}' is not searchable`);
          }
          break;

        case 'filter':
          if (!capabilities.filterable.includes(field)) {
            validation.isValid = false;
            validation.errors.push(`Field '${field}' is not filterable`);
          }
          break;

        case 'sort':
          if (!capabilities.sortable.includes(field)) {
            validation.isValid = false;
            validation.errors.push(`Field '${field}' is not sortable`);
          }
          break;

        case 'select':
          // All fields can be selected
          break;

        default:
          validation.warnings.push(`Unknown operation '${operation}'`);
      }

      // Add performance warnings
      if (column.isPrimary) {
        validation.warnings.push(
          `Field '${field}' is primary key - consider using indexed queries`,
        );
      }

      if (!column.isNullable && operation === 'filter') {
        validation.warnings.push(
          `Field '${field}' is not nullable - filter might return no results`,
        );
      }
    } catch (error) {
      validation.isValid = false;
      validation.errors.push(`Validation failed: ${(error as Error).message}`);
    }

    return validation;
  }

  /**
   * Extract metadata from TypeORM entity
   */
  private extractEntityMetadata<T>(entity: Type<T>): IEntityMetadata {
    const metadata = Reflect.getMetadata('design:type', entity.prototype);
    const entityMetadata = Reflect.getMetadata('__entity__', entity);

    if (!entityMetadata) {
      throw new Error(`No TypeORM metadata found for ${entity.name}`);
    }

    const columns: IColumnMetadata[] = [];
    const relations: IRelationMetadata[] = [];
    const indices: IIndexMetadata[] = [];

    // Extract columns
    if (entityMetadata.columns) {
      Object.entries(entityMetadata.columns).forEach(
        ([name, column]: [string, any]) => {
          columns.push({
            name,
            type: column.type || 'unknown',
            isNullable: column.isNullable || false,
            isPrimary: column.isPrimary || false,
            isUnique: column.isUnique || false,
            dbName: column.databaseName || column.propertyName || name,
            defaultValue: column.default,
            length: column.length,
            precision: column.precision,
            scale: column.scale,
            comment: column.comment,
          });
        },
      );
    }

    // Extract relations
    if (entityMetadata.relations) {
      Object.entries(entityMetadata.relations).forEach(
        ([name, relation]: [string, any]) => {
          relations.push({
            name,
            type: relation.relationType,
            target: relation.target?.name || 'unknown',
            inverseSide: relation.inverseSidePropertyName,
            joinColumn: relation.joinColumnName,
            joinTable: relation.joinTableName,
          });
        },
      );
    }

    // Extract indices
    if (entityMetadata.indices) {
      entityMetadata.indices.forEach((index: any) => {
        indices.push({
          name: index.name || 'unnamed',
          columns: index.columns || [],
          unique: index.unique || false,
          sparse: index.sparse,
        });
      });
    }

    return {
      name: entity.name,
      tableName: entityMetadata.tableName || entity.name.toLowerCase(),
      columns,
      relations,
      indices,
    };
  }

  /**
   * Build query capabilities from metadata
   */
  private buildQueryCapabilities(
    metadata: IEntityMetadata,
  ): IQueryCapabilities {
    const searchable: string[] = [];
    const filterable: string[] = [];
    const sortable: string[] = [];
    const relations: string[] = [];

    // Analyze columns for capabilities
    metadata.columns.forEach((column) => {
      filterable.push(column.name);

      // Searchable fields (text types)
      if (this.isSearchableType(column.type)) {
        searchable.push(column.name);
      }

      // Sortable fields (comparable types)
      if (this.isSortableType(column.type)) {
        sortable.push(column.name);
      }
    });

    // Extract relations
    metadata.relations.forEach((relation) => {
      relations.push(relation.name);
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
  }

  /**
   * Check if column type is searchable
   */
  private isSearchableType(type: string): boolean {
    const searchableTypes = [
      'varchar',
      'text',
      'char',
      'string',
      'nvarchar',
      'ntext',
      'character varying',
    ];
    return searchableTypes.some((t) => type.toLowerCase().includes(t));
  }

  /**
   * Check if column type is sortable
   */
  private isSortableType(type: string): boolean {
    const sortableTypes = [
      'varchar',
      'text',
      'char',
      'string',
      'int',
      'integer',
      'bigint',
      'smallint',
      'decimal',
      'numeric',
      'float',
      'double',
      'date',
      'datetime',
      'timestamp',
      'time',
      'boolean',
      'bool',
    ];
    return sortableTypes.some((t) => type.toLowerCase().includes(t));
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.metadataCache.clear();
    this.capabilitiesCache.clear();
    this.logger.log('🧹 Metadata cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { metadata: number; capabilities: number } {
    return {
      metadata: this.metadataCache.size,
      capabilities: this.capabilitiesCache.size,
    };
  }

  /**
   * Validate entity at runtime
   */
  validateEntity<T>(entity: Type<T>): IRuntimeValidation {
    const validation: IRuntimeValidation = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    try {
      const metadata = this.getEntityMetadata(entity);

      // Check for required fields
      const hasPrimaryKey = metadata.columns.some((col) => col.isPrimary);
      if (!hasPrimaryKey) {
        validation.errors.push('Entity must have a primary key');
      }

      // Check for audit fields
      const hasCreatedAt = metadata.columns.some(
        (col) => col.name === 'createdAt',
      );
      const hasUpdatedAt = metadata.columns.some(
        (col) => col.name === 'updatedAt',
      );

      if (!hasCreatedAt) {
        validation.warnings.push(
          'Consider adding createdAt field for audit trail',
        );
      }

      if (!hasUpdatedAt) {
        validation.warnings.push(
          'Consider adding updatedAt field for audit trail',
        );
      }

      // Check for soft delete
      const hasDeletedAt = metadata.columns.some(
        (col) => col.name === 'deletedAt',
      );
      if (!hasDeletedAt) {
        validation.warnings.push(
          'Consider adding deletedAt field for soft delete',
        );
      }
    } catch (error) {
      validation.isValid = false;
      validation.errors.push(
        `Entity validation failed: ${(error as Error).message}`,
      );
    }

    return validation;
  }
}
