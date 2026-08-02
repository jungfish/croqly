-- Allow a user to belong to more than one household ("bande") at once, and
-- scope reactions per (SavedRecipe, Household) instead of just SavedRecipe
-- so a reaction made in one bande never becomes visible in another bande
-- that happens to share the same saved recipe's owner.

-- DropIndex
DROP INDEX "HouseholdMember_householdId_idx";

-- DropIndex
DROP INDEX "HouseholdMember_userId_key";

-- DropIndex
DROP INDEX "Reaction_savedRecipeId_idx";

-- DropIndex
DROP INDEX "Reaction_savedRecipeId_userId_emoji_key";

-- AlterTable: nullable first so existing rows can be backfilled below.
ALTER TABLE "Reaction" ADD COLUMN "householdId" TEXT;

-- Backfill: every existing reaction was created back when a user could only
-- be in one household, so the reactor's (only) household at the time is
-- also the household the reaction should be scoped to going forward.
UPDATE "Reaction" r
SET "householdId" = hm."householdId"
FROM "SavedRecipe" sr
JOIN "HouseholdMember" hm ON hm."userId" = sr."userId"
WHERE r."savedRecipeId" = sr."id";

-- Anything left unresolved (the saver has since left every household) has
-- no sensible household to attach to — drop rather than leave orphaned.
DELETE FROM "Reaction" WHERE "householdId" IS NULL;

ALTER TABLE "Reaction" ALTER COLUMN "householdId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "HouseholdMember_userId_idx" ON "HouseholdMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdMember_householdId_userId_key" ON "HouseholdMember"("householdId", "userId");

-- CreateIndex
CREATE INDEX "Reaction_savedRecipeId_householdId_idx" ON "Reaction"("savedRecipeId", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_savedRecipeId_householdId_userId_emoji_key" ON "Reaction"("savedRecipeId", "householdId", "userId", "emoji");

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
