import { describe, expect, it } from "vitest";
import { drinkUnitsNeeded } from "../drinks";

describe("drinkUnitsNeeded", () => {
  it("computes gallons of lemonade needed, rounding up", () => {
    // 60 people * 8 oz = 480 oz; a gallon is 128 oz -> 3.75 -> 4 gallons.
    expect(drinkUnitsNeeded(60, 8, 128)).toBe(4);
  });

  it("computes cans of soda needed, one per person", () => {
    expect(drinkUnitsNeeded(40, 12, 12)).toBe(40);
  });

  it("returns exactly the ratio when it divides evenly", () => {
    expect(drinkUnitsNeeded(16, 8, 128)).toBe(1);
  });

  it("returns 0 for a non-positive headcount, serving size, or package size", () => {
    expect(drinkUnitsNeeded(0, 8, 128)).toBe(0);
    expect(drinkUnitsNeeded(40, 0, 128)).toBe(0);
    expect(drinkUnitsNeeded(40, 8, 0)).toBe(0);
  });
});
