import 'reflect-metadata';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ProjectAnalyticsService } from './project-analytics.service';

@Controller('project-analytics')
export class ProjectAnalyticsController {
  constructor(private readonly projectAnalyticsService: ProjectAnalyticsService) {}

  @Get('summary')
  async getAnalyticsSummary(
    @Query('from') from?: Date,
    @Query('to') to?: Date
  ) {
    return this.projectAnalyticsService.getAnalyticsSummary(from, to);
  }
}