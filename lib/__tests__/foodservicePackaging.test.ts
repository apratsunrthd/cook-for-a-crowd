import { describe, expect, it } from "vitest";
import { foodservicePackagesNeeded } from "../foodservicePackaging";

describe("foodservicePackagesNeeded", () => {
  it("rounds up to whole packages", () => {
    // 6.38 kg of green beans / a 2948g #10 can -> 2.16 -> 3 cans.
    expect(foodservicePackagesNeeded(6380, 2948)).toBe(3);
  });

  it("returns exactly the ratio when it divides evenly", () => {
    expect(foodservicePackagesNeeded(4536, 4536)).toBe(1);
  });

  it("returns 0 for a non-positive total or package weight", () => {
    expect(foodservicePackagesNeeded(0, 2948)).toBe(0);
    expect(foodservicePackagesNeeded(2000, 0)).toBe(0);
  });
});
