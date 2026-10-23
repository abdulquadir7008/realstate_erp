-- CreateEnum
CREATE TYPE "BudgetStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'LOCKED', 'SUPERSEDED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BudgetRevisionStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CommitmentStatus" AS ENUM ('PENDING', 'COMMITTED', 'PARTIALLY_CONSUMED', 'CONSUMED', 'RELEASED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LedgerEntrySource" AS ENUM ('MANUAL', 'PURCHASE_ORDER', 'PURCHASE_REQUISITION', 'GOODS_RECEIPT', 'SUBCONTRACTOR_BILL', 'EXPENSE', 'JOURNAL', 'ADJUSTMENT', 'COMMITMENT');

-- CreateEnum
CREATE TYPE "BudgetAlertType" AS ENUM ('WARNING', 'CRITICAL', 'HARD_STOP');

-- CreateTable
CREATE TABLE "CostHead" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" UUID,
    "projectId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostHead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectBudget" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "BudgetStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "totalPlanned" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "totalCommitted" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "totalActual" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "totalForecast" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "contingency" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "baselineDate" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "lockedBy" UUID,
    "approvedBy" UUID,
    "approvedAt" TIMESTAMP(3),
    "createdBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectBudgetLine" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "budgetId" UUID NOT NULL,
    "costHeadId" UUID NOT NULL,
    "wbsId" UUID,
    "wbsItemId" UUID,
    "boqId" UUID,
    "boqLineId" UUID,
    "code" TEXT,
    "description" TEXT,
    "uom" TEXT,
    "quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "plannedRate" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "plannedAmount" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "committedAmount" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "actualAmount" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "forecastAmount" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "variance" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectBudgetLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetRevision" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "budgetId" UUID NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "status" "BudgetRevisionStatus" NOT NULL DEFAULT 'DRAFT',
    "reason" TEXT NOT NULL,
    "justification" TEXT,
    "totalPlannedBefore" DECIMAL(16,2) NOT NULL,
    "totalPlannedAfter" DECIMAL(16,2) NOT NULL,
    "deltaAmount" DECIMAL(16,2) NOT NULL,
    "requestedBy" UUID NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedBy" UUID,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" UUID,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "snapshot" JSONB NOT NULL DEFAULT '{}',
    "changes" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetCommitment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "budgetId" UUID NOT NULL,
    "budgetLineId" UUID,
    "projectId" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "vendorId" UUID,
    "description" TEXT,
    "status" "CommitmentStatus" NOT NULL DEFAULT 'PENDING',
    "committedAmount" DECIMAL(16,2) NOT NULL,
    "consumedAmount" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "releasedAmount" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "committedBy" UUID,
    "committedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetCommitment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectCostLedger" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "budgetId" UUID NOT NULL,
    "budgetLineId" UUID,
    "commitmentId" UUID,
    "projectId" UUID NOT NULL,
    "costHeadId" TEXT,
    "entityType" "LedgerEntrySource" NOT NULL,
    "entityId" TEXT,
    "referenceNumber" TEXT,
    "description" TEXT NOT NULL,
    "debit" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(16,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postedBy" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "ProjectCostLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetAlert" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "budgetId" UUID NOT NULL,
    "budgetLineId" UUID,
    "type" "BudgetAlertType" NOT NULL,
    "threshold" DECIMAL(5,2),
    "message" TEXT NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" UUID,

    CONSTRAINT "BudgetAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CostHead_organizationId_projectId_idx" ON "CostHead"("organizationId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "CostHead_organizationId_code_key" ON "CostHead"("organizationId", "code");

-- CreateIndex
CREATE INDEX "ProjectBudget_organizationId_projectId_status_idx" ON "ProjectBudget"("organizationId", "projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectBudget_projectId_code_key" ON "ProjectBudget"("projectId", "code");

-- CreateIndex
CREATE INDEX "ProjectBudgetLine_budgetId_idx" ON "ProjectBudgetLine"("budgetId");

-- CreateIndex
CREATE INDEX "ProjectBudgetLine_costHeadId_idx" ON "ProjectBudgetLine"("costHeadId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectBudgetLine_budgetId_costHeadId_wbsItemId_key" ON "ProjectBudgetLine"("budgetId", "costHeadId", "wbsItemId");

-- CreateIndex
CREATE INDEX "BudgetRevision_organizationId_budgetId_status_idx" ON "BudgetRevision"("organizationId", "budgetId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetRevision_budgetId_revisionNumber_key" ON "BudgetRevision"("budgetId", "revisionNumber");

-- CreateIndex
CREATE INDEX "BudgetCommitment_organizationId_budgetId_status_idx" ON "BudgetCommitment"("organizationId", "budgetId", "status");

-- CreateIndex
CREATE INDEX "BudgetCommitment_projectId_entityType_entityId_idx" ON "BudgetCommitment"("projectId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "ProjectCostLedger_organizationId_budgetId_postedAt_idx" ON "ProjectCostLedger"("organizationId", "budgetId", "postedAt");

-- CreateIndex
CREATE INDEX "ProjectCostLedger_projectId_postedAt_idx" ON "ProjectCostLedger"("projectId", "postedAt");

-- CreateIndex
CREATE INDEX "ProjectCostLedger_entityType_entityId_idx" ON "ProjectCostLedger"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "BudgetAlert_organizationId_budgetId_isRead_isResolved_idx" ON "BudgetAlert"("organizationId", "budgetId", "isRead", "isResolved");

-- AddForeignKey
ALTER TABLE "CostHead" ADD CONSTRAINT "CostHead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectBudget" ADD CONSTRAINT "ProjectBudget_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectBudget" ADD CONSTRAINT "ProjectBudget_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectBudgetLine" ADD CONSTRAINT "ProjectBudgetLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectBudgetLine" ADD CONSTRAINT "ProjectBudgetLine_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "ProjectBudget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectBudgetLine" ADD CONSTRAINT "ProjectBudgetLine_costHeadId_fkey" FOREIGN KEY ("costHeadId") REFERENCES "CostHead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetRevision" ADD CONSTRAINT "BudgetRevision_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetRevision" ADD CONSTRAINT "BudgetRevision_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "ProjectBudget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetCommitment" ADD CONSTRAINT "BudgetCommitment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetCommitment" ADD CONSTRAINT "BudgetCommitment_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "ProjectBudget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetCommitment" ADD CONSTRAINT "BudgetCommitment_budgetLineId_fkey" FOREIGN KEY ("budgetLineId") REFERENCES "ProjectBudgetLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetCommitment" ADD CONSTRAINT "BudgetCommitment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCostLedger" ADD CONSTRAINT "ProjectCostLedger_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCostLedger" ADD CONSTRAINT "ProjectCostLedger_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "ProjectBudget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCostLedger" ADD CONSTRAINT "ProjectCostLedger_budgetLineId_fkey" FOREIGN KEY ("budgetLineId") REFERENCES "ProjectBudgetLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCostLedger" ADD CONSTRAINT "ProjectCostLedger_commitmentId_fkey" FOREIGN KEY ("commitmentId") REFERENCES "BudgetCommitment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCostLedger" ADD CONSTRAINT "ProjectCostLedger_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetAlert" ADD CONSTRAINT "BudgetAlert_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetAlert" ADD CONSTRAINT "BudgetAlert_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "ProjectBudget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
