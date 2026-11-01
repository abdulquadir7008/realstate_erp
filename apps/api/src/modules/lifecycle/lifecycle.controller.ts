import 'reflect-metadata';
import { Controller, Post, Body, Param, Get, UseGuards } from '@nestjs/common';
import { LifecycleService } from './lifecycle.service';
import { AuthGuard, RolesGuard } from '../../common/guards';

@Controller('lifecycle')
@UseGuards(AuthGuard, RolesGuard)
export class LifecycleController {
  constructor(private readonly lifecycleService: LifecycleService) {}

  // ---------------- Tender to Project Conversion

  @Post('tender/convert')
  async convertTenderToProject(@Body() input: {
    tenderId: string;
    projectCode: string;
    projectName: string;
    projectDescription?: string;
    overrideBudget?: number;
  }) {
    return this.lifecycleService.convertTenderToProject(input);
  }

  @Get('tender/flow/:tenderId')
  async getTenderToProjectFlow(@Param('tenderId') tenderId: string) {
    // Would query the conversion status
    return this.lifecycleService.convertTenderToProject({
      tenderId,
      projectCode: 'PRJ-' + tenderId.substring(0, 6).toUpperCase(),
      projectName: 'Converted Project',
      projectDescription: 'Project converted from tender',
    });
  }

  // ---------------- BOQ Cost Tracking

  @Get('boq/cost-tracking/:boqId')
  async getBOQCostTracking(@Param('boqId') boqId: string) {
    return this.lifecycleService.getBOQCostTracking(boqId);
  }

  // ---------------- Project Cost Commitment

  @Post('project/commit-cost')
  async commitProjectCost(@Body() input: {
    projectId: string;
    boqLineId?: string;
    description: string;
    amount: number;
    costHead: 'LABOUR' | 'MATERIAL' | 'SUBCONTRACTOR' | 'OVERHEAD';
    referenceId?: string;
    referenceType: 'PO' | 'INVOICE' | 'PAYMENT' | 'MANUAL';
  }) {
    return this.lifecycleService.commitProjectCost(input);
  }

  // ---------------- Project Budget Overview

  @Get('project/budget-overview/:projectId')
  async getProjectBudgetOverview(@Param('projectId') projectId: string) {
    return this.lifecycleService.getProjectBudgetOverview(projectId);
  }

  // ---------------- Tender to Project Flow Query

  @Get('tender/:tenderId/conversion-status')
  async getTenderConversionStatus(@Param('tenderId') tenderId: string) {
    const tender = await this.prisma.tender.findFirst({
      where: { id: tenderId },
      include: { boq: true },
    });
    if (!tender) throw new NotFoundException('Tender not found');

    const project = await this.prisma.project.findFirst({
      where: { code: 'PRJ-' + tenderId.substring(0, 6).toUpperCase() },
    });

    return {
      tenderId: tender.id,
      tenderCode: tender.code,
      tenderStatus: tender.status,
      boqId: tender.boq?.id,
      boqTotalAmount: tender.boq?.totalAmount,
      projectId: project?.id,
      projectCode: project?.code,
      projectStatus: project?.status,
      conversionStatus: project ? 'CONVERTED' : 'PENDING',
      convertedAt: project ? project.updatedAt : null,
    };
  }
}