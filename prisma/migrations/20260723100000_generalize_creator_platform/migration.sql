-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('instagram', 'tiktok');

-- AlterTable: track which platform a recipe was imported from. Backfilled
-- from the stored source URL for existing rows — new rows are written by
-- server/routes/recipes.ts going forward.
ALTER TABLE "Recipe" ADD COLUMN "platform" "Platform";
UPDATE "Recipe" SET "platform" = 'tiktok' WHERE "url" ILIKE '%tiktok.com%';
UPDATE "Recipe" SET "platform" = 'instagram' WHERE "url" ILIKE '%instagram.com%';

-- AlterTable: generalize Creator from Instagram-only to either platform.
-- All existing rows were Instagram (TikTok attribution didn't exist before
-- this migration), hence the 'instagram' default/backfill.
ALTER TABLE "Creator" ADD COLUMN "platform" "Platform" NOT NULL DEFAULT 'instagram';
ALTER TABLE "Creator" RENAME COLUMN "instagramHandle" TO "handle";

-- DropIndex
DROP INDEX "Creator_instagramHandle_key";

-- CreateIndex
CREATE UNIQUE INDEX "Creator_platform_handle_key" ON "Creator"("platform", "handle");
