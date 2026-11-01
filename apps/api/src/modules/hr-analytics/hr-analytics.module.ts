import { Module } from '@nestjs/common';
import { HrAnalyticsController } from './hr-analytics.controller';
import { HrAnalyticsService } from './hr-analytics.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [HrAnalyticsController],
  providers: [HrAnalyticsService, PrismaService],
  exports: [HrAnalyticsService],
})
export class HrAnalyticsModule {}