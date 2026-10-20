import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { ApiTags } from '@nestjs/swagger';
import { WorkflowsService } from './workflows.service';
import { RequirePermissions } from '../../common/decorators';
import { ZodValidationPipe, parseQuery } from '../../common/pipes/zod-validation.pipe';
import { paginationSchema, workflowDefinitionSchema, updateWorkflowSchema, WorkflowDefinitionInput, UpdateWorkflowInput } from '@re/shared';

const workflowQuerySchema = paginationSchema.extend({ trigger: z.string().optional(), isActive: z.coerce.boolean().optional() });
const runSchema = z.object({ context: z.record(z.unknown()).default({}) });

@ApiTags('Workflows')
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly service: WorkflowsService) {}

  @Get()
  @RequirePermissions('workflow:read')
  list(@Query() q: unknown) {
    return this.service.list(parseQuery(workflowQuerySchema, q));
  }

  @Post()
  @RequirePermissions('workflow:create')
  create(@Body(new ZodValidationPipe(workflowDefinitionSchema)) body: WorkflowDefinitionInput) {
    return this.service.create(body);
  }

  @Get(':id')
  @RequirePermissions('workflow:read')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Patch(':id')
  @RequirePermissions('workflow:update')
  update(@Param('id') id: string, @Body(new ZodValidationPipe(updateWorkflowSchema)) body: UpdateWorkflowInput) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @RequirePermissions('workflow:delete')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Get(':id/executions')
  @RequirePermissions('workflow:read')
  listExecutions(@Param('id') id: string, @Query() q: unknown) {
    return this.service.listExecutions(id, parseQuery(paginationSchema, q));
  }

  @Post(':id/run')
  @RequirePermissions('workflow:manage')
  run(@Param('id') id: string, @Body(new ZodValidationPipe(runSchema)) body: z.infer<typeof runSchema>) {
    return this.service.run(id, body.context);
  }
}
