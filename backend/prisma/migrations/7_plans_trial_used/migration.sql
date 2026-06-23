-- Track whether a company already used its free trial
ALTER TABLE "Company" ADD COLUMN "trialUsedAt" TIMESTAMP(3);

-- Companies currently/previously trialing have used their trial
UPDATE "Company"
SET "trialUsedAt" = now()
WHERE "subscriptionStatus" = 'TRIAL' AND "trialUsedAt" IS NULL;

-- Update pricing + trial length to the new defaults (only if untouched)
UPDATE "PlatformSettings" SET "monthlyPriceCents" = 2495 WHERE "monthlyPriceCents" = 4900;
UPDATE "PlatformSettings" SET "yearlyPriceCents" = 24950 WHERE "yearlyPriceCents" = 49000;
UPDATE "PlatformSettings" SET "trialDays" = 7 WHERE "trialDays" = 14;
