-- Live log of custom-domain operations
CREATE TABLE "DomainEvent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DomainEvent_companyId_createdAt_idx" ON "DomainEvent"("companyId", "createdAt");
