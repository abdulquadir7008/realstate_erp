import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from, switchMap, tap } from 'rxjs';
import { randomUUID } from 'node:crypto';
import { AUDITED_KEY, AuditedOptions } from '../decorators';
import { AuditService } from '../../modules/audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  extractEntityId,
  inferAuditAction,
  inferAuditSeverity,
  inferEntityType,
  sanitizeAuditPayload,
} from './audit.util';

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

interface AuditableRequest {
  method: string;
  originalUrl?: string;
  url?: string;
  body?: unknown;
  params?: Record<string, unknown>;
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  user?: { id?: string; email?: string; organizationId?: string };
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly audit: AuditService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<AuditableRequest>();
    const response = http.getResponse<{ setHeader?: (name: string, value: string) => void }>();
    const path = request.originalUrl ?? request.url ?? '';

    if (!MUTATING_METHODS.has(request.method.toUpperCase())) return next.handle();
    if (path.includes('/auth/login') || path.includes('/auth/register') || path.includes('/auth/refresh')) {
      return next.handle();
    }

    const user = request.user;
    if (!user?.organizationId) return next.handle();

    const headerCorrelation = request.headers?.['x-correlation-id'];
    const correlationId = (Array.isArray(headerCorrelation) ? headerCorrelation[0] : headerCorrelation) || randomUUID();
    response.setHeader?.('x-correlation-id', correlationId);

    const metadata = this.reflector.getAllAndOverride<AuditedOptions>(AUDITED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const startedAt = Date.now();
    const entityType = inferEntityType(path, metadata?.entityType);
    const action = metadata?.action ?? inferAuditAction(request.method, path);

    return from(this.snapshot(request, entityType)).pipe(
      switchMap((before) =>
        next.handle().pipe(
          tap((raw) => {
            const data = raw && typeof raw === 'object' && 'data' in (raw as Record<string, unknown>)
              ? (raw as Record<string, unknown>).data
              : raw;
            const entityId = extractEntityId(request.params, raw);
            const userAgent = request.headers?.['user-agent'];
            this.audit.record({
              organizationId: user.organizationId!,
              userId: user.id ?? null,
              actorEmail: user.email ?? null,
              action,
              entityType,
              entityId,
              description: metadata?.description ?? `${action} ${entityType}${entityId ? ` ${entityId}` : ''}`,
              changes: {
                method: request.method.toUpperCase(),
                route: path,
                durationMs: Date.now() - startedAt,
                request: sanitizeAuditPayload(request.body),
                response: sanitizeAuditPayload(data),
              },
              before,
              after: sanitizeAuditPayload(data),
              correlationId,
              ipAddress: request.ip ?? null,
              userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent ?? null,
              severity: inferAuditSeverity(action),
            });
          }),
        ),
      ),
    );
  }

  private async snapshot(request: AuditableRequest, entityType: string): Promise<unknown> {
    const id = typeof request.params?.id === 'string' ? request.params.id : null;
    if (!id || !/^[A-Za-z]+$/.test(entityType)) return null;
    const delegateName = entityType.charAt(0).toLowerCase() + entityType.slice(1);
    const delegate = (this.prisma as unknown as Record<string, any>)[delegateName];
    if (!delegate || typeof delegate.findFirst !== 'function') return null;
    try {
      const row = await delegate.findFirst({ where: { id } });
      return sanitizeAuditPayload(row);
    } catch {
      return null;
    }
  }
}
