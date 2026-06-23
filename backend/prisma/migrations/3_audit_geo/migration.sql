-- Add geolocation (city/country) to audit log entries
ALTER TABLE "AuditLog"
  ADD COLUMN "city" TEXT,
  ADD COLUMN "country" TEXT;
