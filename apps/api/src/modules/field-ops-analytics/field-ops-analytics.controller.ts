import 'reflect-metadata';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { FieldOpsAnalyticsService } from './field-ops-analytics.service';

@Controller('field-ops-analytics')
export class FieldOpsAnalyticsController {
  constructor(private readonly fieldOpsAnalyticsService: FieldOpsAnalyticsService) {}

  @Get('summary')
  async getAnalyticsSummary(
    @Query('from') from?: Date,
    @Query('to') to?: Date
  ) {
    return this.fieldOpsAnalyticsService.getAnalyticsSummary(from, to);
  }
}