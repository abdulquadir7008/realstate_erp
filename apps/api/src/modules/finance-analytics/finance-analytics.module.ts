import { Module } from '@nestjs/common';
import { FinanceAnalyticsController } from './finance-analytics.controller';
import { FinanceAnalyticsService } from './finance-analytics.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [FinanceAnalyticsController],
  providers: [FinanceAnalyticsService, PrismaService],
  exports: [FinanceAnalyticsService],
})
export class FinanceAnalyticsModule {}