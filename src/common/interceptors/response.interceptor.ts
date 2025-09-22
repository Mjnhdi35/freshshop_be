import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError, timer } from 'rxjs';
import { map, tap, catchError, finalize } from 'rxjs/operators';
import {
  ResponseUtils,
  ApiResponse,
  PaginatedResponse,
} from '../../utils/response.utils';

// Type definitions for better type safety
interface PaginatedData {
  data: any[];
  pagination: any;
  message?: string;
}

interface ErrorData {
  error?: string;
  message?: string;
  errors?: string[];
}

interface SuccessData {
  data?: any;
  message?: string;
}

interface FormattedResponse {
  success: boolean;
  message: string;
  timestamp: string;
  statusCode: number;
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T> | PaginatedResponse<T>>
{
  private readonly logger = new Logger(ResponseInterceptor.name);
  private requestCounter = 0;

  /**
   * NestJS Lifecycle: POST Interceptor
   * Client --> HTTP Server --> Middleware --> Guard --> Pipe --> Interceptor (pre)
   * --> Controller Handler --> Interceptor (post) --> Exception Filter --> Response
   */
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T> | PaginatedResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url } = request;
    const startTime = Date.now();

    this.logger.debug(
      `📤 POST Interceptor: Processing response for ${method} ${url}`,
    );

