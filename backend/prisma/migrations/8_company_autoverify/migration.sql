-- Automatic monthly registry re-verification
ALTER TABLE "Company"
  ADD COLUMN "verificationSourceUrl" TEXT,
  ADD COLUMN "autoVerify" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lastAutoVerifyAt" TIMESTAMP(3);
