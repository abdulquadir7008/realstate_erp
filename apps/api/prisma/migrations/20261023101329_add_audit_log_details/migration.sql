-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "after" JSONB,
ADD COLUMN     "before" JSONB,
ADD COLUMN     "correlationId" TEXT;

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_correlationId_idx" ON "AuditLog"("organizationId", "correlationId");
