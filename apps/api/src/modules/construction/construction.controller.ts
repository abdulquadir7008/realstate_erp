import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { ApiTags } from '@nestjs/swagger';
import { ConstructionService } from './construction.service';
import { RequirePermissions } from '../../common/decorators';
import { ZodValidationPipe, parseQuery } from '../../common/pipes/zod-validation.pipe';
import {
  paginationSchema,
  constructionTaskSchema,
  updateTaskSchema,
  siteReportSchema,
  qualityInspectionSchema,
  ConstructionTaskInput,
  UpdateTaskInput,
  SiteReportInput,
  QualityInspectionInput,
} from '@re/shared';

const taskQuerySchema = paginationSchema.extend({
  projectId: z.string().uuid().optional(),
  status: z.string().optional(),
  assigneeId: z.string().uuid().optional(),
  milestoneId: z.string().uuid().optional(),
});
const siteReportQuerySchema = paginationSchema.extend({ projectId: z.string().uuid().optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional() });
const inspectionQuerySchema = paginationSchema.extend({ projectId: z.string().uuid().optional() });

@ApiTags('Construction')
@Controller('construction')
export class ConstructionController {
  constructor(private readonly service: ConstructionService) {}

  @Get('tasks')
  @RequirePermissions('task:read')
  listTasks(@Query() q: unknown) {
    return this.service.listTasks(parseQuery(taskQuerySchema, q));
  }

  @Post('tasks')
  @RequirePermissions('task:create')
  createTask(@Body(new ZodValidationPipe(constructionTaskSchema)) body: ConstructionTaskInput) {
    return this.service.createTask(body);
  }

  @Get('tasks/:id')
  @RequirePermissions('task:read')
  getTask(@Param('id') id: string) {
    return this.service.getTask(id);
  }

  @Patch('tasks/:id')
  @RequirePermissions('task:update')
  updateTask(@Param('id') id: string, @Body(new ZodValidationPipe(updateTaskSchema)) body: UpdateTaskInput) {
    return this.service.updateTask(id, body);
  }

  @Delete('tasks/:id')
  @RequirePermissions('task:delete')
  removeTask(@Param('id') id: string) {
    return this.service.removeTask(id);
  }

  @Get('site-reports')
  @RequirePermissions('site_report:read')
  listSiteReports(@Query() q: unknown) {
    return this.service.listSiteReports(parseQuery(siteReportQuerySchema, q));
  }

  @Post('site-reports')
  @RequirePermissions('site_report:create')
  createSiteReport(@Body(new ZodValidationPipe(siteReportSchema)) body: SiteReportInput) {
    return this.service.createSiteReport(body);
  }

  @Get('inspections')
  @RequirePermissions('construction:read')
  listInspections(@Query() q: unknown) {
    return this.service.listInspections(parseQuery(inspectionQuerySchema, q));
  }

  @Post('inspections')
  @RequirePermissions('construction:create')
  createInspection(@Body(new ZodValidationPipe(qualityInspectionSchema)) body: QualityInspectionInput) {
    return this.service.createInspection(body);
  }
}
