/**
 * Response utility functions
 */

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
  timestamp: string;
  statusCode: number;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class ResponseUtils {
  /**
   * Create success response
   */
  static success<T>(
    data: T,
    message: string = 'Success',
    statusCode: number = 200,
  ): ApiResponse<T> {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
      statusCode,
    };
  }

  /**
   * Create error response
   */
  static error(
    message: string,
    errors: string[] = [],
    statusCode: number = 400,
  ): ApiResponse {
    return {
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString(),
      statusCode,
    };
  }

  /**
   * Create paginated response
   */
  static paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
    message: string = 'Success',
    statusCode: number = 200,
  ): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
      statusCode,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Create validation error response
   */
  static validationError(
    message: string = 'Validation failed',
    errors: string[] = [],
  ): ApiResponse {
    return this.error(message, errors, 422);
  }

  /**
   * Create not found response
   */
  static notFound(
    message: string = 'Resource not found',
    errors: string[] = [],
  ): ApiResponse {
    return this.error(message, errors, 404);
  }

  /**
   * Create unauthorized response
   */
  static unauthorized(
    message: string = 'Unauthorized',
    errors: string[] = [],
  ): ApiResponse {
    return this.error(message, errors, 401);
  }

  /**
   * Create forbidden response
   */
  static forbidden(
    message: string = 'Forbidden',
    errors: string[] = [],
  ): ApiResponse {
    return this.error(message, errors, 403);
  }

  /**
   * Create internal server error response
   */
  static internalError(
    message: string = 'Internal server error',
    errors: string[] = [],
  ): ApiResponse {
    return this.error(message, errors, 500);
  }

  /**
   * Create conflict response
   */
  static conflict(
    message: string = 'Conflict',
    errors: string[] = [],
  ): ApiResponse {
    return this.error(message, errors, 409);
  }

  /**
   * Create created response
   */
  static created<T>(
    data: T,
    message: string = 'Resource created successfully',
  ): ApiResponse<T> {
    return this.success(data, message, 201);
  }

  /**
   * Create no content response
   */
  static noContent(message: string = 'No content'): ApiResponse {
    return this.success(null, message, 204);
  }

  /**
   * Create accepted response
   */
  static accepted<T>(
    data: T,
    message: string = 'Request accepted',
  ): ApiResponse<T> {
    return this.success(data, message, 202);
  }

  /**
   * Create bad request response
   */
  static badRequest(
    message: string = 'Bad request',
    errors: string[] = [],
  ): ApiResponse {
    return this.error(message, errors, 400);
  }

  /**
   * Create too many requests response
   */
  static tooManyRequests(
    message: string = 'Too many requests',
    errors: string[] = [],
  ): ApiResponse {
    return this.error(message, errors, 429);
  }

  /**
   * Create service unavailable response
   */
  static serviceUnavailable(
    message: string = 'Service unavailable',
    errors: string[] = [],
  ): ApiResponse {
    return this.error(message, errors, 503);
  }

  /**
   * Create gateway timeout response
   */
  static gatewayTimeout(
    message: string = 'Gateway timeout',
    errors: string[] = [],
  ): ApiResponse {
    return this.error(message, errors, 504);
  }
}
