import { describe, expect, it } from "vitest";
import { describesEating, logFoodHref, suggestsMeal } from "./detect";

describe("describesEating", () => {
  it.each([
    "I had 2 eggs and toast for breakfast",
    "200 g chicken and rice",
    "just ate a banana",
    "Lunch was a tuna sandwich",
  ])("offers to log: %s", (t) => expect(describesEating(t)).toBe(true));
  it.each([
    "How do I break a bench plateau?",
    "Is it okay to train legs two days in a row?",
    "What should my calorie target be?",
    "What should I eat before a 6am workout? I usually train fasted",
    "Should I have a snack before training?",
  ])(
    "doesn't offer for questions: %s",
    (t) => expect(describesEating(t)).toBe(false),
  );
});

describe("suggestsMeal", () => {
  it("offers for a suggested meal with numbers", () => {
    expect(suggestsMeal("Try Greek yoghurt with berries for breakfast: about 250 kcal and 25 g protein.")).toBe(true);
  });
  it("doesn't offer for training advice", () => {
    expect(suggestsMeal("Stay at 85 kg and aim for 8 reps on every set.")).toBe(false);
  });
});

it("builds an Add food link with the text", () => {
  expect(logFoodHref("2 eggs & toast")).toBe("/nutrition/add?ai=2%20eggs%20%26%20toast");
});
