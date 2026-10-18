// Which cached pages to refresh after each kind of change.
import { revalidatePath } from "next/cache";

/** After the food log changes. */
export function revalidateFood() {
  revalidatePath("/nutrition");
  revalidatePath("/nutrition/add");
  revalidatePath("/");
}

/** After a weigh-in changes. */
export function revalidateWeight() {
  revalidatePath("/weight");
  revalidatePath("/");
}

/** After a workout is started or deleted. */
export function revalidateWorkouts() {
  revalidatePath("/workouts");
  revalidatePath("/");
}

/** After a set changes inside one workout. */
export function revalidateWorkout(workoutId: number) {
  revalidatePath(`/workouts/${workoutId}`);
  revalidatePath("/workouts");
}

/** After settings change: goals and units show on every page. */
export function revalidateAll() {
  revalidatePath("/", "layout");
}
