import { describe, expect, it } from "vitest";
import { supersetNext } from "@/lib/workout-plan";
import { withSupersetGroups } from "./supersets";

const row = (name: string, supersetWithNext = false, sets = 3) => ({ name, sets, reps: "10", restSec: 90, supersetWithNext });

describe("withSupersetGroups", () => {
  it("letters each chained run, leaving single exercises alone", () => {
    const plan = withSupersetGroups([row("Squat"), row("Bench", true), row("Row"), row("Curl", true), row("Pushdown", true), row("Raise")]);
    expect(plan.map((p) => p.group ?? "-")).toEqual(["-", "A", "A", "B", "B", "B"]);
  });
  it("ignores a superset tick on the last exercise", () => {
    expect(withSupersetGroups([row("Squat"), row("Plank", true)]).map((p) => p.group)).toEqual([undefined, undefined]);
  });
});

describe("supersetNext", () => {
  const plan = withSupersetGroups([row("Squat"), row("Bench", true), row("Row", false, 2)]);
  it("goes straight to the next exercise of the group without rest", () => {
    expect(supersetNext(plan, "Bench", { bench: 1 })).toMatchObject({ next: { name: "Row" }, rest: false });
  });
  it("rests after a full round, back at the first exercise", () => {
    expect(supersetNext(plan, "Row", { bench: 1, row: 1 })).toMatchObject({ next: { name: "Bench" }, rest: true });
  });
  it("skips an exercise whose sets are done", () => {
    expect(supersetNext(plan, "Bench", { bench: 2, row: 2 })).toMatchObject({ next: { name: "Bench" }, rest: true });
  });
  it("returns null when the group is finished, or for exercises outside a group", () => {
    expect(supersetNext(plan, "Bench", { bench: 3, row: 2 })).toBeNull();
    expect(supersetNext(plan, "Squat", { squat: 1 })).toBeNull();
  });
});
