// Ready-made workouts ("templates") and a small exercise library with form tips.
// Pure data, safe to import from client and server code.

export interface PlannedExercise {
  name: string; // must match an Exercise name (created automatically on first set)
  sets: number;
  reps: string; // shown as the target, e.g. "8–10" or "30 s"
  restSec: number;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  /** Workouts that alternate, e.g. Full body A ↔ B. Used to suggest what's next. */
  program: string;
  summary: string;
  level: "Beginner" | "Intermediate";
  minutes: number;
  equipment: "Gym" | "No equipment";
  exercises: PlannedExercise[];
}

export const TEMPLATES: WorkoutTemplate[] = [
  {
    id: "full-a",
    name: "Full body A",
    program: "Full body",
    summary: "Squat, push and pull in one session. Alternate with B, three days a week.",
    level: "Beginner",
    minutes: 45,
    equipment: "Gym",
    exercises: [
      { name: "Back Squat", sets: 3, reps: "8", restSec: 150 },
      { name: "Bench Press", sets: 3, reps: "8", restSec: 120 },
      { name: "Barbell Row", sets: 3, reps: "10", restSec: 90 },
      { name: "Romanian Deadlift", sets: 2, reps: "10", restSec: 90 },
      { name: "Plank", sets: 3, reps: "30 s", restSec: 60 },
    ],
  },
  {
    id: "full-b",
    name: "Full body B",
    program: "Full body",
    summary: "Hinge, press overhead and pull down. Alternate with A.",
    level: "Beginner",
    minutes: 45,
    equipment: "Gym",
    exercises: [
      { name: "Deadlift", sets: 3, reps: "5", restSec: 180 },
      { name: "Overhead Press", sets: 3, reps: "8", restSec: 120 },
      { name: "Lat Pulldown", sets: 3, reps: "10", restSec: 90 },
      { name: "Walking Lunge", sets: 2, reps: "10 each leg", restSec: 90 },
      { name: "Hanging Leg Raise", sets: 3, reps: "10", restSec: 60 },
    ],
  },
  {
    id: "upper",
    name: "Upper body",
    program: "Upper / lower",
    summary: "Chest, back, shoulders and arms. Alternate with Lower body, four days a week.",
    level: "Intermediate",
    minutes: 55,
    equipment: "Gym",
    exercises: [
      { name: "Bench Press", sets: 4, reps: "6–8", restSec: 150 },
      { name: "Barbell Row", sets: 4, reps: "8", restSec: 120 },
      { name: "Overhead Press", sets: 3, reps: "8–10", restSec: 90 },
      { name: "Pull-up", sets: 3, reps: "As many as you can", restSec: 90 },
      { name: "Lateral Raise", sets: 3, reps: "12–15", restSec: 60 },
      { name: "Triceps Pushdown", sets: 2, reps: "12", restSec: 60 },
      { name: "Barbell Curl", sets: 2, reps: "12", restSec: 60 },
    ],
  },
  {
    id: "lower",
    name: "Lower body",
    program: "Upper / lower",
    summary: "Legs and core. Alternate with Upper body.",
    level: "Intermediate",
    minutes: 50,
    equipment: "Gym",
    exercises: [
      { name: "Back Squat", sets: 4, reps: "6–8", restSec: 180 },
      { name: "Romanian Deadlift", sets: 3, reps: "8–10", restSec: 120 },
      { name: "Leg Press", sets: 3, reps: "10–12", restSec: 90 },
      { name: "Walking Lunge", sets: 2, reps: "12 each leg", restSec: 90 },
      { name: "Plank", sets: 3, reps: "45 s", restSec: 60 },
    ],
  },
  {
    id: "home",
    name: "Home, no equipment",
    program: "Home",
    summary: "A full-body circuit for days you can't get to the gym.",
    level: "Beginner",
    minutes: 30,
    equipment: "No equipment",
    exercises: [
      { name: "Push-up", sets: 3, reps: "As many as you can", restSec: 60 },
      { name: "Bodyweight Squat", sets: 3, reps: "15–20", restSec: 60 },
      { name: "Glute Bridge", sets: 3, reps: "15", restSec: 45 },
      { name: "Reverse Lunge", sets: 3, reps: "10 each leg", restSec: 60 },
      { name: "Plank", sets: 3, reps: "30–45 s", restSec: 45 },
    ],
  },
];

