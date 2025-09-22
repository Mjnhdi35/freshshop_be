import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? (exception.getResponse() as any)?.message || exception.message
        : (exception as any)?.message || 'Internal server error';

    const errors =
      exception instanceof HttpException
        ? ((): string[] => {
            const res = exception.getResponse();
            if (res && typeof res === 'object' && 'message' in (res as any)) {
              const m = (res as any).message;
              return Array.isArray(m) ? m : [String(m)];
            }
            return [];
          })()
        : [];

    // Structured error log
    this.logger.error(
      `${request.method} ${request.url} -> ${status}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      success: false,
      message: Array.isArray(message) ? message[0] : String(message),
      errors,
      timestamp: new Date().toISOString(),
      statusCode: status,
    });
  }
}
