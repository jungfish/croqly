-- AlterTable
ALTER TABLE "Creator" ADD COLUMN     "claimRequestedAt" TIMESTAMP(3),
ADD COLUMN     "claimRequestedByUserId" TEXT,
ADD COLUMN     "claimVerificationCode" TEXT;
