import 'reflect-metadata';
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { Fld001Service } from './fld-001.service';
import { FieldFormListQuery } from './fld-001.service';

@Controller('fld-001')
@UseGuards(AuthGuard, RolesGuard)
export class Fld001Controller {
  constructor(private readonly fld001Service: Fld001Service) {}

  // ---------------- field forms list

  @Get()
  async listForms(@Query() q: FieldFormListQuery) {
    return this.fld001Service.listForms(q);
  }

  // ---------------- field form create

  @Post()
  async createForm(@Body() input: {
    formType: 'DAILY_REPORT' | 'SAFETY_CHECK' | 'PROGRESS_BILL' | 'ATTENDANCE' | 'INSPECTION' | 'CUSTOM';
    projectId: string;
    title: string;
    data: Record<string, any>;
    submittedBy: string;
  }) {
    return this.fld001Service.createForm(input);
  }

  // ---------------- field form get

  @Get(':id')
  async getForm(@Param('id') id: string) {
    return this.fld001Service.getForm(id);
  }

  // ---------------- field form update

  @Put(':id')
  async updateForm(@Param('id') id: string, @Body() input: Partial<{
    title: string;
    data?: Record<string, any>;
    status?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  }>) {
    return this.fld001Service.updateForm(id, input);
  }

  // ---------------- form submission (with offline support)

  @Put(':id/submit')
  async submitForm(@Param('id') id: string, @Body() input: {
    submittedBy: string;
    offlineMode: boolean;
    gpsLocation?: { latitude: number; longitude: number; accuracy: number };
    photos?: { fileName: string; storageKey: string; mimeType: string }[];
  }) {
    return this.fld001Service.submitForm(id, input.submittedBy, input);
  }

  // ---------------- form approval

  @Put(':id/approve')
  async approveForm(@Param('id') id: string, @Body() input: { approvedBy: string }) {
    return this.fld001Service.approveForm(id, input.approvedBy);
  }

  // ---------------- form rejection

  @Put(':id/reject')
  async rejectForm(@Param('id') id: string, @Body() input: {
    approvedBy: string;
    rejectionReason: string;
  }) {
    return this.fld001Service.rejectForm(id, input.approvedBy, input.rejectionReason);
  }

  // ---------------- forms by type

  @Get('type/:formType')
  async listFormsByType(@Param('formType') formType: string, @Query('projectId') projectId?: string) {
    return this.fld001Service.listFormsByType(formType, projectId);
  }

  // ---------------- forms by project

  @Get('project/:projectId')
  async listFormsByProject(@Param('projectId') projectId: string) {
    return this.fld001Service.listFormsByProject(projectId);
  }

  // ---------------- forms by employee

  @Get('employee/:employeeId')
  async listFormsByEmployee(@Param('employeeId') employeeId: string, @Query('from') from?: Date, @Query('to') to?: Date) {
    return this.fld001Service.listFormsByEmployee(employeeId, from, to);
  }

  // ---------------- offline sync handler

  @Post('sync/handle')
  async handleOfflineSync(@Body() input: {
    userId: string;
    formIds: string[];
  }) {
    return this.fld001Service.handleOfflineSync(input.userId, input.formIds);
  }

  // ---------------- get forms pending sync

  @Get('sync/pending')
  async getFormsPendingSync() {
    return this.fld001Service.getFormsPendingSync();
  }
}