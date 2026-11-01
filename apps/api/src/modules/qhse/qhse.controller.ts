import 'reflect-metadata';
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { QhseService } from './qhse.service';
import { InspectionListQuery, NCRListQuery, IncidentListQuery } from './qhse.service';

@Controller('qhse')
@UseGuards(AuthGuard, RolesGuard)
export class QhseController {
  constructor(private readonly qhseService: QhseService) {}

  // ---------------- Inspections

  @Get('inspections')
  async listInspections(@Query() q: InspectionListQuery) {
    return this.qhseService.listInspections(q);
  }

  @Post('inspections')
  async createInspection(@Body() input: {
    projectId: string;
    title: string;
    description?: string;
    type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'SPECIAL';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    location?: string;
    scheduledDate: Date;
    reportedBy: string;
  }) {
    return this.qhseService.createInspection(input);
  }

  @Get('inspections/:id')
  async getInspection(@Param('id') id: string) {
    return this.qhseService.getInspection(id);
  }

  @Put('inspections/:id')
  async updateInspection(@Param('id') id: string, @Body() input: Partial<{
    title: string;
    description?: string;
    type?: string;
    severity?: string;
    status?: string;
    location?: string;
    scheduledDate?: Date;
    completedDate?: Date;
    findings?: string;
    correctiveActions?: string;
    approvedBy?: string;
  }>) {
    return this.qhseService.updateInspection(id, input);
  }

  @Put('inspections/:id/close')
  async closeInspection(@Param('id') id: string, @Body() input: {
    approvedBy: string;
    findings: string;
    correctiveActions: string;
  }) {
    return this.qhseService.closeInspection(id, input.approvedBy, input.findings, input.correctiveActions);
  }

  // ---------------- NCR (Non-Conformance Reports)

  @Get('ncr')
  async listNCRs(@Query() q: NCRListQuery) {
    return this.qhseService.listNCRs(q);
  }

  @Post('ncr')
  async createNCR(@Body() input: {
    projectId: string;
    title: string;
    description: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    reportedBy: string;
  }) {
    return this.qhseService.createNCR(input);
  }

  @Get('ncr/:id')
  async getNCR(@Param('id') id: string) {
    return this.qhseService.getNCR(id);
  }

  @Put('ncr/:id')
  async updateNCR(@Param('id') id: string, @Body() input: Partial<{
    title?: string;
    description?: string;
    severity?: string;
    status?: string;
    assignedTo?: string;
    rootCause?: string;
    correctiveAction?: string;
    verifiedBy?: string;
    closedDate?: Date;
  }>) {
    return this.qhseService.updateNCR(id, input);
  }

  @Put('ncr/:id/close')
  async closeNCR(@Param('id') id: string, @Body() input: {
    rootCause: string;
    correctiveAction: string;
    verifiedBy: string;
  }) {
    return this.qhseService.closeNCR(id, input.rootCause, input.correctiveAction, input.verifiedBy);
  }

  // ---------------- Incidents

  @Get('incidents')
  async listIncidents(@Query() q: IncidentListQuery) {
    return this.qhseService.listIncidents(q);
  }

  @Post('incidents')
  async createIncident(@Body() input: {
    projectId: string;
    title: string;
    description: string;
    type: 'SAFETY' | 'QUALITY' | 'ENVIRONMENT' | 'SECURITY';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    reportedBy: string;
  }) {
    return this.qhseService.createIncident(input);
  }

  @Get('incidents/:id')
  async getIncident(@Param('id') id: string) {
    return this.qhseService.getIncident(id);
  }

  @Put('incidents/:id')
  async updateIncident(@Param('id') id: string, @Body() input: Partial<{
    title?: string;
    description?: string;
    status?: string;
    severity?: string;
    assignedTo?: string;
    resolvedDate?: Date;
    closedDate?: Date;
  }>) {
    return this.qhseService.updateIncident(id, input);
  }

  @Put('incidents/:id/resolve')
  async resolveIncident(@Param('id') id: string, @Body() input: {
    resolvedBy: string;
    resolutionNotes: string;
  }) {
    return this.qhseService.resolveIncident(id, input.resolvedBy, input.resolutionNotes);
  }

  @Put('incidents/:id/close')
  async closeIncident(@Param('id') id: string, @Body() input: {
    closedBy: string;
    closureNotes: string;
  }) {
    return this.qhseService.closeIncident(id, input.closedBy, input.closureNotes);
  }

  // ---------------- QHSE Dashboard

  @Get('dashboard/summary')
  async getQHSDashboardSummary(@Query('projectId') projectId?: string) {
    return this.qhseService.getQHSDashboardSummary(projectId);
  }

  // ---------------- Compliance Report

  @Get('report/compliance')
  async generateComplianceReport(@Query('projectId') projectId?: string, @Query('from') from?: Date, @Query('to') to?: Date) {
    return this.qhseService.generateComplianceReport(projectId, from, to);
  }
}