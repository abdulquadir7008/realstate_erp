import { Controller, Get, Query } from '@nestjs/common';
import { z } from 'zod';
import { ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { RequirePermissions } from '../../common/decorators';
import { parseQuery } from '../../common/pipes/zod-validation.pipe';

const reportQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('dashboard')
  @RequirePermissions('dashboard:read')
  dashboard(@Query() q: unknown) {
    return this.service.dashboard(parseQuery(reportQuerySchema, q));
  }

  @Get('sales')
  @RequirePermissions('report:read')
  sales(@Query() q: unknown) {
    return this.service.sales(parseQuery(reportQuerySchema, q));
  }

  @Get('leads')
  @RequirePermissions('report:read')
  leads(@Query() q: unknown) {
    return this.service.leads(parseQuery(reportQuerySchema, q));
  }

  @Get('inventory')
  @RequirePermissions('report:read')
  inventory(@Query() q: unknown) {
    return this.service.inventory(parseQuery(reportQuerySchema, q));
  }

  @Get('construction')
  @RequirePermissions('report:read')
  construction(@Query() q: unknown) {
    return this.service.construction(parseQuery(reportQuerySchema, q));
  }
}