    return next.handle().pipe(
      // Xử lý dữ liệu phản hồi (định dạng)
      map((data) => {
        const statusCode = response.statusCode;

        // Handle different response types using type guards
        if (this.isPaginatedResponse(data)) {
          return this.formatPaginatedResponse(data, statusCode);
        }

        if (this.isErrorResponse(data)) {
          return this.formatErrorResponse(data, statusCode);
        }

        // Handle successful responses
        return this.formatSuccessResponse(data, statusCode);
      }),

      // Thêm metadata đơn giản
      map((formattedResponse) => {
        if (formattedResponse && typeof formattedResponse === 'object') {
          return {
            ...formattedResponse,
            meta: {
              requestId: this.generateRequestId(),
              timestamp: new Date().toISOString(),
              lifecycle: 'post-interceptor',
            },
          };
        }
        return formattedResponse;
      }),

      // Handle errors gracefully (before Exception Filter)
      catchError((error) => {
        // Format error response for Exception Filter
        const errorResponse = this.formatErrorResponse(
          {
            message: error.message || 'Internal server error',
            error: error.name || 'UnknownError',
            errors: error.errors || [error.message || 'Unknown error occurred'],
          },
          response.statusCode || 500,
        );

        return throwError(() => errorResponse);
      }),

      // Cleanup
      finalize(() => {
        // no-op
      }),
    ) as Observable<ApiResponse<T> | PaginatedResponse<T>>;
  }

  // Type Guards
  private isPaginatedResponse(data: any): data is PaginatedData {
    return (
      data !== null &&
      typeof data === 'object' &&
      'data' in data &&
      'pagination' in data &&
      Array.isArray(data.data) &&
      typeof data.pagination === 'object'
    );
  }

  private isErrorResponse(data: any): data is ErrorData {
    return (
      data !== null &&
      typeof data === 'object' &&
      // Treat as error only if explicit error indicators are present
      (('error' in data &&
        typeof (data as any).error === 'string' &&
        (data as any).error.length > 0) ||
        ('errors' in data &&
          Array.isArray((data as any).errors) &&
          (data as any).errors.length > 0)) &&
      !('data' in data) &&
      !('success' in data)
    );
  }

  private isSuccessResponse(data: any): data is SuccessData {
    return (
      data !== null &&
      typeof data === 'object' &&
      ('data' in data || 'message' in data) &&
      !('error' in data) &&
      !('success' in data)
    );
  }

  private isStringResponse(data: any): data is string {
    return typeof data === 'string';
  }

  private isNullResponse(data: any): data is null | undefined {
    return data === null || data === undefined;
  }

  private isArrayResponse(data: any): data is any[] {
    return Array.isArray(data);
  }

  private isPlainObjectResponse(data: any): data is Record<string, any> {
    return (
      data !== null &&
      typeof data === 'object' &&
      !Array.isArray(data) &&
      !('success' in data) &&
      !('error' in data)
    );
  }

  // Utility Methods
  private safeGetProperty<T>(obj: any, key: string): T | undefined {
    if (obj && typeof obj === 'object' && key in obj) {
      return obj[key] as T;
    }
    return undefined;
  }

  private hasProperties(obj: any, ...properties: string[]): boolean {
    if (!obj || typeof obj !== 'object') {
      return false;
    }
    return properties.every((prop) => prop in obj);
  }

  private validateResponseData(data: any): boolean {
    if (data === null || data === undefined) {
      return true;
    }

    if (
      typeof data === 'string' ||
      typeof data === 'number' ||
      typeof data === 'boolean'
    ) {
      return true;
    }

    if (Array.isArray(data)) {
      return true;
    }

    if (typeof data === 'object') {
      return true;
    }

    return false;
  }

  private generateRequestId(): string {
    this.requestCounter++;
    return `req_${Date.now()}_${this.requestCounter}`;
  }

  // Đã loại bỏ logic metrics/retry để tuân thủ SRP.

  // Response Formatters
  private formatSuccessResponse(
    data: any,
    statusCode: number,
  ): ApiResponse<T> | PaginatedResponse<T> {
    if (!this.validateResponseData(data)) {
      this.logger.warn('Invalid response data structure detected');
      return ResponseUtils.success(
        null as any,
        'Invalid response data',
        statusCode,
      );
    }

    if (this.isAlreadyFormatted(data)) {
      return data;
    }

    if (this.isNullResponse(data)) {
      return ResponseUtils.success(null as any, 'Success', statusCode);
    }

    if (this.isStringResponse(data)) {
      return ResponseUtils.success(data as any, 'Success', statusCode);
    }

    if (this.isArrayResponse(data)) {
      return ResponseUtils.success(data as any, 'Success', statusCode);
    }

    if (this.isSuccessResponse(data)) {
      const dataProperty = this.safeGetProperty(data, 'data');
      const messageProperty = this.safeGetProperty<string>(data, 'message');

      if (dataProperty !== undefined) {
        return ResponseUtils.success(
          dataProperty as any,
          messageProperty || 'Success',
          statusCode,
        );
      }

      if (messageProperty !== undefined && Object.keys(data).length === 1) {
        return ResponseUtils.success(null as any, messageProperty, statusCode);
      }
    }

    if (this.isPlainObjectResponse(data)) {
      return ResponseUtils.success(data as any, 'Success', statusCode);
    }

    return ResponseUtils.success(data as any, 'Success', statusCode);
  }

  private formatPaginatedResponse(
    data: any,
    statusCode: number,
  ): PaginatedResponse<T> {
    if (this.isPaginatedResponse(data)) {
      const { data: items, pagination, message } = data;

      return {
        success: true,
        message: message || 'Success',
        data: items as T[],
        pagination,
        timestamp: new Date().toISOString(),
        statusCode,
      };
    }

    return {
      success: true,
      message: 'Success',
      data: [] as T[],
      pagination: {
        page: 1,
        limit: 0,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
      timestamp: new Date().toISOString(),
      statusCode,
    };
  }

  private formatErrorResponse(data: any, statusCode: number): ApiResponse<any> {
    if (this.isErrorResponse(data)) {
      const { message, error, errors } = data;

      return {
        success: false,
        message: message || error || 'Error occurred',
        errors: errors || (error ? [error] : []),
        timestamp: new Date().toISOString(),
        statusCode,
      };
    }

    return {
      success: false,
      message: 'Unknown error occurred',
      errors: [],
      timestamp: new Date().toISOString(),
      statusCode,
    };
  }

  private isAlreadyFormatted(
    data: any,
  ): data is ApiResponse<any> | PaginatedResponse<any> {
    return (
      data &&
      typeof data === 'object' &&
      'success' in data &&
      'message' in data &&
      'timestamp' in data &&
      'statusCode' in data
    );
  }
}
