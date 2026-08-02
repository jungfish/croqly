-- CreateTable
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL,
    "savedRecipeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reaction_savedRecipeId_idx" ON "Reaction"("savedRecipeId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_savedRecipeId_userId_emoji_key" ON "Reaction"("savedRecipeId", "userId", "emoji");

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_savedRecipeId_fkey" FOREIGN KEY ("savedRecipeId") REFERENCES "SavedRecipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
