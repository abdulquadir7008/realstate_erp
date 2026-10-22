import { HttpException, HttpStatus } from '@nestjs/common';

export class ApiException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: unknown,
  ) {
    super({ statusCode: status, message, code, details }, status);
  }
}

export const errors = {
  validation: (details?: unknown) =>
    new ApiException('VALIDATION_ERROR', 'The submitted data is invalid', HttpStatus.BAD_REQUEST, details),
  unauthorized: (message = 'Authentication required') =>
    new ApiException('UNAUTHORIZED', message, HttpStatus.UNAUTHORIZED),
  forbidden: (message = 'You do not have permission to perform this action') =>
    new ApiException('FORBIDDEN', message, HttpStatus.FORBIDDEN),
  denied: (code: string, message: string) => new ApiException(code, message, HttpStatus.FORBIDDEN),
  notFound: (entity = 'Resource') => new ApiException('NOT_FOUND', `${entity} not found`, HttpStatus.NOT_FOUND),
  conflict: (message: string, details?: unknown) =>
    new ApiException('CONFLICT', message, HttpStatus.CONFLICT, details),
  gone: (message: string) => new ApiException('GONE', message, HttpStatus.GONE),
  limitReached: (message: string, details?: unknown) =>
    new ApiException('PLAN_LIMIT_REACHED', message, HttpStatus.PAYMENT_REQUIRED, details),
  inactiveOrg: (message = 'This organization is not active') =>
    new ApiException('ORGANIZATION_INACTIVE', message, HttpStatus.FORBIDDEN),
  internal: (message = 'Something went wrong') =>
    new ApiException('INTERNAL_ERROR', message, HttpStatus.INTERNAL_SERVER_ERROR),
};

export function isApiException(e: unknown): e is ApiException {
  return e instanceof ApiException;
}

export function getErrorCode(e: unknown): string {
  if (isApiException(e)) return e.code;
  return 'INTERNAL_ERROR';
}
