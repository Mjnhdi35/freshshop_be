/**
 * Simple query configuration interface
 */
export interface QueryConfig {
  // Fields that can be searched
  searchable?: string[];
  // Fields that can be filtered
  filterable?: string[];
  // Fields that can be sorted
  sortable?: string[];
  // Relations that can be loaded
  relations?: string[];
  // Default sort configuration
  defaultSort?: { field: string; direction: 'ASC' | 'DESC' };
  // Pagination defaults
  defaultLimit?: number;
  maxLimit?: number;
}

/**
 * Runtime field validation utilities
 */
export class FieldValidator {
  /**
   * Check if a field is searchable based on entity properties
   */
  static isSearchableField(entity: any, field: string): boolean {
    // Check if field exists and is a string type
    const property = this.getEntityProperty(entity, field);
    return property && (property.type === 'string' || property.type === 'text');
  }

  /**
   * Check if a field is filterable based on entity properties
   */
  static isFilterableField(entity: any, field: string): boolean {
    const property = this.getEntityProperty(entity, field);
    return !!property; // Any field can be filtered
  }

  /**
   * Check if a field is sortable based on entity properties
   */
  static isSortableField(entity: any, field: string): boolean {
    const property = this.getEntityProperty(entity, field);
    return (
      property &&
      (property.type === 'string' ||
        property.type === 'number' ||
        property.type === 'date' ||
        property.type === 'datetime')
    );
  }

  /**
   * Get entity property metadata using reflection
   */
  private static getEntityProperty(entity: any, field: string): any {
    // Use TypeORM metadata to get column information
    if (entity.constructor && entity.constructor.__metadata) {
      return entity.constructor.__metadata.columnsMap?.[field];
    }

    // Fallback: check if property exists
    if (field in entity) {
      return { type: typeof entity[field] };
    }

    return null;
  }

  /**
   * Get all available fields from entity
   */
  static getAvailableFields(entity: any): string[] {
    if (entity.constructor && entity.constructor.__metadata) {
      return Object.keys(entity.constructor.__metadata.columnsMap || {});
    }

    // Fallback: get all properties
    return Object.getOwnPropertyNames(entity).filter(
      (prop) => prop !== 'constructor' && typeof entity[prop] !== 'function',
    );
  }
}
