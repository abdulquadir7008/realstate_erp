-- CreateEnum
CREATE TYPE "WBSStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WBSItemType" AS ENUM ('SUMMARY', 'WORK_PACKAGE', 'MILESTONE');

-- CreateEnum
CREATE TYPE "WBSBaselineStatus" AS ENUM ('PROPOSED', 'APPROVED', 'SUPERSEDED');

-- CreateTable
CREATE TABLE "Site" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "areaSqft" DECIMAL(12,2),
    "startDate" DATE,
    "endDate" DATE,
    "status" TEXT NOT NULL DEFAULT 'PLANNING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WBS" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "siteId" UUID,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "WBSStatus" NOT NULL DEFAULT 'DRAFT',
    "baselineStatus" "WBSBaselineStatus" NOT NULL DEFAULT 'PROPOSED',
    "startDate" DATE,
    "endDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WBS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WBSItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "wbsId" UUID NOT NULL,
    "parentId" UUID,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "WBSItemType" NOT NULL DEFAULT 'WORK_PACKAGE',
    "order" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "quantity" DECIMAL(12,3),
    "unit" TEXT,
    "uom" TEXT,
    "startDate" DATE,
    "endDate" DATE,
    "plannedCost" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "actualCost" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "committedCost" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WBSItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WBSVersion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "wbsId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "baselineStatus" "WBSBaselineStatus" NOT NULL DEFAULT 'PROPOSED',
    "approvedBy" UUID,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WBSVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Site_organizationId_projectId_idx" ON "Site"("organizationId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Site_projectId_code_key" ON "Site"("projectId", "code");

-- CreateIndex
CREATE INDEX "WBS_organizationId_projectId_status_idx" ON "WBS"("organizationId", "projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WBS_projectId_code_key" ON "WBS"("projectId", "code");

-- CreateIndex
CREATE INDEX "WBSItem_wbsId_parentId_order_idx" ON "WBSItem"("wbsId", "parentId", "order");

-- CreateIndex
CREATE INDEX "WBSItem_organizationId_wbsId_idx" ON "WBSItem"("organizationId", "wbsId");

-- CreateIndex
CREATE INDEX "WBSVersion_organizationId_wbsId_idx" ON "WBSVersion"("organizationId", "wbsId");

-- CreateIndex
CREATE UNIQUE INDEX "WBSVersion_wbsId_version_key" ON "WBSVersion"("wbsId", "version");

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WBS" ADD CONSTRAINT "WBS_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WBS" ADD CONSTRAINT "WBS_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WBSItem" ADD CONSTRAINT "WBSItem_wbsId_fkey" FOREIGN KEY ("wbsId") REFERENCES "WBS"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WBSItem" ADD CONSTRAINT "WBSItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "WBSItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WBSVersion" ADD CONSTRAINT "WBSVersion_wbsId_fkey" FOREIGN KEY ("wbsId") REFERENCES "WBS"("id") ON DELETE CASCADE ON UPDATE CASCADE;
