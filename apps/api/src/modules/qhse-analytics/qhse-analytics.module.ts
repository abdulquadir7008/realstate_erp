import { Module } from '@nestjs/common';
import { QhseAnalyticsController } from './qhse-analytics.controller';
import { QhseAnalyticsService } from './qhse-analytics.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [QhseAnalyticsController],
  providers: [QhseAnalyticsService, PrismaService],
  exports: [QhseAnalyticsService],
})
export class QhseAnalyticsModule {}