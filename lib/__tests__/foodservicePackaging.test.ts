import { describe, expect, it } from "vitest";
import { foodservicePackageCategoryFor, foodservicePackagesNeeded } from "../foodservicePackaging";

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

describe("foodservicePackageCategoryFor", () => {
  it("treats a 'can' unit as canned goods, regardless of description", () => {
    expect(foodservicePackageCategoryFor({ unit: "can", description: "green beans, drained" })).toBe("can");
    expect(foodservicePackageCategoryFor({ unit: "can", description: "black beans" })).toBe("can");
  });

  it("recognizes dry bulk staples by description even though they're not sold in cans", () => {
    expect(foodservicePackageCategoryFor({ unit: "cup", description: "all-purpose flour" })).toBe("bulkBag");
    expect(foodservicePackageCategoryFor({ unit: "cup", description: "granulated sugar" })).toBe("bulkBag");
    expect(foodservicePackageCategoryFor({ unit: "cup", description: "white rice" })).toBe("bulkBag");
  });

  it("does not offer a can or bag for butter -- nobody sells butter that way", () => {
    expect(foodservicePackageCategoryFor({ unit: "cup", description: "butter" })).toBeNull();
  });

  it("does not offer a bulk package for other ambiguous fridge/pantry items", () => {
    expect(foodservicePackageCategoryFor({ unit: "cup", description: "milk" })).toBeNull();
    expect(foodservicePackageCategoryFor({ unit: "cup", description: "shredded cheddar cheese" })).toBeNull();
    expect(foodservicePackageCategoryFor({ unit: "teaspoon", description: "black pepper" })).toBeNull();
  });
});
