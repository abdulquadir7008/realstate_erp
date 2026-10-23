-- CreateEnum
CREATE TYPE "ApproverType" AS ENUM ('USER', 'ROLE', 'PERMISSION');

-- CreateEnum
CREATE TYPE "ApprovalGroupMode" AS ENUM ('ALL', 'ANY');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'RETURNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalStepStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ApprovalActionType" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'RETURNED', 'DELEGATED', 'ESCALATED', 'CANCELLED', 'COMMENTED');

-- CreateEnum
CREATE TYPE "ApprovalThresholdScope" AS ENUM ('ORGANIZATION', 'PROJECT', 'SITE', 'COST_HEAD');

-- CreateEnum
CREATE TYPE "EscalationAction" AS ENUM ('NOTIFY', 'REASSIGN');

-- CreateTable
CREATE TABLE "ApprovalWorkflow" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ApprovalWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalStep" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "workflowId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "approverType" "ApproverType" NOT NULL,
    "approverRole" TEXT,
    "approverUserId" UUID,
    "approverPermission" TEXT,
    "groupMode" "ApprovalGroupMode" NOT NULL DEFAULT 'ALL',
    "requiredApprovals" INTEGER NOT NULL DEFAULT 1,
    "slaHours" INTEGER,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalThreshold" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "scopeType" "ApprovalThresholdScope" NOT NULL DEFAULT 'ORGANIZATION',
    "scopeId" UUID,
    "workflowId" UUID NOT NULL,
    "minAmount" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "maxAmount" DECIMAL(16,2),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalThreshold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalInstance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "workflowId" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "projectId" UUID,
    "siteId" UUID,
    "amount" DECIMAL(16,2),
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "currentSequence" INTEGER NOT NULL DEFAULT 1,
    "requestedBy" UUID NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalInstanceStep" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "instanceId" UUID NOT NULL,
    "templateStepId" UUID,
    "sequence" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "approverType" "ApproverType" NOT NULL,
    "approverRole" TEXT,
    "approverUserId" UUID,
    "approverPermission" TEXT,
    "groupMode" "ApprovalGroupMode" NOT NULL DEFAULT 'ALL',
    "requiredApprovals" INTEGER NOT NULL DEFAULT 1,
    "status" "ApprovalStepStatus" NOT NULL DEFAULT 'PENDING',
    "decidedAt" TIMESTAMP(3),
    "decidedBy" UUID,
    "delegatedFrom" UUID,
    "escalatedAt" TIMESTAMP(3),
    "escalationCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalInstanceStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalHistory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "instanceId" UUID NOT NULL,
    "instanceStepId" UUID,
    "sequence" INTEGER,
    "action" "ApprovalActionType" NOT NULL,
    "actorId" UUID,
    "delegateId" UUID,
    "comment" TEXT,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalDelegation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "delegatorId" UUID NOT NULL,
    "delegateId" UUID NOT NULL,
    "entityType" TEXT,
    "workflowId" UUID,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "createdBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalDelegation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalEscalationRule" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "workflowId" UUID NOT NULL,
    "stepSequence" INTEGER,
    "afterHours" INTEGER NOT NULL,
    "action" "EscalationAction" NOT NULL DEFAULT 'NOTIFY',
    "escalateToUserId" UUID,
    "escalateToRole" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalEscalationRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApprovalWorkflow_organizationId_entityType_isActive_idx" ON "ApprovalWorkflow"("organizationId", "entityType", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalWorkflow_organizationId_code_key" ON "ApprovalWorkflow"("organizationId", "code");

-- CreateIndex
CREATE INDEX "ApprovalStep_workflowId_sequence_idx" ON "ApprovalStep"("workflowId", "sequence");

-- CreateIndex
CREATE INDEX "ApprovalThreshold_organizationId_entityType_scopeType_prior_idx" ON "ApprovalThreshold"("organizationId", "entityType", "scopeType", "priority");

-- CreateIndex
CREATE INDEX "ApprovalThreshold_workflowId_idx" ON "ApprovalThreshold"("workflowId");

-- CreateIndex
CREATE INDEX "ApprovalInstance_organizationId_status_currentSequence_idx" ON "ApprovalInstance"("organizationId", "status", "currentSequence");

-- CreateIndex
CREATE INDEX "ApprovalInstance_organizationId_requestedBy_status_idx" ON "ApprovalInstance"("organizationId", "requestedBy", "status");

-- CreateIndex
CREATE INDEX "ApprovalInstance_entityType_entityId_idx" ON "ApprovalInstance"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ApprovalInstanceStep_instanceId_sequence_status_idx" ON "ApprovalInstanceStep"("instanceId", "sequence", "status");

-- CreateIndex
CREATE INDEX "ApprovalHistory_instanceId_createdAt_idx" ON "ApprovalHistory"("instanceId", "createdAt");

-- CreateIndex
CREATE INDEX "ApprovalDelegation_organizationId_delegatorId_isActive_idx" ON "ApprovalDelegation"("organizationId", "delegatorId", "isActive");

-- CreateIndex
CREATE INDEX "ApprovalDelegation_organizationId_delegateId_isActive_idx" ON "ApprovalDelegation"("organizationId", "delegateId", "isActive");

-- CreateIndex
CREATE INDEX "ApprovalEscalationRule_workflowId_isActive_idx" ON "ApprovalEscalationRule"("workflowId", "isActive");

-- AddForeignKey
ALTER TABLE "ApprovalWorkflow" ADD CONSTRAINT "ApprovalWorkflow_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ApprovalWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalThreshold" ADD CONSTRAINT "ApprovalThreshold_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalThreshold" ADD CONSTRAINT "ApprovalThreshold_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ApprovalWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalInstance" ADD CONSTRAINT "ApprovalInstance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalInstance" ADD CONSTRAINT "ApprovalInstance_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ApprovalWorkflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalInstanceStep" ADD CONSTRAINT "ApprovalInstanceStep_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "ApprovalInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalHistory" ADD CONSTRAINT "ApprovalHistory_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "ApprovalInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalDelegation" ADD CONSTRAINT "ApprovalDelegation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalEscalationRule" ADD CONSTRAINT "ApprovalEscalationRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalEscalationRule" ADD CONSTRAINT "ApprovalEscalationRule_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ApprovalWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
