import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EXERCISES = [
  ["Back Squat", "Legs"],
  ["Front Squat", "Legs"],
  ["Romanian Deadlift", "Hamstrings"],
  ["Deadlift", "Back"],
  ["Leg Press", "Legs"],
  ["Walking Lunge", "Legs"],
  ["Bench Press", "Chest"],
  ["Incline Dumbbell Press", "Chest"],
  ["Overhead Press", "Shoulders"],
  ["Lateral Raise", "Shoulders"],
  ["Pull-up", "Back"],
  ["Lat Pulldown", "Back"],
  ["Barbell Row", "Back"],
  ["Seated Cable Row", "Back"],
  ["Barbell Curl", "Arms"],
  ["Triceps Pushdown", "Arms"],
  ["Plank", "Core"],
  ["Hanging Leg Raise", "Core"],
];

async function main() {
  await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  for (const [name, muscleGroup] of EXERCISES) {
    await prisma.exercise.upsert({ where: { name }, update: {}, create: { name, muscleGroup } });
  }
  console.log(`Seeded settings + ${EXERCISES.length} exercises.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
