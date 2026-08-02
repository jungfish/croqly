-- CreateTable
CREATE TABLE "ShoppingListShare" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "sharedWithUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShoppingListShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShoppingListShare_ownerUserId_key" ON "ShoppingListShare"("ownerUserId");

-- CreateIndex
CREATE INDEX "ShoppingListShare_sharedWithUserId_idx" ON "ShoppingListShare"("sharedWithUserId");
