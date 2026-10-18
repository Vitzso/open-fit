-- CreateTable
CREATE TABLE "CoachNote" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "day" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "weightUnit" TEXT NOT NULL DEFAULT 'kg',
    "calorieGoal" INTEGER NOT NULL DEFAULT 2000,
    "proteinGoal" INTEGER NOT NULL DEFAULT 150,
    "carbsGoal" INTEGER NOT NULL DEFAULT 200,
    "fatGoal" INTEGER NOT NULL DEFAULT 65,
    "goalWeightKg" REAL,
    "sex" TEXT,
    "birthYear" INTEGER,
    "heightCm" REAL,
    "activityLevel" TEXT,
    "weeklyLossPct" REAL NOT NULL DEFAULT 0.6,
    "ollamaBaseUrl" TEXT,
    "ollamaModel" TEXT,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" ("calorieGoal", "carbsGoal", "fatGoal", "goalWeightKg", "id", "ollamaBaseUrl", "ollamaModel", "proteinGoal", "updatedAt", "weightUnit") SELECT "calorieGoal", "carbsGoal", "fatGoal", "goalWeightKg", "id", "ollamaBaseUrl", "ollamaModel", "proteinGoal", "updatedAt", "weightUnit" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CoachNote_day_key" ON "CoachNote"("day");
