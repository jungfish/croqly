-- CreateTable
CREATE TABLE "AnonymousProcessingLog" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnonymousProcessingLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnonymousProcessingLog_ip_createdAt_idx" ON "AnonymousProcessingLog"("ip", "createdAt");
