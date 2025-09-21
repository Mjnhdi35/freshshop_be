/**
 * Validation utility functions
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class ValidationUtils {
  /**
   * Validate email format
   */
  static validateEmail(email: string): ValidationResult {
    const errors: string[] = [];

    if (!email) {
      errors.push('Email is required');
      return { isValid: false, errors };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Invalid email format');
    }

    if (email.length > 254) {
      errors.push('Email is too long (max 254 characters)');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate UUID format
   */
  static validateUUID(uuid: string): ValidationResult {
    const errors: string[] = [];

    if (!uuid) {
      errors.push('UUID is required');
      return { isValid: false, errors };
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uuid)) {
      errors.push('Invalid UUID format');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate string length
   */
  static validateStringLength(
    value: string,
    minLength: number,
    maxLength: number,
    fieldName: string = 'Field',
  ): ValidationResult {
    const errors: string[] = [];

    if (!value) {
      errors.push(`${fieldName} is required`);
      return { isValid: false, errors };
    }

    if (value.length < minLength) {
      errors.push(`${fieldName} must be at least ${minLength} characters long`);
    }

    if (value.length > maxLength) {
      errors.push(
        `${fieldName} must be no more than ${maxLength} characters long`,
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate role
   */
  static validateRole(role: string, allowedRoles: string[]): ValidationResult {
    const errors: string[] = [];

    if (!role) {
      errors.push('Role is required');
      return { isValid: false, errors };
    }

    if (!allowedRoles.includes(role)) {
      errors.push(`Role must be one of: ${allowedRoles.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate boolean value
   */
  static validateBoolean(
    value: any,
    fieldName: string = 'Field',
  ): ValidationResult {
    const errors: string[] = [];

    if (typeof value !== 'boolean') {
      errors.push(`${fieldName} must be a boolean value`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate number range
   */
  static validateNumberRange(
    value: number,
    min: number,
    max: number,
    fieldName: string = 'Field',
  ): ValidationResult {
    const errors: string[] = [];

    if (typeof value !== 'number' || isNaN(value)) {
      errors.push(`${fieldName} must be a valid number`);
      return { isValid: false, errors };
    }

    if (value < min) {
      errors.push(`${fieldName} must be at least ${min}`);
    }

    if (value > max) {
      errors.push(`${fieldName} must be no more than ${max}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate date
   */
  static validateDate(date: any, fieldName: string = 'Date'): ValidationResult {
    const errors: string[] = [];

    if (!date) {
      errors.push(`${fieldName} is required`);
      return { isValid: false, errors };
    }

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      errors.push(`${fieldName} must be a valid date`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate URL format
   */
  static validateURL(url: string): ValidationResult {
    const errors: string[] = [];

    if (!url) {
      errors.push('URL is required');
      return { isValid: false, errors };
    }

    try {
      new URL(url);
    } catch {
      errors.push('Invalid URL format');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }

  /**
   * Validate and sanitize string
   */
  static validateAndSanitizeString(
    input: string,
    minLength: number,
    maxLength: number,
    fieldName: string = 'Field',
  ): { result: ValidationResult; sanitized: string } {
    const sanitized = this.sanitizeString(input);
    const result = this.validateStringLength(
      sanitized,
      minLength,
      maxLength,
      fieldName,
    );

    return { result, sanitized };
  }
}
