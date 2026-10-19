-- Optional modules (Settings) and the Pro training module: set types and your own programs.
ALTER TABLE "Settings" ADD COLUMN "enabledModules" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WorkoutSet" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'work';

CREATE TABLE "UserProgram" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "UserProgramExercise" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "programId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sets" INTEGER NOT NULL,
    "reps" TEXT NOT NULL,
    "restSec" INTEGER NOT NULL,
    CONSTRAINT "UserProgramExercise_programId_fkey" FOREIGN KEY ("programId") REFERENCES "UserProgram" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "UserProgramExercise_programId_idx" ON "UserProgramExercise"("programId");
