/**
 * JWT utility functions
 */

export interface JwtPayload {
  sub: string; // userId
  role: string;
  iat?: number;
  exp?: number;
}

export class JwtUtils {
  /**
   * Parse JWT expiry string to seconds
   */
  static parseExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 3600; // Default 1 hour
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 3600;
    }
  }

  /**
   * Check if JWT token is expired
   */
  static isTokenExpired(payload: JwtPayload): boolean {
    if (!payload.exp) {
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  }

  /**
   * Get token expiration time as Date
   */
  static getTokenExpirationDate(payload: JwtPayload): Date | null {
    if (!payload.exp) {
      return null;
    }

    return new Date(payload.exp * 1000);
  }

  /**
   * Get time until token expires in seconds
   */
  static getTimeUntilExpiration(payload: JwtPayload): number {
    if (!payload.exp) {
      return 0;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return Math.max(0, payload.exp - currentTime);
  }

  /**
   * Format time remaining in human readable format
   */
  static formatTimeRemaining(seconds: number): string {
    if (seconds <= 0) {
      return 'Expired';
    }

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  /**
   * Validate JWT payload structure
   */
  static isValidPayload(payload: any): payload is JwtPayload {
    return (
      typeof payload === 'object' &&
      payload !== null &&
      typeof payload.sub === 'string' &&
      typeof payload.role === 'string'
    );
  }
}
