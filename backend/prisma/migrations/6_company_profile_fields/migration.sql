-- Richer company profile fields
ALTER TABLE "Company"
  ADD COLUMN "postalCode" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "website" TEXT;
