-- CreateTable
CREATE TABLE "PlatingReaction" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatingReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatingReaction_submissionId_idx" ON "PlatingReaction"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatingReaction_submissionId_userId_type_key" ON "PlatingReaction"("submissionId", "userId", "type");

-- AddForeignKey
ALTER TABLE "PlatingReaction" ADD CONSTRAINT "PlatingReaction_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "PlatingSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
