import { describe, expect, it } from "vitest";
import { drinkUnitsNeeded, splitDrinkHeadcounts } from "../drinks";

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

describe("splitDrinkHeadcounts", () => {
  it("gives a single un-customized drink the whole headcount -- unchanged from before multiple drinks existed", () => {
    const result = splitDrinkHeadcounts([{ id: 1, targetHeadcount: null }], 44);
    expect(result.get(1)).toBe(44);
  });

  it("splits the headcount evenly across multiple un-customized drinks (sweet tea, unsweet tea, lemonade)", () => {
    const result = splitDrinkHeadcounts(
      [
        { id: 1, targetHeadcount: null },
        { id: 2, targetHeadcount: null },
        { id: 3, targetHeadcount: null },
      ],
      44,
    );
    // 44 / 3 = 14.67 -> rounds up to 15 each, rather than each getting 44.
    expect(result.get(1)).toBe(15);
    expect(result.get(2)).toBe(15);
    expect(result.get(3)).toBe(15);
  });

  it("honors a manually-set headcount exactly and splits only the remainder among the rest", () => {
    const result = splitDrinkHeadcounts(
      [
        { id: 1, targetHeadcount: 10 }, // "only ~10 people will want soda"
        { id: 2, targetHeadcount: null },
        { id: 3, targetHeadcount: null },
      ],
      44,
    );
    expect(result.get(1)).toBe(10);
    // Remaining 34 split across the 2 auto drinks -> 17 each.
    expect(result.get(2)).toBe(17);
    expect(result.get(3)).toBe(17);
  });

  it("never goes negative when customized totals already exceed the headcount", () => {
    const result = splitDrinkHeadcounts(
      [
        { id: 1, targetHeadcount: 50 },
        { id: 2, targetHeadcount: null },
      ],
      44,
    );
    expect(result.get(1)).toBe(50);
    expect(result.get(2)).toBe(0);
  });
});
