import 'reflect-metadata';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { HrAnalyticsService } from './hr-analytics.service';

@Controller('hr-analytics')
export class HrAnalyticsController {
  constructor(private readonly hrAnalyticsService: HrAnalyticsService) {}

  @Get('summary')
  async getAnalyticsSummary(
    @Query('from') from?: Date,
    @Query('to') to?: Date
  ) {
    return this.hrAnalyticsService.getAnalyticsSummary(from, to);
  }
}