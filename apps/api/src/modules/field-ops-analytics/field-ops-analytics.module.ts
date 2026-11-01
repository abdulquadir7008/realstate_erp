import { Module } from '@nestjs/common';
import { FieldOpsAnalyticsController } from './field-ops-analytics.controller';
import { FieldOpsAnalyticsService } from './field-ops-analytics.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [FieldOpsAnalyticsController],
  providers: [FieldOpsAnalyticsService, PrismaService],
  exports: [FieldOpsAnalyticsService],
})
export class FieldOpsAnalyticsModule {}