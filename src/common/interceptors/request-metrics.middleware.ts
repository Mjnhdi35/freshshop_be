import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestMetricsMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestMetricsMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const { method, originalUrl } = req;

    // Capture response size
    let bytesWritten = 0;
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);

    res.write = ((chunk: any, ...args: any[]) => {
      if (chunk) {
        bytesWritten += Buffer.isBuffer(chunk)
          ? chunk.length
          : Buffer.byteLength(String(chunk));
      }
      return originalWrite(chunk, ...args);
    }) as any;

    res.end = ((chunk: any, ...args: any[]) => {
      if (chunk) {
        bytesWritten += Buffer.isBuffer(chunk)
          ? chunk.length
          : Buffer.byteLength(String(chunk));
      }
      const durationMs = Date.now() - start;
      const statusCode = res.statusCode;
      this.logger.debug(
        `${method} ${originalUrl} -> ${statusCode} ${durationMs}ms ${bytesWritten}B`,
      );
      return originalEnd(chunk, ...args);
    }) as any;

    next();
  }
}
