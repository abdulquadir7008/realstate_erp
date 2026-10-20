import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { ApiTags } from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { RequirePermissions } from '../../common/decorators';
import { ZodValidationPipe, parseQuery } from '../../common/pipes/zod-validation.pipe';
import {
  leadSchema,
  updateLeadSchema,
  leadQuerySchema,
  leadActivitySchema,
  followUpSchema,
  updateFollowUpSchema,
  convertLeadSchema,
  LeadInput,
  UpdateLeadInput,
  LeadActivityInput,
  FollowUpInput,
  UpdateFollowUpInput,
  ConvertLeadInput,
} from '@re/shared';

const assignSchema = z.object({ assignedTo: z.string().uuid().nullable() });

@ApiTags('Leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly service: LeadsService) {}

  @Get()
  @RequirePermissions('lead:read')
  list(@Query() q: unknown) {
    return this.service.list(parseQuery(leadQuerySchema, q));
  }

  @Post()
  @RequirePermissions('lead:create')
  create(@Body(new ZodValidationPipe(leadSchema)) body: LeadInput) {
    return this.service.create(body);
  }

  @Get(':id')
  @RequirePermissions('lead:read')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Patch(':id')
  @RequirePermissions('lead:update')
  update(@Param('id') id: string, @Body(new ZodValidationPipe(updateLeadSchema)) body: UpdateLeadInput) {
    return this.service.update(id, body);
  }

  @Patch(':id/assign')
  @RequirePermissions('lead:assign')
  assign(@Param('id') id: string, @Body(new ZodValidationPipe(assignSchema)) body: { assignedTo: string | null }) {
    return this.service.assign(id, body.assignedTo);
  }

  @Delete(':id')
  @RequirePermissions('lead:delete')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/activities')
  @RequirePermissions('lead:update')
  addActivity(@Param('id') id: string, @Body(new ZodValidationPipe(leadActivitySchema)) body: LeadActivityInput) {
    return this.service.addActivity(id, body);
  }

  @Post(':id/follow-ups')
  @RequirePermissions('lead:update')
  addFollowUp(@Param('id') id: string, @Body(new ZodValidationPipe(followUpSchema)) body: FollowUpInput) {
    return this.service.addFollowUp(id, body);
  }

  @Patch('follow-ups/:followUpId')
  @RequirePermissions('lead:update')
  updateFollowUp(@Param('followUpId') followUpId: string, @Body(new ZodValidationPipe(updateFollowUpSchema)) body: UpdateFollowUpInput) {
    return this.service.updateFollowUp(followUpId, body);
  }

  @Post(':id/convert')
  @RequirePermissions('lead:update')
  convert(@Param('id') id: string, @Body(new ZodValidationPipe(convertLeadSchema)) body: ConvertLeadInput) {
    return this.service.convert(id, body);
  }
}
