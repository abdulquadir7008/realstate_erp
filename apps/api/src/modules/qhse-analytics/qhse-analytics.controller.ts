import 'reflect-metadata';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QhseAnalyticsService } from './qhse-analytics.service';

@Controller('qhse-analytics')
export class QhseAnalyticsController {
  constructor(private readonly qhseAnalyticsService: QhseAnalyticsService) {}

  @Get('summary')
  async getAnalyticsSummary(
    @Query('projectId') projectId?: string,
    @Query('from') from?: Date,
    @Query('to') to?: Date
  ) {
    return this.qhseAnalyticsService.getAnalyticsSummary(projectId, from, to);
  }
}