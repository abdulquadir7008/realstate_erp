import 'reflect-metadata';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { FinanceAnalyticsService } from './finance-analytics.service';

@Controller('finance-analytics')
export class FinanceAnalyticsController {
  constructor(private readonly financeAnalyticsService: FinanceAnalyticsService) {}

  @Get('summary')
  async getAnalyticsSummary(
    @Query('from') from?: Date,
    @Query('to') to?: Date
  ) {
    return this.financeAnalyticsService.getAnalyticsSummary(from, to);
  }
}