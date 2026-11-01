import 'reflect-metadata';
import { Controller, Post, Body, Param, Get, UseGuards } from '@nestjs/common';
import { QHSELifecycleService } from './qhse-lifecycle.service';
import { AuthGuard, RolesGuard } from '../../common/guards';

@Controller('qhse-lifecycle')
@UseGuards(AuthGuard, RolesGuard)
export class QHSELifecycleController {
  constructor(private readonly qhseLifecycleService: QHSELifecycleService) {}

  // ---------------- QHSE Workflow Initialization

  @Post('initialize')
  async initializeQHSEWorkflow(@Body() input: {
    projectId: string;
    inspectionId?: string;
    ncrId?: string;
    incidentId?: string;
    actionType: 'INSPECTION' | 'NCR' | 'INCIDENT' | 'COMPLIANCE';
    description: string;
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    assignedTo?: string;
    dueDate?: Date;
  }) {
    return this.qhseLifecycleService.initializeQHSEWorkflow(input);
  }

  // ---------------- Get QHSE Compliance Status

  @Get('compliance-status/:projectId')
  async getQHSEComplianceStatus(@Param('projectId') projectId: string) {
    return this.qhseLifecycleService.getQHSEComplianceStatus(projectId);
  }

  // ---------------- Close QHSE Item

  @Post('close')
  async closeQHSEItem(@Body() input: {
    itemId: string;
    itemType: 'INSPECTION' | 'NCR' | 'INCIDENT';
    closureNotes: string;
    closedBy: string;
  }) {
    return this.qhseLifecycleService.closeQHSEItem(input);
  }
}