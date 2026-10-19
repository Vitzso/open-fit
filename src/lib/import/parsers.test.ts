import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";
import { detectSource, parseImport, toDay } from "./parsers";

describe("parseCsv", () => {
  it("handles quotes, commas and newlines inside quotes, and a BOM", () => {
    expect(parseCsv('﻿a,b\n"x, y","say ""hi""\nthere"\n')).toEqual([
      ["a", "b"],
      ["x, y", 'say "hi"\nthere'],
    ]);
  });
  it("reads semicolon-separated files", () => {
    expect(parseCsv("a;b\n1,5;2\n")).toEqual([
      ["a", "b"],
      ["1,5", "2"],
    ]);
  });
});

describe("toDay", () => {
  it.each([
    ["2024-01-15 07:30:00", "2024-01-15"],
    ["15 Jan 2024, 07:00", "2024-01-15"],
    ["Jan 15, 2024", "2024-01-15"],
    ["01/15/2024", "2024-01-15"],
    ["yesterday", null],
  ])("%s → %s", (input, day) => expect(toDay(input)).toBe(day));
});

const STRONG = `Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE
2024-01-15 07:30:00,"Push Day",1h,"Bench Press (Barbell)",W,135,5,0,0,,,
2024-01-15 07:30:00,"Push Day",1h,"Bench Press (Barbell)",1,185,8,0,0,,,8
2024-01-15 07:30:00,"Push Day",1h,"Running",1,0,0,5,1800,,,
2024-01-17 07:30:00,"Pull Day",1h,"Deadlift (Barbell)",1,225,5,0,0,"felt good",,`;

const HEVY = `"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"
"Upper","15 Jan 2024, 07:00","15 Jan 2024, 08:00","","Bench Press (Barbell)",,"",0,"warmup",40,10,,,
"Upper","15 Jan 2024, 07:00","15 Jan 2024, 08:00","","Bench Press (Barbell)",,"",1,"normal",80,8,,,8.5
"Upper","15 Jan 2024, 07:00","15 Jan 2024, 08:00","","Bench Press (Barbell)",,"",2,"dropset",60,12,,,`;

const MFP = `Date,Meal,Calories,Fat (g),Saturated Fat,Polyunsaturated Fat,Monounsaturated Fat,Trans Fat,Cholesterol,Sodium (mg),Potassium,Carbohydrates (g),Fiber,Sugar,Protein (g),Note
2024-01-15,Breakfast,450,12.5,4,0,0,0,200,300,0,55,5,10,30,
2024-01-15,Snacks,180,9,2,0,0,0,0,50,0,20,2,15,4,
,Lunch,500,10,0,0,0,0,0,0,0,50,0,0,40,`;

describe("detectSource", () => {
  it("recognises each app's export", () => {
    expect(detectSource(STRONG)).toBe("strong");
    expect(detectSource(HEVY)).toBe("hevy");
    expect(detectSource(MFP)).toBe("myfitnesspal");
    expect(detectSource('{"app":"openfit","version":1}')).toBe("openfit");
    expect(detectSource("name,age\nx,1")).toBeNull();
  });
});

describe("parseImport", () => {
  it("reads Strong: workouts grouped, lb converted to kg, warm-ups marked, cardio rows skipped", () => {
    const plan = parseImport("strong", STRONG, "lb");
    expect(plan.workouts).toHaveLength(2);
    const push = plan.workouts[0];
    expect(push).toMatchObject({ day: "2024-01-15", name: "Push Day" });
    expect(push.sets).toHaveLength(2);
    expect(push.sets[0]).toMatchObject({ kind: "warmup", reps: 5 });
    expect(push.sets[1].weightKg).toBeCloseTo(83.91, 1);
    expect(push.sets[1].rpe).toBe(8);
    expect(plan.workouts[1].sets[0].notes).toBe("felt good");
  });
  it("reads Hevy: set types and kg", () => {
    const plan = parseImport("hevy", HEVY);
    expect(plan.workouts).toHaveLength(1);
    expect(plan.workouts[0].sets.map((s) => s.kind)).toEqual(["warmup", "work", "drop"]);
    expect(plan.workouts[0].sets[1]).toMatchObject({ weightKg: 80, reps: 8, rpe: 8.5 });
  });
  it("reads MyFitnessPal meal totals, mapping Snacks and skipping rows without a date", () => {
    const plan = parseImport("myfitnesspal", MFP);
    expect(plan.foods).toEqual([
      { day: "2024-01-15", meal: "breakfast", name: "Breakfast (from MyFitnessPal)", calories: 450, protein: 30, carbs: 55, fat: 12.5 },
      { day: "2024-01-15", meal: "snack", name: "Snacks (from MyFitnessPal)", calories: 180, protein: 4, carbs: 20, fat: 9 },
    ]);
    expect(plan.skipped).toHaveLength(1);
  });
  it("refuses a JSON file that isn't an OpenFit backup", () => {
    expect(() => parseImport("openfit", '{"app":"other"}')).toThrow(/OpenFit backup/);
  });
});
