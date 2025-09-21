/**
 * Password utility functions
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export class PasswordUtils {
  /**
   * Validate password strength
   */
  static validatePasswordStrength(password: string): PasswordValidationResult {
    const errors: string[] = [];

    // Minimum 8 characters
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    // At least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // At least one lowercase letter
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // At least one number
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // At least one special character
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get password requirements as a single string
   */
  static getPasswordRequirements(): string {
    return 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.';
  }

  /**
   * Check if password meets minimum requirements (basic check)
   */
  static isPasswordValid(password: string): boolean {
    return password.length >= 6;
  }

  /**
   * Generate a random password
   */
  static generateRandomPassword(length: number = 12): string {
    const charset =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';

    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    return password;
  }

  /**
   * Check if password is common/weak
   */
  static isCommonPassword(password: string): boolean {
    const commonPasswords = [
      'password',
      '123456',
      '123456789',
      'qwerty',
      'abc123',
      'password123',
      'admin',
      'letmein',
      'welcome',
      'monkey',
      '1234567890',
      'dragon',
      'master',
      'hello',
      'freedom',
      'whatever',
      'qazwsx',
      'trustno1',
    ];

    return commonPasswords.includes(password.toLowerCase());
  }
}
