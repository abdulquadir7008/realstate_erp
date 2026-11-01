import { Module } from '@nestjs/common';
import { ProjectAnalyticsController } from './project-analytics.controller';
import { ProjectAnalyticsService } from './project-analytics.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [ProjectAnalyticsController],
  providers: [ProjectAnalyticsService, PrismaService],
  exports: [ProjectAnalyticsService],
})
export class ProjectAnalyticsModule {}