-- Company official-registry verification fields
ALTER TABLE "Company"
  ADD COLUMN "ideNumber" TEXT,
  ADD COLUMN "vatNumber" TEXT,
  ADD COLUMN "registryData" JSONB,
  ADD COLUMN "verifiedAt" TIMESTAMP(3);
