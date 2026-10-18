// Exercise demonstration photos (start and end position), shown as a loop.
// Source: free-exercise-db by yuhonas, https://github.com/yuhonas/free-exercise-db
// Licence: The Unlicense (public domain). Files live in public/exercises/<slug>/0.jpg and 1.jpg.
// "source" is the matching exercise name in that database, for re-downloading or swapping.

export interface ExerciseMedia {
  slug: string;
  source: string;
}

export const EXERCISE_MEDIA: Record<string, ExerciseMedia> = {
  "back squat": { slug: "back-squat", source: "Barbell Squat" },
  "front squat": { slug: "front-squat", source: "Front Barbell Squat" },
  "bench press": { slug: "bench-press", source: "Barbell Bench Press - Medium Grip" },
  "barbell row": { slug: "barbell-row", source: "Bent Over Barbell Row" },
  "romanian deadlift": { slug: "romanian-deadlift", source: "Romanian Deadlift" },
  "deadlift": { slug: "deadlift", source: "Barbell Deadlift" },
  "overhead press": { slug: "overhead-press", source: "Standing Military Press" },
  "lat pulldown": { slug: "lat-pulldown", source: "Wide-Grip Lat Pulldown" },
  "pull-up": { slug: "pull-up", source: "Pullups" },
  "walking lunge": { slug: "walking-lunge", source: "Bodyweight Walking Lunge" },
  "reverse lunge": { slug: "reverse-lunge", source: "Dumbbell Rear Lunge" },
  "leg press": { slug: "leg-press", source: "Leg Press" },
  "lateral raise": { slug: "lateral-raise", source: "Side Lateral Raise" },
  "triceps pushdown": { slug: "triceps-pushdown", source: "Triceps Pushdown" },
  "barbell curl": { slug: "barbell-curl", source: "Barbell Curl" },
  "incline dumbbell press": { slug: "incline-dumbbell-press", source: "Incline Dumbbell Press" },
  "seated cable row": { slug: "seated-cable-row", source: "Seated Cable Rows" },
  "plank": { slug: "plank", source: "Plank" },
  "hanging leg raise": { slug: "hanging-leg-raise", source: "Hanging Leg Raise" },
  "push-up": { slug: "push-up", source: "Pushups" },
  "bodyweight squat": { slug: "bodyweight-squat", source: "Bodyweight Squat" },
  "glute bridge": { slug: "glute-bridge", source: "Butt Lift (Bridge)" },
};

export const MEDIA_CREDIT = "Demo photos: free-exercise-db (public domain)";

export function mediaFor(name: string): { start: string; end: string; source: string } | null {
  const m = EXERCISE_MEDIA[name.trim().toLowerCase()];
  return m ? { start: `/exercises/${m.slug}/0.jpg`, end: `/exercises/${m.slug}/1.jpg`, source: m.source } : null;
}
