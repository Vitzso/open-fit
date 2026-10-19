-- Offline logging: the phone gives each entry an id, so replaying a sync never duplicates it.
ALTER TABLE "FoodEntry" ADD COLUMN "clientId" TEXT;
CREATE UNIQUE INDEX "FoodEntry_clientId_key" ON "FoodEntry"("clientId");
ALTER TABLE "WorkoutSet" ADD COLUMN "clientId" TEXT;
CREATE UNIQUE INDEX "WorkoutSet_clientId_key" ON "WorkoutSet"("clientId");
