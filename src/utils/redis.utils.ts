/**
 * Redis utility functions
 */

export interface RedisKeyPatterns {
  USER_SESSION: string;
  REFRESH_TOKEN: string;
  ACCESS_TOKEN: string;
  USER_CACHE: string;
  RATE_LIMIT: string;
  CACHE: string;
}

export class RedisUtils {
  /**
   * Redis key patterns for different data types
   */
  static readonly KEY_PATTERNS: RedisKeyPatterns = {
    USER_SESSION: 'user_session',
    REFRESH_TOKEN: 'refresh_token',
    ACCESS_TOKEN: 'access_token',
    USER_CACHE: 'user_cache',
    RATE_LIMIT: 'rate_limit',
    CACHE: 'cache',
  };

  /**
   * Generate Redis key with pattern and identifier
   */
  static generateKey(pattern: string, identifier: string): string {
    return `${pattern}:${identifier}`;
  }

  /**
   * Generate user session key
   */
  static getUserSessionKey(userId: string): string {
    return this.generateKey(this.KEY_PATTERNS.USER_SESSION, userId);
  }

  /**
   * Generate refresh token key
   */
  static getRefreshTokenKey(userId: string): string {
    return this.generateKey(this.KEY_PATTERNS.REFRESH_TOKEN, userId);
  }

  /**
   * Generate access token key
   */
  static getAccessTokenKey(userId: string): string {
    return this.generateKey(this.KEY_PATTERNS.ACCESS_TOKEN, userId);
  }

  /**
   * Generate user cache key
   */
  static getUserCacheKey(userId: string): string {
    return this.generateKey(this.KEY_PATTERNS.USER_CACHE, userId);
  }

  /**
   * Generate rate limit key
   */
  static getRateLimitKey(identifier: string, window: string): string {
    return this.generateKey(
      this.KEY_PATTERNS.RATE_LIMIT,
      `${identifier}:${window}`,
    );
  }

  /**
   * Generate cache key with TTL
   */
  static getCacheKey(key: string, ttl?: number): string {
    return ttl
      ? `${this.KEY_PATTERNS.CACHE}:${key}:${ttl}`
      : `${this.KEY_PATTERNS.CACHE}:${key}`;
  }

  /**
   * Parse Redis key to extract pattern and identifier
   */
  static parseKey(key: string): { pattern: string; identifier: string } | null {
    const parts = key.split(':');
    if (parts.length < 2) {
      return null;
    }

    return {
      pattern: parts[0],
      identifier: parts.slice(1).join(':'),
    };
  }

  /**
   * Check if key matches a pattern
   */
  static matchesPattern(key: string, pattern: string): boolean {
    return key.startsWith(`${pattern}:`);
  }

  /**
   * Generate wildcard pattern for searching
   */
  static getWildcardPattern(pattern: string): string {
    return `${pattern}:*`;
  }

  /**
   * Extract user ID from session key
   */
  static extractUserIdFromSessionKey(key: string): string | null {
    const parsed = this.parseKey(key);
    if (parsed && parsed.pattern === this.KEY_PATTERNS.USER_SESSION) {
      return parsed.identifier;
    }
    return null;
  }

  /**
   * Extract user ID from token key
   */
  static extractUserIdFromTokenKey(key: string): string | null {
    const parsed = this.parseKey(key);
    if (
      parsed &&
      (parsed.pattern === this.KEY_PATTERNS.REFRESH_TOKEN ||
        parsed.pattern === this.KEY_PATTERNS.ACCESS_TOKEN)
    ) {
      return parsed.identifier;
    }
    return null;
  }

  /**
   * Generate keys for user cleanup
   */
  static getUserCleanupKeys(userId: string): string[] {
    return [
      this.getUserSessionKey(userId),
      this.getRefreshTokenKey(userId),
      this.getAccessTokenKey(userId),
      this.getUserCacheKey(userId),
    ];
  }

  /**
   * Generate pattern for user-related keys
   */
  static getUserKeysPattern(userId: string): string[] {
    return [
      this.getWildcardPattern(this.KEY_PATTERNS.USER_SESSION),
      this.getWildcardPattern(this.KEY_PATTERNS.REFRESH_TOKEN),
      this.getWildcardPattern(this.KEY_PATTERNS.ACCESS_TOKEN),
      this.getWildcardPattern(this.KEY_PATTERNS.USER_CACHE),
    ];
  }
}
