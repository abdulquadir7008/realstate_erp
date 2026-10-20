import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { RequirePermissions } from '../../common/decorators';
import { ZodValidationPipe, parseQuery } from '../../common/pipes/zod-validation.pipe';
import {
  projectSchema,
  updateProjectSchema,
  projectQuerySchema,
  milestoneSchema,
  updateMilestoneSchema,
  ProjectInput,
  UpdateProjectInput,
  MilestoneInput,
} from '@re/shared';

@ApiTags('Projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  @Get()
  @RequirePermissions('project:read')
  list(@Query() q: unknown) {
    return this.service.list(parseQuery(projectQuerySchema, q));
  }

  @Post()
  @RequirePermissions('project:create')
  create(@Body(new ZodValidationPipe(projectSchema)) body: ProjectInput) {
    return this.service.create(body);
  }

  @Get(':id')
  @RequirePermissions('project:read')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Patch(':id')
  @RequirePermissions('project:update')
  update(@Param('id') id: string, @Body(new ZodValidationPipe(updateProjectSchema)) body: UpdateProjectInput) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @RequirePermissions('project:delete')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/milestones')
  @RequirePermissions('project:update')
  addMilestone(@Param('id') id: string, @Body(new ZodValidationPipe(milestoneSchema)) body: MilestoneInput) {
    return this.service.addMilestone(id, body);
  }

  @Patch(':id/milestones/:milestoneId')
  @RequirePermissions('project:update')
  updateMilestone(
    @Param('id') id: string,
    @Param('milestoneId') milestoneId: string,
    @Body(new ZodValidationPipe(updateMilestoneSchema)) body: Partial<MilestoneInput>,
  ) {
    return this.service.updateMilestone(id, milestoneId, body);
  }

  @Delete(':id/milestones/:milestoneId')
  @RequirePermissions('project:update')
  removeMilestone(@Param('id') id: string, @Param('milestoneId') milestoneId: string) {
    return this.service.removeMilestone(id, milestoneId);
  }
}
