import { describe, expect, it } from "vitest";
import { toolInputToPanSize } from "../panSizeAI";

describe("toolInputToPanSize", () => {
  it("returns null when nothing was found", () => {
    expect(toolInputToPanSize({ found: false })).toBeNull();
  });

  it("maps a round result", () => {
    expect(toolInputToPanSize({ found: true, shape: "round", diameterIn: 9 })).toEqual({
      shape: "round",
      diameterIn: 9,
    });
  });

  it("maps a rectangular result", () => {
    expect(toolInputToPanSize({ found: true, shape: "rectangle", widthIn: 9, heightIn: 13 })).toEqual({
      shape: "rectangle",
      widthIn: 9,
      heightIn: 13,
    });
  });

  it("maps a square result expressed as equal width and height", () => {
    expect(toolInputToPanSize({ found: true, shape: "rectangle", widthIn: 9, heightIn: 9 })).toEqual({
      shape: "rectangle",
      widthIn: 9,
      heightIn: 9,
    });
  });

  it("maps a pot result", () => {
    expect(toolInputToPanSize({ found: true, shape: "pot", quartsCapacity: 8 })).toEqual({
      shape: "pot",
      quartsCapacity: 8,
    });
  });

  it("returns null if found is true but the shape's required dimensions are missing", () => {
    expect(toolInputToPanSize({ found: true, shape: "round" })).toBeNull();
    expect(toolInputToPanSize({ found: true, shape: "rectangle", widthIn: 9 })).toBeNull();
    expect(toolInputToPanSize({ found: true, shape: "pot" })).toBeNull();
  });
});
