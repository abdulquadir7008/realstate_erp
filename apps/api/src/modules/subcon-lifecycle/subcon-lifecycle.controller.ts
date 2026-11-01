import 'reflect-metadata';
import { Controller, Post, Body, Param, Get, UseGuards } from '@nestjs/common';
import { SubconLifecycleService } from './subcon-lifecycle.service';
import { AuthGuard, RolesGuard } from '../../common/guards';

@Controller('subcon-lifecycle')
@UseGuards(AuthGuard, RolesGuard)
export class SubconLifecycleController {
  constructor(private readonly subconLifecycleService: SubconLifecycleService) {}

  // ---------------- Subcontractor Workflow Initialization

  @Post('initialize')
  async initializeSubconWorkflow(@Body() input: {
    workOrderId: string;
    poId: string;
    retentionRate?: number;
    billedAmount: number;
    retentionAmount: number;
    netAmount: number;
    status?: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'PAID' | 'RELEASED';
    notes?: string;
  }) {
    return this.subconLifecycleService.initializeSubconWorkflow(input);
  }

  // ---------------- Get Subcontractor Payment Summary

  @Get('payment-summary/:workOrderId')
  async getSubconPaymentSummary(@Param('workOrderId') workOrderId: string) {
    return this.subconLifecycleService.getSubconPaymentSummary(workOrderId);
  }

  // ---------------- Release Retention

  @Post('retention/release')
  async releaseRetention(@Body() input: {
    retentionId: string;
    releasedAmount: number;
    releaseReason: string;
    releasedBy: string;
  }) {
    return this.subconLifecycleService.releaseRetention(input);
  }
}