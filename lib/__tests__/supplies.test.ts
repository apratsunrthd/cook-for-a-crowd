import { describe, expect, it } from "vitest";
import { suppliesNeeded } from "../supplies";

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
