-- Device tokens (iPhone Shortcut) and daily activity from Apple Health.
CREATE TABLE "ApiToken" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" DATETIME
);
CREATE UNIQUE INDEX "ApiToken_tokenHash_key" ON "ApiToken"("tokenHash");

CREATE TABLE "DailyActivity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "day" TEXT NOT NULL,
    "steps" INTEGER,
    "activeKcal" REAL,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "DailyActivity_day_key" ON "DailyActivity"("day");
