-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "telegramUserId" TEXT NOT NULL,
    "sellerKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ActiveApplication" (
    "telegramUserId" TEXT NOT NULL PRIMARY KEY,
    "sellerKey" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LicenseMask" (
    "telegramUserId" TEXT NOT NULL,
    "sellerKey" TEXT NOT NULL,
    "mask" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,

    PRIMARY KEY ("telegramUserId", "sellerKey")
);

-- CreateIndex
CREATE INDEX "Application_telegramUserId_idx" ON "Application"("telegramUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_telegramUserId_sellerKey_key" ON "Application"("telegramUserId", "sellerKey");
