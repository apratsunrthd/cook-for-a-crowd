import { describe, expect, it } from "vitest";
import { SUPPLY_PRESETS, suppliesNeeded } from "../supplies";

describe("suppliesNeeded", () => {
  it("rounds up plates for 44 people at 1.1 per person", () => {
    expect(suppliesNeeded(1.1, 44)).toBe(49); // 48.4 -> 49
  });

  it("rounds up ice in pounds for 60 people at 1.5 lb per person", () => {
    expect(suppliesNeeded(1.5, 60)).toBe(90);
  });

  it("returns exactly the product when it's already a whole number", () => {
    expect(suppliesNeeded(2, 40)).toBe(80);
  });

  it("returns 0 for a non-positive per-person quantity or headcount", () => {
    expect(suppliesNeeded(0, 40)).toBe(0);
    expect(suppliesNeeded(1.5, 0)).toBe(0);
  });
});

describe("SUPPLY_PRESETS", () => {
  it("splits plates into a dinner and a dessert line item, not one combined count", () => {
    const names = SUPPLY_PRESETS.map((p) => p.name);
    expect(names).toContain("Dinner plates");
    expect(names).toContain("Dessert plates");
    expect(names).not.toContain("Plates");
  });

  it("accounts for a fresh fork/spoon after the first is thrown away for dessert", () => {
    const forks = SUPPLY_PRESETS.find((p) => p.id === "forks")!;
    const spoons = SUPPLY_PRESETS.find((p) => p.id === "spoons")!;
    const knives = SUPPLY_PRESETS.find((p) => p.id === "knives")!;
    expect(forks.perPersonQuantity).toBeGreaterThanOrEqual(2);
    expect(spoons.perPersonQuantity).toBeGreaterThanOrEqual(2);
    // Knives don't get the same bump -- dessert rarely needs one.
    expect(knives.perPersonQuantity).toBeLessThan(2);
  });
});