export const getTemplate = (id: string | null | undefined) => TEMPLATES.find((t) => t.id === id);

/** The workout to suggest after `lastTemplateId`: the next one in the same program, or Full body A. */
export function nextTemplate(lastTemplateId: string | null | undefined): WorkoutTemplate {
  const last = getTemplate(lastTemplateId);
  if (!last) return TEMPLATES[0];
  const inProgram = TEMPLATES.filter((t) => t.program === last.program);
  return inProgram[(inProgram.indexOf(last) + 1) % inProgram.length];
}

export interface ExerciseTip {
  muscles: string;
  tip: string;
}

/** Short form cues, keyed by lower-case exercise name. */
export const EXERCISE_TIPS: Record<string, ExerciseTip> = {
  "back squat": { muscles: "Thighs, glutes", tip: "Brace your core, sit down between your heels and keep your knees tracking over your toes." },
  "front squat": { muscles: "Thighs, upper back", tip: "Elbows high, chest up, and sit straight down." },
  "bench press": { muscles: "Chest, shoulders, triceps", tip: "Shoulder blades pinched, feet planted. Lower the bar to mid-chest and press up and slightly back." },
  "barbell row": { muscles: "Upper back, lats", tip: "Hinge to about 45°, keep your back flat and pull the bar to your lower ribs." },
  "romanian deadlift": { muscles: "Hamstrings, glutes", tip: "Soft knees, push your hips back and slide the bar down your thighs until you feel a stretch." },
  deadlift: { muscles: "Back, glutes, hamstrings", tip: "Bar over mid-foot, take the slack out of the bar, then push the floor away." },
  "overhead press": { muscles: "Shoulders, triceps", tip: "Squeeze your glutes, press straight up and move your head through once the bar passes it." },
  "lat pulldown": { muscles: "Lats, biceps", tip: "Lean back slightly and pull the bar to your upper chest, leading with your elbows." },
  "pull-up": { muscles: "Lats, biceps", tip: "Start from a dead hang and pull your chest towards the bar. Use a band if needed." },
  "walking lunge": { muscles: "Thighs, glutes", tip: "Long step, back knee towards the floor, push through the front heel." },
  "reverse lunge": { muscles: "Thighs, glutes", tip: "Step back, lower until both knees are at about 90°, drive up through the front heel." },
  "leg press": { muscles: "Thighs, glutes", tip: "Lower until your knees are near your chest without your lower back lifting off the pad." },
  "lateral raise": { muscles: "Side shoulders", tip: "Light weight, slight bend in the elbows. Raise to shoulder height and lower slowly." },
  "triceps pushdown": { muscles: "Triceps", tip: "Elbows pinned to your sides; only your forearms move." },
  "barbell curl": { muscles: "Biceps", tip: "Elbows still, no swinging. Lower slowly." },
  "incline dumbbell press": { muscles: "Upper chest, shoulders", tip: "Bench at about 30°. Lower the dumbbells to the sides of your chest." },
  "seated cable row": { muscles: "Mid back", tip: "Sit tall and pull the handle to your belly, squeezing your shoulder blades." },
  plank: { muscles: "Core", tip: "Straight line from head to heels; squeeze your glutes. Log the seconds as reps." },
  "hanging leg raise": { muscles: "Core, hip flexors", tip: "Avoid swinging: raise your legs with control and lower slowly." },
  "push-up": { muscles: "Chest, triceps", tip: "Body in one straight line. Lower your chest to just above the floor. Use your knees if needed." },
  "bodyweight squat": { muscles: "Thighs, glutes", tip: "Arms forward for balance, sit back and down, keep your heels on the floor." },
  "glute bridge": { muscles: "Glutes, hamstrings", tip: "Feet close to your hips, drive up through your heels and squeeze at the top." },
};

export const tipFor = (name: string) => EXERCISE_TIPS[name.trim().toLowerCase()];

export const fmtRest = (sec: number) => (sec >= 60 ? `${Math.round((sec / 60) * 10) / 10} min` : `${sec} s`);
