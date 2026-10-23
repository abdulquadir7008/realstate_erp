import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { RequirePermissions } from '../../common/decorators';
import { ZodValidationPipe, parseQuery } from '../../common/pipes/zod-validation.pipe';
import {
  paginationSchema,
  costHeadSchema,
  updateCostHeadSchema,
  budgetSchema,
  updateBudgetSchema,
  budgetRevisionSchema,
  budgetRevisionDecisionSchema,
  budgetCommitmentSchema,
  releaseCommitmentSchema,
  costLedgerEntrySchema,
  budgetCheckSchema,
  resolveBudgetAlertSchema,
  budgetThresholdSchema,
  updateBudgetThresholdSchema,
  budgetThresholdQuerySchema,
  budgetQuerySchema,
  budgetLineQuerySchema,
  commitmentQuerySchema,
  ledgerQuerySchema,
  alertQuerySchema,
} from '@re/shared';
import { BudgetService } from './budget.service';

const costHeadQuerySchema = paginationSchema.extend({
  projectId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
  isActive: z
    .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
    .transform((value) => (typeof value === 'boolean' ? value : value === 'true' || value === '1'))
    .optional(),
});

@ApiTags('Cost Heads')
@Controller('cost-heads')
export class CostHeadController {
  constructor(private readonly service: BudgetService) {}

  @Get()
  @RequirePermissions('budget:read')
  list(@Query() q: unknown) {
    return this.service.listCostHeads(parseQuery(costHeadQuerySchema, q));
  }

  @Post()
  @RequirePermissions('budget:create')
  create(@Body(new ZodValidationPipe(costHeadSchema)) body: any) {
    return this.service.createCostHead(body);
  }

  @Get(':id')
  @RequirePermissions('budget:read')
  get(@Param('id') id: string) {
    return this.service.getCostHead(id);
  }

  @Patch(':id')
  @RequirePermissions('budget:update')
  update(@Param('id') id: string, @Body(new ZodValidationPipe(updateCostHeadSchema)) body: any) {
    return this.service.updateCostHead(id, body);
  }

  @Delete(':id')
  @RequirePermissions('budget:delete')
  remove(@Param('id') id: string) {
    return this.service.removeCostHead(id);
  }
}

@ApiTags('Budgets')
@Controller('budgets')
export class BudgetController {
  constructor(private readonly service: BudgetService) {}

  @Get()
  @RequirePermissions('budget:read')
  list(@Query() q: unknown) {
    return this.service.listBudgets(parseQuery(budgetQuerySchema, q));
  }

  @Post()
  @RequirePermissions('budget:create')
  create(@Body(new ZodValidationPipe(budgetSchema)) body: any) {
    return this.service.createBudget(body);
  }

  @Get('dashboard')
  @RequirePermissions('budget:read')
  dashboard(@Query() q: unknown) {
    const query = parseQuery(paginationSchema.extend({ projectId: z.string().uuid().optional() }), q);
    return this.service.getDashboard(query.projectId);
  }

  @Post('check')
  @RequirePermissions('budget:read')
  check(@Body(new ZodValidationPipe(budgetCheckSchema)) body: any) {
    return this.service.checkAvailability(body);
  }

  @Get('lines')
  @RequirePermissions('budget:read')
  listLines(@Query() q: unknown) {
    return this.service.listBudgetLines(parseQuery(budgetLineQuerySchema, q));
  }

  @Get(':id')
  @RequirePermissions('budget:read')
  get(@Param('id') id: string) {
    return this.service.getBudget(id);
  }

  @Patch(':id')
  @RequirePermissions('budget:update')
  update(@Param('id') id: string, @Body(new ZodValidationPipe(updateBudgetSchema)) body: any) {
    return this.service.updateBudget(id, body);
  }

  @Delete(':id')
  @RequirePermissions('budget:delete')
  remove(@Param('id') id: string) {
    return this.service.deleteBudget(id);
  }

  @Get(':id/summary')
  @RequirePermissions('budget:read')
  summary(@Param('id') id: string) {
    return this.service.getBudgetSummary(id);
  }

  @Get(':id/drilldown')
  @RequirePermissions('budget:read')
  drilldown(@Param('id') id: string, @Query() q: unknown) {
    const query = parseQuery(
      z.object({
        wbsId: z.string().uuid().optional(),
        wbsItemId: z.string().uuid().optional(),
        boqId: z.string().uuid().optional(),
        boqLineId: z.string().uuid().optional(),
        costHeadId: z.string().uuid().optional(),
      }),
      q,
    );
    return this.service.getBudgetDrilldown(id, query);
  }

  @Post(':id/submit')
  @RequirePermissions('budget:update')
  submit(@Param('id') id: string) {
    return this.service.submitBudget(id);
  }

  @Post(':id/activate')
  @RequirePermissions('budget:approve')
  activate(@Param('id') id: string) {
    return this.service.activateBudget(id);
  }

  @Post(':id/lock')
  @RequirePermissions('budget:approve')
  lock(@Param('id') id: string) {
    return this.service.lockBudget(id);
  }

