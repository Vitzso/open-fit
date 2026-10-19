-- Progress reports from the AI coach, shown on the desktop dashboard.
CREATE TABLE "CoachReport" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "rangeDays" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
