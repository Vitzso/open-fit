import { describe, expect, it } from "vitest";
import { AiReply, scaleItem, type AiFoodItem } from "./schema";

const egg: AiFoodItem = { name: "Eggs", grams: 100, calories: 140, protein: 12, carbs: 1, fat: 10, confidence: "high", source: "estimate" };

describe("scaleItem", () => {
  it("keeps nutrition per gram when the portion changes", () => {
    expect(scaleItem(egg, 150)).toMatchObject({ grams: 150, calories: 210, protein: 18, carbs: 1.5, fat: 15 });
  });
  it("handles a zero portion", () => {
    expect(scaleItem(egg, 0)).toMatchObject({ calories: 0, protein: 0 });
  });
});

describe("AiReply", () => {
  it("clamps silly numbers and fixes an unknown confidence", () => {
    const r = AiReply.parse({ items: [{ name: " Toast ", grams: "60", calories: -5, protein: 99999, carbs: 30, fat: 2, confidence: "very" }] });
    expect(r.items[0]).toEqual({ name: "Toast", grams: 60, calories: 0, protein: 2000, carbs: 30, fat: 2, confidence: "medium" });
  });
  it("rejects a reply without a list", () => {
    expect(AiReply.safeParse({ food: "toast" }).success).toBe(false);
  });
});
