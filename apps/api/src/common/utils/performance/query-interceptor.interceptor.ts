import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class QueryInterceptor implements NestInterceptor {
  private readonly logger = new Logger('QueryInterceptor');

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    
    return next.handle().pipe(
      tap({
        next: (data) => {
          // Log performance info
          const executionTime = Date.now() - startTime;
          if (executionTime > 1000) {
            this.logger.debug(`Slow request: ${executionTime}ms`);
          }
        },
        error: (err) => {
          this.logger.error(`Request error: ${err.message}`, err.stack);
        },
      }),
    );
  }
}