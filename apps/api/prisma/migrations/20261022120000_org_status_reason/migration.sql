-- Record why an organization was suspended, rejected or cancelled.
ALTER TABLE "Organization" ADD COLUMN "statusReason" TEXT;
