import { describe, expect, it } from "vitest";
import type { LibraryExercise } from "./library";
import { applyAliases, rankExercises } from "./search";

const ex = (id: string, name: string, category = "strength", primaryMuscles = ["chest"]): LibraryExercise => ({
  id,
  name,
  category,
  level: "beginner",
  equipment: "barbell",
  primaryMuscles,
  secondaryMuscles: [],
  instructions: [],
  photos: 2,
});

const LIB = [
  ex("Incline_Bench_Pull", "Incline Bench Pull", "strength", ["middle back"]),
  ex("Barbell_Incline_Bench_Press_-_Medium_Grip", "Barbell Incline Bench Press - Medium Grip"),
  ex("Smith_Machine_Incline_Bench_Press", "Smith Machine Incline Bench Press"),
  ex("Chest_Stretch", "Chest Stretch On Stability Ball", "stretching"),
  ex("Barbell_Bench_Press_-_Medium_Grip", "Barbell Bench Press - Medium Grip"),
  ex("Bench_Dips", "Bench Dips", "strength", ["triceps"]),
];
const names = (q: string, prefer?: string[]) => rankExercises(LIB, q, { prefer }).map((e) => e.name);

describe("rankExercises", () => {
  it("puts the staple first, not an obscure variation", () => {
    expect(names("incline bench")[0]).toBe("Barbell Incline Bench Press - Medium Grip");
  });
  it("puts exercises you've logged first", () => {
    expect(names("incline bench", ["Smith Machine Incline Bench Press"])[0]).toBe("Smith Machine Incline Bench Press");
  });
  it("puts an exact name first", () => {
    expect(names("bench dips")[0]).toBe("Bench Dips");
  });
  it("matches muscles too, with strength work before stretches", () => {
    const r = names("chest");
    expect(r.at(-1)).toBe("Chest Stretch On Stability Ball");
    expect(r).toContain("Barbell Bench Press - Medium Grip");
  });
  it("needs every word to match", () => {
    expect(names("incline curl")).toEqual([]);
  });
});

describe("applyAliases", () => {
  it.each([
    ["Back squat", "barbell squat"],
    ["OHP", "standing military press"],
    ["rdl", "romanian deadlift"],
    ["pull-ups", "pullups"],
    ["incline bench", "incline bench"],
  ])("%s → %s", (q, out) => expect(applyAliases(q)).toBe(out));
});
