-- Custom domain for branded temporary links
DO $$ BEGIN
  CREATE TYPE "LinkDomainStatus" AS ENUM ('NONE', 'PENDING', 'VERIFIED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Company"
  ADD COLUMN "linkDomain" TEXT,
  ADD COLUMN "linkDomainStatus" "LinkDomainStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "linkDomainToken" TEXT,
  ADD COLUMN "linkDomainVerifiedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Company_linkDomain_key" ON "Company"("linkDomain");
