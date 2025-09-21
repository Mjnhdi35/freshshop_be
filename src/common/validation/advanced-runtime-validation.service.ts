import 'reflect-metadata';
import { Injectable, Logger, Type } from '@nestjs/common';
import {
  AdvancedMetadataService,
  IRuntimeValidation,
} from '../metadata/advanced-metadata.service';

/**
 * SOLID Principles Implementation:
 * S - Single Responsibility: Only handles runtime validation
 * O - Open/Closed: Extensible through validation rules
 * L - Liskov Substitution: All validators are substitutable
 * I - Interface Segregation: Focused validation interfaces
 * D - Dependency Inversion: Depends on abstractions
 */

// Interfaces following Interface Segregation Principle
export interface IValidationRule<T = any> {
  name: string;
  validate(value: T, context?: any): IRuntimeValidation;
}

export interface IEntityValidator<T = any> {
  validateEntity(entity: T): IRuntimeValidation;
  validateField(entity: T, field: string, value: any): IRuntimeValidation;
  validateOperation(
    entity: T,
    operation: string,
    data: any,
  ): IRuntimeValidation;
}

export interface IQueryValidator {
  validateQuery(query: any): IRuntimeValidation;
  validateFilters(filters: any[]): IRuntimeValidation;
  validatePagination(pagination: any): IRuntimeValidation;
  validateSorting(sorting: any[]): IRuntimeValidation;
}

export interface IRequestValidator {
  validateRequest(request: any): IRuntimeValidation;
  validateHeaders(headers: any): IRuntimeValidation;
  validateBody(body: any): IRuntimeValidation;
  validateParams(params: any): IRuntimeValidation;
}

// Validation rule implementations
export class RequiredFieldRule implements IValidationRule {
  name = 'required';

  validate(value: any): IRuntimeValidation {
    const isValid = value !== null && value !== undefined && value !== '';

    return {
      isValid,
      errors: isValid ? [] : ['Field is required'],
      warnings: [],
    };
  }
}

export class TypeValidationRule implements IValidationRule {
  name = 'type';

  constructor(private expectedType: string) {}

  validate(value: any): IRuntimeValidation {
    const actualType = typeof value;
    const isValid = actualType === this.expectedType;

    return {
      isValid,
      errors: isValid
        ? []
        : [`Expected ${this.expectedType}, got ${actualType}`],
      warnings: [],
    };
  }
}

export class LengthValidationRule implements IValidationRule {
  name = 'length';

  constructor(
    private minLength: number,
    private maxLength: number,
  ) {}

  validate(value: any): IRuntimeValidation {
    if (typeof value !== 'string') {
      return {
        isValid: false,
        errors: ['Value must be a string for length validation'],
        warnings: [],
      };
    }

    const length = value.length;
    const isValid = length >= this.minLength && length <= this.maxLength;

    return {
      isValid,
      errors: isValid
        ? []
        : [`Length must be between ${this.minLength} and ${this.maxLength}`],
      warnings: [],
    };
  }
}

export class RangeValidationRule implements IValidationRule {
  name = 'range';

  constructor(
    private min: number,
    private max: number,
  ) {}

  validate(value: any): IRuntimeValidation {
    if (typeof value !== 'number') {
      return {
        isValid: false,
        errors: ['Value must be a number for range validation'],
        warnings: [],
      };
    }

    const isValid = value >= this.min && value <= this.max;

    return {
      isValid,
      errors: isValid
        ? []
        : [`Value must be between ${this.min} and ${this.max}`],
      warnings: [],
    };
  }
}

export class EmailValidationRule implements IValidationRule {
  name = 'email';

