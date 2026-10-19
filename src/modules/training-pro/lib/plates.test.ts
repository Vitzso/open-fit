import { describe, expect, it } from "vitest";
import { newRecords } from "./records-shared";
import { platesFor, warmupsFor } from "./plates";

describe("platesFor", () => {
  it("loads 100 kg as 25 + 15 a side on a 20 kg bar", () => {
    expect(platesFor(100, "kg")).toEqual({ perSide: [25, 15], loaded: 100, short: 0 });
  });
  it("uses small plates for odd weights", () => {
    expect(platesFor(102.5, "kg").perSide).toEqual([25, 15, 1.25]);
  });
  it("loads 225 lb as two 45s a side", () => {
    expect(platesFor(225, "lb")).toEqual({ perSide: [45, 45], loaded: 225, short: 0 });
  });
  it("says how much it can't make", () => {
    expect(platesFor(101, "kg")).toMatchObject({ loaded: 100, short: 1 });
  });
  it("needs nothing at or under the bar", () => {
    expect(platesFor(20, "kg").perSide).toEqual([]);
  });
});

describe("warmupsFor", () => {
  it("ramps up from the empty bar to about 80 %", () => {
    expect(warmupsFor(100, "kg")).toEqual([
      { weight: 20, reps: 10 },
      { weight: 40, reps: 5 },
      { weight: 60, reps: 3 },
      { weight: 80, reps: 1 },
    ]);
  });
  it("skips steps that wouldn't be heavier than the bar", () => {
    expect(warmupsFor(30, "kg").map((w) => w.weight)).toEqual([20, 22.5]);
  });
});

describe("newRecords", () => {
  const best = { weight: 100, e1rm: 120, reps: 12 };
  it("isn't a record the first time you do an exercise", () => {
    expect(newRecords(undefined, 100, 5)).toEqual([]);
  });
  it("spots a heavier weight", () => {
    expect(newRecords(best, 102.5, 1)).toEqual(["weight"]);
  });
  it("spots more reps at a weight (estimated 1RM)", () => {
    expect(newRecords(best, 95, 8)).toEqual(["e1rm"]);
  });
  it("spots more bodyweight reps", () => {
    expect(newRecords({ weight: 0, e1rm: 0, reps: 10 }, 0, 11)).toEqual(["reps"]);
  });
  it("doesn't celebrate a normal set", () => {
    expect(newRecords(best, 90, 5)).toEqual([]);
  });
});
