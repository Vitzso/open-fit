-- First day of the week (0 = Sunday … 6 = Saturday) and custom instructions for the AI coach.
ALTER TABLE "Settings" ADD COLUMN "weekStart" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Settings" ADD COLUMN "coachInstructions" TEXT;
