import 'reflect-metadata';
import { Controller, Post, Body, Param, Get, UseGuards } from '@nestjs/common';
import { FieldOpsService } from './field-ops.service';
import { AuthGuard, RolesGuard } from '../../common/guards';

@Controller('field-ops')
@UseGuards(AuthGuard, RolesGuard)
export class FieldOpsController {
  constructor(private readonly fieldOpsService: FieldOpsService) {}

  // ---------------- Field Form Submission with QHSE Integration

  @Post('submit-with-qhse')
  async submitFieldFormWithQHSE(@Body() input: {
    formType: 'DAILY_REPORT' | 'SAFETY_CHECK' | 'PROGRESS_BILL' | 'ATTENDANCE' | 'INSPECTION' | 'CUSTOM';
    projectId: string;
    title: string;
    data: Record<string, any>;
    submittedBy: string;
    gpsLocation?: { latitude: number; longitude: number; accuracy: number };
    photos?: { fileName: string; storageKey: string; mimeType: string }[];
    offlineMode: boolean;
  }) {
    return this.fieldOpsService.submitFieldFormWithQHSE(input);
  }

  // ---------------- Get Form with QHSE Context

  @Get(':formId/qhse-context')
  async getFormWithQHSEContext(@Param('formId') formId: string) {
    return this.fieldOpsService.getFormWithQHSEContext(formId);
  }

  // ---------------- Sync Offline Forms with QHSE

  @Post('sync/offline')
  async syncOfflineFormsWithQHSE(@Body() input: {
    userId: string;
    formIds: string[];
  }) {
    return this.fieldOpsService.syncOfflineFormsWithQHSE(input.userId, input.formIds);
  }
}