  @Post(':id/unlock')
  @RequirePermissions('budget:approve')
  unlock(@Param('id') id: string) {
    return this.service.unlockBudget(id);
  }

  @Post(':id/archive')
  @RequirePermissions('budget:update')
  archive(@Param('id') id: string) {
    return this.service.archiveBudget(id);
  }

  @Get(':id/revisions')
  @RequirePermissions('budget:read')
  revisions(@Param('id') id: string) {
    return this.service.listRevisions(id);
  }

  @Post(':id/revisions')
  @RequirePermissions('budget:update')
  createRevision(@Param('id') id: string, @Body(new ZodValidationPipe(budgetRevisionSchema)) body: any) {
    return this.service.createRevision(id, body);
  }
}

@ApiTags('Budget Revisions')
@Controller('budget-revisions')
export class BudgetRevisionController {
  constructor(private readonly service: BudgetService) {}

  @Get(':id')
  @RequirePermissions('budget:read')
  get(@Param('id') id: string) {
    return this.service.getRevision(id);
  }

  @Post(':id/submit')
  @RequirePermissions('budget:update')
  submit(@Param('id') id: string) {
    return this.service.submitRevision(id);
  }

  @Post(':id/approve')
  @RequirePermissions('budget:approve')
  approve(@Param('id') id: string) {
    return this.service.approveRevision(id);
  }

  @Post(':id/reject')
  @RequirePermissions('budget:approve')
  reject(@Param('id') id: string, @Body(new ZodValidationPipe(budgetRevisionDecisionSchema)) body: any) {
    return this.service.rejectRevision(id, body.comment);
  }

  @Post(':id/cancel')
  @RequirePermissions('budget:update')
  cancel(@Param('id') id: string) {
    return this.service.cancelRevision(id);
  }
}

@ApiTags('Budget Commitments')
@Controller('budget-commitments')
export class BudgetCommitmentController {
  constructor(private readonly service: BudgetService) {}

  @Get()
  @RequirePermissions('budget:read')
  list(@Query() q: unknown) {
    return this.service.listCommitments(parseQuery(commitmentQuerySchema, q));
  }

  @Post()
  @RequirePermissions('budget:create')
  create(@Body(new ZodValidationPipe(budgetCommitmentSchema)) body: any) {
    return this.service.createCommitment(body);
  }

  @Post(':id/release')
  @RequirePermissions('budget:update')
  release(@Param('id') id: string, @Body(new ZodValidationPipe(releaseCommitmentSchema)) body: any) {
    return this.service.releaseCommitment(id, body.releasedAmount, body.reason);
  }

  @Post(':id/cancel')
  @RequirePermissions('budget:update')
  cancel(@Param('id') id: string) {
    return this.service.cancelCommitment(id);
  }
}

@ApiTags('Project Cost Ledger')
@Controller('budget-ledger')
export class ProjectCostLedgerController {
  constructor(private readonly service: BudgetService) {}

  @Get()
  @RequirePermissions('budget:read')
  list(@Query() q: unknown) {
    return this.service.listLedger(parseQuery(ledgerQuerySchema, q));
  }

  @Post()
  @RequirePermissions('budget:create')
  create(@Body(new ZodValidationPipe(costLedgerEntrySchema)) body: any) {
    return this.service.postLedgerEntry(body);
  }
}

@ApiTags('Budget Alerts')
@Controller('budget-alerts')
export class BudgetAlertController {
  constructor(private readonly service: BudgetService) {}

  @Get()
  @RequirePermissions('budget:read')
  list(@Query() q: unknown) {
    return this.service.listAlerts(parseQuery(alertQuerySchema, q));
  }

  @Post(':id/read')
  @RequirePermissions('budget:read')
  markRead(@Param('id') id: string) {
    return this.service.markAlertRead(id, true);
  }

  @Post(':id/resolve')
  @RequirePermissions('budget:update')
  resolve(@Param('id') id: string, @Body(new ZodValidationPipe(resolveBudgetAlertSchema)) body: any) {
    return this.service.resolveAlert(id, body.resolved);
  }
}

@ApiTags('Budget Thresholds')
@Controller('budget-thresholds')
export class BudgetThresholdController {
  constructor(private readonly service: BudgetService) {}

  @Get()
  @RequirePermissions('budget:read')
  list(@Query() q: unknown) {
    return this.service.listThresholds(parseQuery(budgetThresholdQuerySchema, q));
  }

  @Post()
  @RequirePermissions('budget:update')
  create(@Body(new ZodValidationPipe(budgetThresholdSchema)) body: any) {
    return this.service.createThreshold(body);
  }

  @Patch(':id')
  @RequirePermissions('budget:update')
  update(@Param('id') id: string, @Body(new ZodValidationPipe(updateBudgetThresholdSchema)) body: any) {
    return this.service.updateThreshold(id, body);
  }

  @Delete(':id')
  @RequirePermissions('budget:delete')
  remove(@Param('id') id: string) {
    return this.service.removeThreshold(id);
  }
}
