import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser } from '../../common/decorators';
import { RequirePermissions } from '../../common/decorators';
import { SessionUser } from '@re/shared';
import { ZodValidationPipe, parseQuery } from '../../common/pipes/zod-validation.pipe';
import {
  paginationSchema,
  approvalWorkflowSchema,
  updateApprovalWorkflowSchema,
  approvalThresholdSchema,
  updateApprovalThresholdSchema,
  startApprovalSchema,
  approvalDecisionSchema,
  approvalRejectionSchema,
  approvalDelegationSchema,
  updateApprovalDelegationSchema,
  approvalEscalationRuleSchema,
  updateApprovalEscalationRuleSchema,
  approvalInstanceQuerySchema,
} from '@re/shared';
import { ApprovalService } from './approval.service';

const workflowQuerySchema = paginationSchema.extend({
  entityType: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});
const thresholdQuerySchema = paginationSchema.extend({
  entityType: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});
const delegationQuerySchema = paginationSchema.extend({
  activeOnly: z.coerce.boolean().optional(),
});
const escalationQuerySchema = paginationSchema.extend({
  workflowId: z.string().uuid().optional(),
  isActive: z.coerce.boolean().optional(),
});

@ApiTags('Approvals')
@Controller('approvals')
export class ApprovalController {
  constructor(private readonly service: ApprovalService) {}

  // workflows
  @Get('workflows')
  @RequirePermissions('approval:read')
  listWorkflows(@Query() q: unknown) {
    return this.service.listWorkflows(parseQuery(workflowQuerySchema, q));
  }

  @Post('workflows')
  @RequirePermissions('approval:create')
  createWorkflow(@Body(new ZodValidationPipe(approvalWorkflowSchema)) body: any) {
    return this.service.createWorkflow(body);
  }

  @Get('workflows/:id')
  @RequirePermissions('approval:read')
  getWorkflow(@Param('id') id: string) {
    return this.service.getWorkflow(id);
  }

  @Patch('workflows/:id')
  @RequirePermissions('approval:update')
  updateWorkflow(@Param('id') id: string, @Body(new ZodValidationPipe(updateApprovalWorkflowSchema)) body: any) {
    return this.service.updateWorkflow(id, body);
  }

  @Delete('workflows/:id')
  @RequirePermissions('approval:delete')
  removeWorkflow(@Param('id') id: string) {
    return this.service.removeWorkflow(id);
  }

  // thresholds
  @Get('thresholds')
  @RequirePermissions('approval:read')
  listThresholds(@Query() q: unknown) {
    return this.service.listThresholds(parseQuery(thresholdQuerySchema, q));
  }

  @Post('thresholds')
  @RequirePermissions('approval:create')
  createThreshold(@Body(new ZodValidationPipe(approvalThresholdSchema)) body: any) {
    return this.service.createThreshold(body);
  }

  @Patch('thresholds/:id')
  @RequirePermissions('approval:update')
  updateThreshold(@Param('id') id: string, @Body(new ZodValidationPipe(updateApprovalThresholdSchema)) body: any) {
    return this.service.updateThreshold(id, body);
  }

  @Delete('thresholds/:id')
  @RequirePermissions('approval:delete')
  removeThreshold(@Param('id') id: string) {
    return this.service.removeThreshold(id);
  }

  // delegations
  @Get('delegations')
  @RequirePermissions('approval:read')
  listDelegations(@Query() q: unknown) {
    return this.service.listDelegations(parseQuery(delegationQuerySchema, q));
  }

  @Post('delegations')
  @RequirePermissions('approval:create')
  createDelegation(@Body(new ZodValidationPipe(approvalDelegationSchema)) body: any, @CurrentUser() user: SessionUser) {
    return this.service.createDelegation(body, user);
  }

  @Patch('delegations/:id')
  @RequirePermissions('approval:update')
  updateDelegation(@Param('id') id: string, @Body(new ZodValidationPipe(updateApprovalDelegationSchema)) body: any) {
    return this.service.updateDelegation(id, body);
  }

