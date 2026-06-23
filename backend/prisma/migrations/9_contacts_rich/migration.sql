-- Richer contacts: kind, structured fields, address, registry, photo

-- New enum value (former client)
ALTER TYPE "ContactType" ADD VALUE IF NOT EXISTS 'FORMER_CLIENT';

-- New enum: individual vs enterprise
DO $$ BEGIN
  CREATE TYPE "ContactKind" AS ENUM ('INDIVIDUAL', 'ENTERPRISE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Contact"
  ADD COLUMN "kind" "ContactKind" NOT NULL DEFAULT 'INDIVIDUAL',
  ADD COLUMN "firstName" TEXT,
  ADD COLUMN "lastName" TEXT,
  ADD COLUMN "companyName" TEXT,
  ADD COLUMN "street" TEXT,
  ADD COLUMN "streetNumber" TEXT,
  ADD COLUMN "postalCode" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "canton" TEXT,
  ADD COLUMN "country" TEXT,
  ADD COLUMN "ideNumber" TEXT,
  ADD COLUMN "vatNumber" TEXT,
  ADD COLUMN "registryData" JSONB,
  ADD COLUMN "photoFileId" TEXT;
