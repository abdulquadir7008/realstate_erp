-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "userId" UUID;

-- CreateIndex
CREATE INDEX "Customer_organizationId_userId_idx" ON "Customer"("organizationId", "userId");
