import { Module } from '@nestjs/common';
import { ApprovalModule } from '../approval/approval.module';
import { BudgetService } from './budget.service';
import { BudgetAlertNotifier } from './budget-alert-notifier.service';
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
  imports: [ApprovalModule],
  providers: [BudgetService, BudgetAlertNotifier],
  exports: [BudgetService],
})
export class BudgetModule {}

