import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { RequirePermissions } from '../../common/decorators';
import { ZodValidationPipe, parseQuery } from '../../common/pipes/zod-validation.pipe';
import { auditLogQuerySchema, auditPruneSchema } from '@re/shared';
import { AuditService } from './audit.service';

const statsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

@ApiTags('Audit')
@Controller('audit')
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  @RequirePermissions('audit:read')
  list(@Query() q: unknown) {
    return this.service.list(parseQuery(auditLogQuerySchema, q));
  }

  @Get('stats')
  @RequirePermissions('audit:read')
  stats(@Query() q: unknown) {
    return this.service.stats(parseQuery(statsQuerySchema, q));
  }

  @Post('prune')
  @RequirePermissions('audit:manage')
  prune(@Body(new ZodValidationPipe(auditPruneSchema)) body: any) {
    return this.service.prune(body);
  }

  @Get(':id')
  @RequirePermissions('audit:read')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }
}
