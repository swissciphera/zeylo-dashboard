-- Split User.name into firstName / lastName
ALTER TABLE "User" ADD COLUMN "firstName" TEXT;
ALTER TABLE "User" ADD COLUMN "lastName" TEXT;

-- Backfill from existing "name" (first token = firstName, rest = lastName)
UPDATE "User"
SET "firstName" = COALESCE(NULLIF(split_part("name", ' ', 1), ''), 'Utilisateur'),
    "lastName" = CASE
      WHEN position(' ' in "name") > 0
        THEN substring("name" from position(' ' in "name") + 1)
      ELSE ''
    END;

ALTER TABLE "User" ALTER COLUMN "firstName" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "lastName" SET NOT NULL;

ALTER TABLE "User" DROP COLUMN "name";
