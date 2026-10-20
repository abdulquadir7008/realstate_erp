import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Something went wrong';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'object' && response !== null) {
        const body = response as Record<string, any>;
        code = body.code ?? exception.name;
        message = typeof body.message === 'string' ? body.message : Array.isArray(body.message) ? body.message.join('; ') : exception.message;
        details = body.details ?? (Array.isArray(body.message) ? body.message : undefined);
      } else {
        message = String(response);
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      if (process.env.NODE_ENV === 'development') this.logger.error(exception.stack);
      else this.logger.error(message);
    } else {
      this.logger.error(String(exception));
    }

    httpAdapter.reply(ctx.getResponse(), { success: false, error: { code, message, details } }, status);
  }
}
