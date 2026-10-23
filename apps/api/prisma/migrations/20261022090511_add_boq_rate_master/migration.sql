-- CreateEnum
CREATE TYPE "BOQStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "BOQLineType" AS ENUM ('MATERIAL', 'LABOUR', 'EQUIPMENT', 'SUBCONTRACTOR', 'OTHER');

-- CreateEnum
CREATE TYPE "RateType" AS ENUM ('MATERIAL', 'LABOUR', 'EQUIPMENT', 'SUBCONTRACTOR', 'OTHER');

-- CreateEnum
CREATE TYPE "RateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "BOQ" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "wbsId" UUID,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "BOQStatus" NOT NULL DEFAULT 'DRAFT',
    "baselineStatus" "WBSBaselineStatus" NOT NULL DEFAULT 'PROPOSED',
    "totalAmount" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "startDate" DATE,
    "endDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BOQ_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BOQLine" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "boqId" UUID NOT NULL,
    "wbsItemId" UUID,
    "parentId" UUID,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "BOQLineType" NOT NULL DEFAULT 'MATERIAL',
    "order" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "uom" TEXT,
    "rateId" UUID,
    "rate" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "startDate" DATE,
    "endDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BOQLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BOQVersion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "boqId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "baselineStatus" "WBSBaselineStatus" NOT NULL DEFAULT 'PROPOSED',
    "approvedBy" UUID,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BOQVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateMaster" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "RateType" NOT NULL DEFAULT 'MATERIAL',
    "unit" TEXT NOT NULL,
    "uom" TEXT,
    "baseRate" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "status" "RateStatus" NOT NULL DEFAULT 'DRAFT',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RateMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateVersion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "rateMasterId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "baseRate" DECIMAL(16,2) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "status" "RateStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedBy" UUID,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BOQ_organizationId_projectId_status_idx" ON "BOQ"("organizationId", "projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BOQ_projectId_code_key" ON "BOQ"("projectId", "code");

-- CreateIndex
CREATE INDEX "BOQLine_boqId_parentId_order_idx" ON "BOQLine"("boqId", "parentId", "order");

-- CreateIndex
CREATE INDEX "BOQLine_organizationId_boqId_idx" ON "BOQLine"("organizationId", "boqId");

-- CreateIndex
CREATE INDEX "BOQLine_rateId_idx" ON "BOQLine"("rateId");

-- CreateIndex
CREATE INDEX "BOQVersion_organizationId_boqId_idx" ON "BOQVersion"("organizationId", "boqId");

-- CreateIndex
CREATE UNIQUE INDEX "BOQVersion_boqId_version_key" ON "BOQVersion"("boqId", "version");

-- CreateIndex
CREATE INDEX "RateMaster_organizationId_type_status_idx" ON "RateMaster"("organizationId", "type", "status");

-- CreateIndex
CREATE INDEX "RateMaster_effectiveFrom_effectiveTo_idx" ON "RateMaster"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "RateMaster_organizationId_code_key" ON "RateMaster"("organizationId", "code");

-- CreateIndex
CREATE INDEX "RateVersion_organizationId_rateMasterId_idx" ON "RateVersion"("organizationId", "rateMasterId");

-- CreateIndex
CREATE UNIQUE INDEX "RateVersion_rateMasterId_version_key" ON "RateVersion"("rateMasterId", "version");

-- AddForeignKey
ALTER TABLE "BOQ" ADD CONSTRAINT "BOQ_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOQ" ADD CONSTRAINT "BOQ_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOQ" ADD CONSTRAINT "BOQ_wbsId_fkey" FOREIGN KEY ("wbsId") REFERENCES "WBS"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOQLine" ADD CONSTRAINT "BOQLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOQLine" ADD CONSTRAINT "BOQLine_boqId_fkey" FOREIGN KEY ("boqId") REFERENCES "BOQ"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOQLine" ADD CONSTRAINT "BOQLine_wbsItemId_fkey" FOREIGN KEY ("wbsItemId") REFERENCES "WBSItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOQLine" ADD CONSTRAINT "BOQLine_rateId_fkey" FOREIGN KEY ("rateId") REFERENCES "RateMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOQLine" ADD CONSTRAINT "BOQLine_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "BOQLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOQVersion" ADD CONSTRAINT "BOQVersion_boqId_fkey" FOREIGN KEY ("boqId") REFERENCES "BOQ"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateMaster" ADD CONSTRAINT "RateMaster_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateVersion" ADD CONSTRAINT "RateVersion_rateMasterId_fkey" FOREIGN KEY ("rateMasterId") REFERENCES "RateMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateVersion" ADD CONSTRAINT "RateVersion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
