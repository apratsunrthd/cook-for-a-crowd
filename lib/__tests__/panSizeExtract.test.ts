import { describe, expect, it } from "vitest";
import { extractPanSizeFromText, guessPanSize } from "../panSizeExtract";

describe("extractPanSizeFromText", () => {
  it.each([
    ["Mix chicken, soup, and sour cream in a 9x13 pan.", { shape: "rectangle", widthIn: 9, heightIn: 13 }],
    [
      "Pour into a greased 9x13-inch baking dish and bake for 30 minutes.",
      { shape: "rectangle", widthIn: 9, heightIn: 13 },
    ],
    ["Spread batter into a 13 x 9 inch pan.", { shape: "rectangle", widthIn: 13, heightIn: 9 }],
    ["Transfer to a 9-by-13 casserole dish.", { shape: "rectangle", widthIn: 9, heightIn: 13 }],
    ["Pour into an 8-inch round cake pan.", { shape: "round", diameterIn: 8 }],
    ["Bake in a 9 inch springform pan until set.", { shape: "round", diameterIn: 9 }],
    ["Pour filling into a 10-inch pie plate.", { shape: "round", diameterIn: 10 }],
    [
      "Spread evenly on a half sheet pan and roast at 425F.",
      { shape: "rectangle", widthIn: 13, heightIn: 18 },
    ],
    [
      "Arrange on a full sheet pan for a large batch.",
      { shape: "rectangle", widthIn: 18, heightIn: 26 },
    ],
    [
      "pour 1/2 of the mixture into a 9-inch square baking dish.",
      { shape: "rectangle", widthIn: 9, heightIn: 9 },
    ],
    ["Bake in an 8 inch square pan.", { shape: "rectangle", widthIn: 8, heightIn: 8 }],
  ])("extracts pan size from %s", (text, expected) => {
    expect(extractPanSizeFromText(text)).toEqual(expected);
  });

  it("returns null when no pan size is mentioned", () => {
    expect(extractPanSizeFromText("Simmer on the stove for 10 minutes, stirring occasionally.")).toBeNull();
  });

  it("does not mistake a scaling multiplier for a pan dimension", () => {
    expect(extractPanSizeFromText("This recipe doubles well -- just use 2x the ingredients.")).toBeNull();
  });

  it("does not throw on empty text", () => {
    expect(extractPanSizeFromText("")).toBeNull();
  });
});

describe("guessPanSize", () => {
  it("searches across name, instructions, and ingredient lines", () => {
    const result = guessPanSize({
      name: "Weeknight Casserole",
      instructions: "Bake in a 9x13 pan at 350F for 30 minutes.",
      ingredientLines: ["2 cups flour", "1 tsp salt"],
    });
    expect(result).toEqual({ shape: "rectangle", widthIn: 9, heightIn: 13 });
  });

  it("returns null when nothing is provided", () => {
    expect(guessPanSize({})).toBeNull();
  });

  it("returns null when none of the fields mention a pan", () => {
    const result = guessPanSize({
      name: "Chili",
      instructions: "Simmer for an hour.",
      ingredientLines: ["2 lbs ground beef"],
    });
    expect(result).toBeNull();
  });
});