  validate(value: any): IRuntimeValidation {
    if (typeof value !== 'string') {
      return {
        isValid: false,
        errors: ['Email must be a string'],
        warnings: [],
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(value);

    return {
      isValid,
      errors: isValid ? [] : ['Invalid email format'],
      warnings: [],
    };
  }
}

export class UUIDValidationRule implements IValidationRule {
  name = 'uuid';

  validate(value: any): IRuntimeValidation {
    if (typeof value !== 'string') {
      return {
        isValid: false,
        errors: ['UUID must be a string'],
        warnings: [],
      };
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isValid = uuidRegex.test(value);

    return {
      isValid,
      errors: isValid ? [] : ['Invalid UUID format'],
      warnings: [],
    };
  }
}

/**
 * Advanced Runtime Validation Service
 * Following SOLID principles and runtime reflection
 */
@Injectable()
export class AdvancedRuntimeValidationService
  implements IEntityValidator, IQueryValidator, IRequestValidator
{
  private readonly logger = new Logger(AdvancedRuntimeValidationService.name);
  private readonly validationRules = new Map<string, IValidationRule>();
  private readonly entityValidators = new Map<string, IEntityValidator>();

  constructor(private readonly metadataService: AdvancedMetadataService) {
    this.initializeDefaultRules();
    this.logger.log('🚀 AdvancedRuntimeValidationService initialized');
  }

  /**
   * Register a custom validation rule
   */
  registerRule(rule: IValidationRule): void {
    this.validationRules.set(rule.name, rule);
    this.logger.debug(`📝 Registered validation rule: ${rule.name}`);
  }

  /**
   * Register a custom entity validator
   */
  registerEntityValidator(
    entityName: string,
    validator: IEntityValidator,
  ): void {
    this.entityValidators.set(entityName, validator);
    this.logger.debug(`📝 Registered entity validator: ${entityName}`);
  }

  /**
   * Validate entity using metadata reflection
   */
  validateEntity<T>(entity: T): IRuntimeValidation {
    const validation: IRuntimeValidation = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    try {
      const entityType = (entity as any).constructor as Type<T>;
      const metadata = this.metadataService.getEntityMetadata(entityType);

      // Validate each field
      metadata.columns.forEach((column) => {
        const value = (entity as any)[column.name];
        const fieldValidation = this.validateField(entity, column.name, value);

        if (!fieldValidation.isValid) {
          validation.isValid = false;
          validation.errors.push(
            ...fieldValidation.errors.map((err) => `${column.name}: ${err}`),
          );
        }

        validation.warnings.push(
          ...fieldValidation.warnings.map((warn) => `${column.name}: ${warn}`),
        );
      });

      // Check for custom entity validator
      const customValidator = this.entityValidators.get(entityType.name);
      if (customValidator) {
        const customValidation = customValidator.validateEntity(entity);

        if (!customValidation.isValid) {
          validation.isValid = false;
          validation.errors.push(...customValidation.errors);
        }

        validation.warnings.push(...customValidation.warnings);
      }
    } catch (error) {
      validation.isValid = false;
      validation.errors.push(
        `Entity validation failed: ${(error as Error).message}`,
      );
    }

    return validation;
  }

  /**
   * Validate field using metadata and rules
   */
  validateField<T>(entity: T, field: string, value: any): IRuntimeValidation {
    const validation: IRuntimeValidation = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    try {
      const entityType = (entity as any).constructor as Type<T>;
      const metadata = this.metadataService.getEntityMetadata(entityType);
      const column = metadata.columns.find((col) => col.name === field);

      if (!column) {
        validation.isValid = false;
        validation.errors.push(`Field '${field}' not found in entity`);
        return validation;
      }

      // Apply validation rules based on column metadata
      const rules = this.getValidationRulesForColumn(column);

      rules.forEach((rule) => {
        const ruleValidation = rule.validate(value);

        if (!ruleValidation.isValid) {
          validation.isValid = false;
          validation.errors.push(...ruleValidation.errors);
        }

        validation.warnings.push(...ruleValidation.warnings);
      });

      // Check for custom field validator
      const customValidator = this.entityValidators.get(entityType.name);
      if (customValidator) {
        const customValidation = customValidator.validateField(
          entity,
          field,
          value,
        );

        if (!customValidation.isValid) {
          validation.isValid = false;
          validation.errors.push(...customValidation.errors);
        }

        validation.warnings.push(...customValidation.warnings);
      }
    } catch (error) {
      validation.isValid = false;
      validation.errors.push(
        `Field validation failed: ${(error as Error).message}`,
      );
    }

    return validation;
  }

  /**
   * Validate operation on entity
   */
  validateOperation<T>(
    entity: T,
    operation: string,
    data: any,
  ): IRuntimeValidation {
    const validation: IRuntimeValidation = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    try {
      const entityType = (entity as any).constructor as Type<T>;
      const capabilities =
        this.metadataService.getQueryCapabilities(entityType);

      // Validate operation-specific rules
      switch (operation) {
        case 'create':
          validation.errors.push(...this.validateCreateOperation(entity, data));
          break;

        case 'update':
          validation.errors.push(...this.validateUpdateOperation(entity, data));
          break;

        case 'delete':
          validation.errors.push(...this.validateDeleteOperation(entity));
          break;

        case 'search':
          validation.errors.push(
            ...this.validateSearchOperation(capabilities, data),
          );
          break;

        case 'filter':
          validation.errors.push(
            ...this.validateFilterOperation(capabilities, data),
          );
          break;

        case 'sort':
          validation.errors.push(
            ...this.validateSortOperation(capabilities, data),
          );
          break;

        default:
          validation.warnings.push(`Unknown operation: ${operation}`);
      }

      validation.isValid = validation.errors.length === 0;
    } catch (error) {
      validation.isValid = false;
      validation.errors.push(
        `Operation validation failed: ${(error as Error).message}`,
      );
    }

    return validation;
  }

  /**
   * Validate query parameters
   */
  validateQuery(query: any): IRuntimeValidation {
    const validation: IRuntimeValidation = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    try {
      // Validate pagination
      if (query.page !== undefined) {
        const pageValidation = this.validatePagination({
          page: query.page,
          limit: query.limit,
        });
        if (!pageValidation.isValid) {
          validation.errors.push(...pageValidation.errors);
        }
      }

      // Validate filters
      if (query.filters) {
        const filterValidation = this.validateFilters(query.filters);
        if (!filterValidation.isValid) {
          validation.errors.push(...filterValidation.errors);
        }
      }

      // Validate sorting
      if (query.sort) {
        const sortValidation = this.validateSorting(query.sort);
        if (!sortValidation.isValid) {
          validation.errors.push(...sortValidation.errors);
        }
      }

      validation.isValid = validation.errors.length === 0;
    } catch (error) {
      validation.isValid = false;
      validation.errors.push(
        `Query validation failed: ${(error as Error).message}`,
      );
    }

    return validation;
  }

  /**
   * Validate filters
   */
  validateFilters(filters: any[]): IRuntimeValidation {
    const validation: IRuntimeValidation = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    try {
      filters.forEach((filter, index) => {
        if (!filter.field) {
          validation.errors.push(`Filter ${index}: field is required`);
        }

        if (!filter.operator) {
          validation.errors.push(`Filter ${index}: operator is required`);
        }

        if (filter.value === undefined) {
          validation.errors.push(`Filter ${index}: value is required`);
        }
      });

      validation.isValid = validation.errors.length === 0;
    } catch (error) {
      validation.isValid = false;
      validation.errors.push(
        `Filter validation failed: ${(error as Error).message}`,
      );
    }

    return validation;
  }

  /**
   * Validate pagination
   */
  validatePagination(pagination: any): IRuntimeValidation {
    const validation: IRuntimeValidation = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    try {
      if (pagination.page !== undefined) {
        const pageRule = new RangeValidationRule(1, Number.MAX_SAFE_INTEGER);
        const pageValidation = pageRule.validate(pagination.page);

        if (!pageValidation.isValid) {
          validation.errors.push(
            ...pageValidation.errors.map((err) => `Page: ${err}`),
          );
        }
      }

      if (pagination.limit !== undefined) {
        const limitRule = new RangeValidationRule(1, 1000);
        const limitValidation = limitRule.validate(pagination.limit);

        if (!limitValidation.isValid) {
          validation.errors.push(
            ...limitValidation.errors.map((err) => `Limit: ${err}`),
          );
        }
      }

      validation.isValid = validation.errors.length === 0;
    } catch (error) {
      validation.isValid = false;
      validation.errors.push(
        `Pagination validation failed: ${(error as Error).message}`,
      );
    }

    return validation;
  }

  /**
   * Validate sorting
   */
  validateSorting(sorting: any[]): IRuntimeValidation {
    const validation: IRuntimeValidation = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    try {
      sorting.forEach((sort, index) => {
        if (!sort.field) {
          validation.errors.push(`Sort ${index}: field is required`);
        }

        if (
          sort.direction &&
          !['ASC', 'DESC'].includes(sort.direction.toUpperCase())
        ) {
          validation.errors.push(
            `Sort ${index}: direction must be ASC or DESC`,
          );
        }
      });

      validation.isValid = validation.errors.length === 0;
    } catch (error) {
      validation.isValid = false;
      validation.errors.push(
        `Sorting validation failed: ${(error as Error).message}`,
      );
    }

    return validation;
  }

  /**
   * Validate request
   */
  validateRequest(request: any): IRuntimeValidation {
    const validation: IRuntimeValidation = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    try {
      // Validate headers
      if (request.headers) {
        const headerValidation = this.validateHeaders(request.headers);
        if (!headerValidation.isValid) {
          validation.errors.push(...headerValidation.errors);
        }
      }

      // Validate body
      if (request.body) {
        const bodyValidation = this.validateBody(request.body);
        if (!bodyValidation.isValid) {
          validation.errors.push(...bodyValidation.errors);
        }
      }

      // Validate params
      if (request.params) {
        const paramValidation = this.validateParams(request.params);
        if (!paramValidation.isValid) {
          validation.errors.push(...paramValidation.errors);
        }
      }

      validation.isValid = validation.errors.length === 0;
    } catch (error) {
      validation.isValid = false;
      validation.errors.push(
        `Request validation failed: ${(error as Error).message}`,
      );
    }

    return validation;
  }

  /**
   * Validate headers
   */
  validateHeaders(headers: any): IRuntimeValidation {
    const validation: IRuntimeValidation = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    try {
      // Check for required headers
      const requiredHeaders = ['content-type'];

      requiredHeaders.forEach((header) => {
        if (!headers[header]) {
          validation.warnings.push(`Missing recommended header: ${header}`);
        }
      });
    } catch (error) {
      validation.isValid = false;
      validation.errors.push(
        `Header validation failed: ${(error as Error).message}`,
      );
    }

    return validation;
  }

  /**
   * Validate body
   */
  validateBody(body: any): IRuntimeValidation {
    const validation: IRuntimeValidation = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    try {
      if (typeof body !== 'object' || body === null) {
        validation.errors.push('Request body must be an object');
      }
    } catch (error) {
      validation.isValid = false;
      validation.errors.push(
        `Body validation failed: ${(error as Error).message}`,
      );
    }

    return validation;
  }

  /**
   * Validate params
   */
  validateParams(params: any): IRuntimeValidation {
    const validation: IRuntimeValidation = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    try {
      // Validate UUID params
      Object.entries(params).forEach(([key, value]) => {
        if (key.toLowerCase().includes('id') && typeof value === 'string') {
          const uuidRule = new UUIDValidationRule();
          const uuidValidation = uuidRule.validate(value);

          if (!uuidValidation.isValid) {
            validation.errors.push(
              `${key}: ${uuidValidation.errors.join(', ')}`,
            );
          }
        }
      });

      validation.isValid = validation.errors.length === 0;
    } catch (error) {
      validation.isValid = false;
      validation.errors.push(
        `Params validation failed: ${(error as Error).message}`,
      );
    }

    return validation;
  }

  /**
   * Initialize default validation rules
   */
  private initializeDefaultRules(): void {
    this.registerRule(new RequiredFieldRule());
    this.registerRule(new TypeValidationRule('string'));
    this.registerRule(new TypeValidationRule('number'));
    this.registerRule(new TypeValidationRule('boolean'));
    this.registerRule(new EmailValidationRule());
    this.registerRule(new UUIDValidationRule());
    this.registerRule(new LengthValidationRule(1, 255));
    this.registerRule(new RangeValidationRule(0, Number.MAX_SAFE_INTEGER));

    this.logger.log('📝 Default validation rules initialized');
  }

  /**
   * Get validation rules for column
   */
  private getValidationRulesForColumn(column: any): IValidationRule[] {
    const rules: IValidationRule[] = [];

    // Required rule
    if (!column.isNullable) {
      rules.push(new RequiredFieldRule());
    }

    // Type rules
    if (column.type.includes('varchar') || column.type.includes('text')) {
      rules.push(new TypeValidationRule('string'));

      if (column.length) {
        rules.push(new LengthValidationRule(0, column.length));
      }
    } else if (column.type.includes('int') || column.type.includes('decimal')) {
      rules.push(new TypeValidationRule('number'));
    } else if (column.type.includes('boolean')) {
      rules.push(new TypeValidationRule('boolean'));
    }

    // Email rule
    if (column.name.toLowerCase().includes('email')) {
      rules.push(new EmailValidationRule());
    }

    // UUID rule
    if (
      column.name.toLowerCase().includes('id') &&
      column.type.includes('uuid')
    ) {
      rules.push(new UUIDValidationRule());
    }

    return rules;
  }

  /**
   * Validate create operation
   */
  private validateCreateOperation(entity: any, data: any): string[] {
    const errors: string[] = [];

    // Check for required fields
    const metadata = this.metadataService.getEntityMetadata(entity.constructor);
    metadata.columns.forEach((column) => {
      if (!column.isNullable && !data.hasOwnProperty(column.name)) {
        errors.push(`Required field missing: ${column.name}`);
      }
    });

    return errors;
  }

  /**
   * Validate update operation
   */
  private validateUpdateOperation(entity: any, data: any): string[] {
    const errors: string[] = [];

    // Check if at least one field is being updated
    if (Object.keys(data).length === 0) {
      errors.push('At least one field must be provided for update');
    }

    return errors;
  }

  /**
   * Validate delete operation
   */
  private validateDeleteOperation(entity: any): string[] {
    const errors: string[] = [];

    // Check if entity has soft delete capability
    const metadata = this.metadataService.getEntityMetadata(entity.constructor);
    const hasSoftDelete = metadata.columns.some(
      (col) => col.name === 'deletedAt',
    );

    if (!hasSoftDelete) {
      errors.push('Entity does not support soft delete');
    }

    return errors;
  }

  /**
   * Validate search operation
   */
  private validateSearchOperation(capabilities: any, data: any): string[] {
    const errors: string[] = [];

    if (data.query && typeof data.query !== 'string') {
      errors.push('Search query must be a string');
    }

    if (data.fields && !Array.isArray(data.fields)) {
      errors.push('Search fields must be an array');
    }

    return errors;
  }

  /**
   * Validate filter operation
   */
  private validateFilterOperation(capabilities: any, data: any): string[] {
    const errors: string[] = [];

    if (data.field && !capabilities.filterable.includes(data.field)) {
      errors.push(`Field '${data.field}' is not filterable`);
    }

    return errors;
  }

  /**
   * Validate sort operation
   */
  private validateSortOperation(capabilities: any, data: any): string[] {
    const errors: string[] = [];

    if (data.field && !capabilities.sortable.includes(data.field)) {
      errors.push(`Field '${data.field}' is not sortable`);
    }

    return errors;
  }
}
