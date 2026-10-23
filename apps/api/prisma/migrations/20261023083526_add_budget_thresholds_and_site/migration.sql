-- AlterTable
ALTER TABLE "ProjectBudget" ADD COLUMN     "siteId" UUID;

-- AlterTable
ALTER TABLE "ProjectBudgetLine" ADD COLUMN     "siteId" UUID;

-- CreateTable
CREATE TABLE "BudgetThreshold" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "projectId" UUID,
    "budgetId" UUID,
    "siteId" UUID,
    "costHeadId" UUID,
    "scopeType" TEXT NOT NULL DEFAULT 'PROJECT',
    "warningPercent" DECIMAL(5,2) NOT NULL DEFAULT 80,
    "criticalPercent" DECIMAL(5,2) NOT NULL DEFAULT 95,
    "hardStopPercent" DECIMAL(5,2) NOT NULL DEFAULT 100,
    "hardStopEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetThreshold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BudgetThreshold_organizationId_projectId_scopeType_isActive_idx" ON "BudgetThreshold"("organizationId", "projectId", "scopeType", "isActive");

-- CreateIndex
CREATE INDEX "BudgetThreshold_organizationId_budgetId_idx" ON "BudgetThreshold"("organizationId", "budgetId");

-- AddForeignKey
ALTER TABLE "BudgetThreshold" ADD CONSTRAINT "BudgetThreshold_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