  @Delete('delegations/:id')
  @RequirePermissions('approval:delete')
  removeDelegation(@Param('id') id: string) {
    return this.service.removeDelegation(id);
  }

  // escalation rules
  @Get('escalation-rules')
  @RequirePermissions('approval:read')
  listEscalationRules(@Query() q: unknown) {
    return this.service.listEscalationRules(parseQuery(escalationQuerySchema, q));
  }

  @Post('escalation-rules')
  @RequirePermissions('approval:create')
  createEscalationRule(@Body(new ZodValidationPipe(approvalEscalationRuleSchema)) body: any) {
    return this.service.createEscalationRule(body);
  }

  @Patch('escalation-rules/:id')
  @RequirePermissions('approval:update')
  updateEscalationRule(@Param('id') id: string, @Body(new ZodValidationPipe(updateApprovalEscalationRuleSchema)) body: any) {
    return this.service.updateEscalationRule(id, body);
  }

  @Delete('escalation-rules/:id')
  @RequirePermissions('approval:delete')
  removeEscalationRule(@Param('id') id: string) {
    return this.service.removeEscalationRule(id);
  }

  // instances
  @Get('instances')
  @RequirePermissions('approval:read')
  listInstances(@Query() q: unknown) {
    return this.service.listInstances(parseQuery(approvalInstanceQuerySchema, q));
  }

  @Post('start')
  @RequirePermissions('approval:create')
  start(@Body(new ZodValidationPipe(startApprovalSchema)) body: any, @CurrentUser() user: SessionUser) {
    return this.service.start(body, user);
  }

  @Get('inbox')
  @RequirePermissions('approval:read')
  inbox(@Query() q: unknown, @CurrentUser() user: SessionUser) {
    return this.service.inbox(user, parseQuery(approvalInstanceQuerySchema, q));
  }

  @Get('my-requests')
  @RequirePermissions('approval:read')
  myRequests(@Query() q: unknown, @CurrentUser() user: SessionUser) {
    return this.service.myRequests(user, parseQuery(approvalInstanceQuerySchema, q));
  }

  @Get('dashboard')
  @RequirePermissions('approval:read')
  dashboard(@CurrentUser() user: SessionUser) {
    return this.service.dashboard(user);
  }

  @Post('escalations/run')
  @RequirePermissions('approval:manage')
  runEscalations(@CurrentUser() user: SessionUser) {
    return this.service.runEscalations(user);
  }

  @Get('instances/:id')
  @RequirePermissions('approval:read')
  getInstance(@Param('id') id: string) {
    return this.service.getInstance(id);
  }

  @Get('instances/:id/history')
  @RequirePermissions('approval:read')
  history(@Param('id') id: string) {
    return this.service.history(id);
  }

  @Post('instances/:id/approve')
  @RequirePermissions('approval:read')
  approve(@Param('id') id: string, @Body(new ZodValidationPipe(approvalDecisionSchema)) body: any, @CurrentUser() user: SessionUser) {
    return this.service.approve(id, body, user);
  }

  @Post('instances/:id/reject')
  @RequirePermissions('approval:read')
  reject(@Param('id') id: string, @Body(new ZodValidationPipe(approvalRejectionSchema)) body: any, @CurrentUser() user: SessionUser) {
    return this.service.reject(id, body, user);
  }

  @Post('instances/:id/return')
  @RequirePermissions('approval:read')
  returnToPrevious(@Param('id') id: string, @Body(new ZodValidationPipe(approvalRejectionSchema)) body: any, @CurrentUser() user: SessionUser) {
    return this.service.returnToPrevious(id, body, user);
  }

  @Post('instances/:id/cancel')
  @RequirePermissions('approval:read')
  cancel(@Param('id') id: string, @Body(new ZodValidationPipe(approvalDecisionSchema)) body: any, @CurrentUser() user: SessionUser) {
    return this.service.cancel(id, body, user);
  }
}
