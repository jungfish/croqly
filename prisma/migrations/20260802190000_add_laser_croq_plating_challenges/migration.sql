-- CreateTable
CREATE TABLE "PlatingChallenge" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "savedRecipeId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatingChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatingSubmission" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "photoThumbUrl" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatingSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatingVote" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatingVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatingComment" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatingComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatingChallenge_householdId_idx" ON "PlatingChallenge"("householdId");

-- CreateIndex
CREATE INDEX "PlatingChallenge_savedRecipeId_idx" ON "PlatingChallenge"("savedRecipeId");

-- CreateIndex
CREATE INDEX "PlatingSubmission_challengeId_idx" ON "PlatingSubmission"("challengeId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatingSubmission_challengeId_userId_key" ON "PlatingSubmission"("challengeId", "userId");

-- CreateIndex
CREATE INDEX "PlatingVote_submissionId_idx" ON "PlatingVote"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatingVote_submissionId_userId_key" ON "PlatingVote"("submissionId", "userId");

-- CreateIndex
CREATE INDEX "PlatingComment_submissionId_idx" ON "PlatingComment"("submissionId");

-- AddForeignKey
ALTER TABLE "PlatingChallenge" ADD CONSTRAINT "PlatingChallenge_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatingChallenge" ADD CONSTRAINT "PlatingChallenge_savedRecipeId_fkey" FOREIGN KEY ("savedRecipeId") REFERENCES "SavedRecipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatingSubmission" ADD CONSTRAINT "PlatingSubmission_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "PlatingChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatingVote" ADD CONSTRAINT "PlatingVote_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "PlatingSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatingComment" ADD CONSTRAINT "PlatingComment_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "PlatingSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
