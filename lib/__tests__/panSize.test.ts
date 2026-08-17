import { describe, expect, it } from "vitest";
import { PAN_PRESETS, formatPanSize, panArea, panAreaRatio } from "../panSize";

describe("panArea", () => {
  it("computes area for a rectangular pan", () => {
    expect(panArea({ shape: "rectangle", widthIn: 9, heightIn: 13 })).toBe(117);
  });

  it("computes area for a round pan", () => {
    expect(panArea({ shape: "round", diameterIn: 10 })).toBeCloseTo(Math.PI * 25, 5);
  });
});

describe("panAreaRatio", () => {
  it("computes how many 9x13s fit a half sheet pan", () => {
    const nineByThirteen = PAN_PRESETS.find((p) => p.id === "9x13")!.size;
    const halfSheet = PAN_PRESETS.find((p) => p.id === "half-sheet")!.size;
    // 13*18 = 234, 9*13 = 117 -> ratio 2.0
    expect(panAreaRatio(nineByThirteen, halfSheet)).toBeCloseTo(2.0, 5);
  });

  it("returns 1 when scaling to the same pan", () => {
    const size = { shape: "rectangle" as const, widthIn: 9, heightIn: 13 };
    expect(panAreaRatio(size, size)).toBe(1);
  });

  it("does not divide by zero for a malformed native size", () => {
    expect(panAreaRatio({ shape: "rectangle" }, { shape: "rectangle", widthIn: 9, heightIn: 9 })).toBe(1);
  });
});

describe("formatPanSize", () => {
  it("formats a rectangular pan", () => {
    expect(formatPanSize({ shape: "rectangle", widthIn: 9, heightIn: 13 })).toBe('9" x 13"');
  });

  it("formats a round pan", () => {
    expect(formatPanSize({ shape: "round", diameterIn: 9 })).toBe('9" round');
  });
});
