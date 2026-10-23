import { Module } from '@nestjs/common';
import { BudgetService } from './budget.service';
import {
  BudgetAlertController,
  BudgetCommitmentController,
  BudgetController,
  BudgetRevisionController,
  BudgetThresholdController,
  CostHeadController,
  ProjectCostLedgerController,
} from './budget.controller';

@Module({
  controllers: [
    CostHeadController,
    BudgetController,
    BudgetRevisionController,
    BudgetThresholdController,
    BudgetCommitmentController,
    ProjectCostLedgerController,
    BudgetAlertController,
  ],
  providers: [BudgetService],
  exports: [BudgetService],
})
export class BudgetModule {}

