import 'reflect-metadata';

/**
 * Optimized query configuration interface
 */
export interface QueryConfig {
  searchable?: string[];
  filterable?: string[];
  sortable?: string[];
  relations?: string[];
  defaultSort?: { field: string; direction: 'ASC' | 'DESC' };
  defaultLimit?: number;
  maxLimit?: number;
  // New: Field type mapping for better performance
  fieldTypes?: Record<string, string>;
  // New: Indexed fields for faster queries
  indexedFields?: string[];
}

/**
 * Optimized field validation utilities with caching
 */
export class FieldValidator {
  private static cache = new Map<string, any>();

  /**
   * Check if a field is searchable (optimized with caching)
   */
  static isSearchableField(entity: any, field: string): boolean {
    const cacheKey = `${entity.constructor.name}_${field}_searchable`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const property = this.getEntityProperty(entity, field);
    const isSearchable = property && this.isTextType(property.type);

    this.cache.set(cacheKey, isSearchable);
    return isSearchable;
  }

  /**
   * Check if a field is filterable (optimized)
   */
  static isFilterableField(entity: any, field: string): boolean {
    const cacheKey = `${entity.constructor.name}_${field}_filterable`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const property = this.getEntityProperty(entity, field);
    const isFilterable = !!property;

    this.cache.set(cacheKey, isFilterable);
    return isFilterable;
  }

  /**
   * Check if a field is sortable (optimized)
   */
  static isSortableField(entity: any, field: string): boolean {
    const cacheKey = `${entity.constructor.name}_${field}_sortable`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const property = this.getEntityProperty(entity, field);
    const isSortable = property && this.isComparableType(property.type);

    this.cache.set(cacheKey, isSortable);
    return isSortable;
  }

  /**
   * Get entity property metadata (optimized)
   */
  private static getEntityProperty(entity: any, field: string): any {
    // Try TypeORM metadata first
    if (entity.constructor && entity.constructor.__metadata) {
      return entity.constructor.__metadata.columnsMap?.[field];
    }

    // Try Reflect.getMetadata
    const metadata = Reflect.getMetadata('design:type', entity, field);
    if (metadata) {
      return { type: this.mapTypeToDatabaseType(metadata.name) };
    }

    // Fallback: check if property exists
    if (field in entity) {
      return { type: typeof entity[field] };
    }

    return null;
  }

  /**
   * Get all available fields (optimized with caching)
   */
  static getAvailableFields(entity: any): string[] {
    const cacheKey = `${entity.constructor.name}_available_fields`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    let fields: string[] = [];

    // Try TypeORM metadata first
    if (entity.constructor && entity.constructor.__metadata) {
      fields = Object.keys(entity.constructor.__metadata.columnsMap || {});
    } else {
      // Fallback: get all properties
      fields = Object.getOwnPropertyNames(entity).filter(
        (prop) => prop !== 'constructor' && typeof entity[prop] !== 'function',
      );
    }

    this.cache.set(cacheKey, fields);
    return fields;
  }

  /**
   * Check if type is text-based
   */
  private static isTextType(type: string): boolean {
    const textTypes = ['string', 'text', 'varchar', 'char'];
    return textTypes.some((t) => type.toLowerCase().includes(t));
  }

  /**
   * Check if type is comparable (for sorting)
   */
  private static isComparableType(type: string): boolean {
    const comparableTypes = [
      'string',
      'varchar',
      'text',
      'char',
      'number',
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
    return comparableTypes.some((t) => type.toLowerCase().includes(t));
  }

  /**
   * Map TypeScript types to database types
   */
  private static mapTypeToDatabaseType(tsType: string): string {
    const typeMap: Record<string, string> = {
      String: 'string',
      Number: 'number',
      Boolean: 'boolean',
      Date: 'date',
      Object: 'json',
      Array: 'array',
    };
    return typeMap[tsType] || 'string';
  }

  /**
   * Clear cache (useful for testing)
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}
