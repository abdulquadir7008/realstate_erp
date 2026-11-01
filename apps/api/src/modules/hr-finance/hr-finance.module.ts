import { Module } from '@nestjs/common';
import { HrFinanceController } from './hr-finance.controller';
import { HrFinanceService } from './hr-finance.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [HrFinanceController],
  providers: [HrFinanceService, PrismaService],
  exports: [HrFinanceService],
})
export class HrFinanceModule {}