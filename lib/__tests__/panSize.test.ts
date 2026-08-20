import { describe, expect, it } from "vitest";
import { PAN_PRESETS, formatPanSize, panArea, panAreaRatio, servingsPerPan } from "../panSize";

describe("panArea", () => {
  it("computes area for a rectangular pan", () => {
    expect(panArea({ shape: "rectangle", widthIn: 9, heightIn: 13 })).toBe(117);
  });

  it("computes area for a round pan", () => {
    expect(panArea({ shape: "round", diameterIn: 10 })).toBeCloseTo(Math.PI * 25, 5);
  });
});

describe("panArea for pots", () => {
  it("uses quarts capacity directly as the pot's capacity", () => {
    expect(panArea({ shape: "pot", quartsCapacity: 8 })).toBe(8);
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

describe("servingsPerPan", () => {
  it("computes the capacity of a bigger target pan (the user's 9x9 -> 9x13 case)", () => {
    const nineByNine = { shape: "rectangle" as const, widthIn: 9, heightIn: 9 };
    const nineByThirteen = { shape: "rectangle" as const, widthIn: 9, heightIn: 13 };
    // 6 servings at 9x9 (area 81) -> 9x13 (area 117): 6 * 117/81 = 8.67 -> 9
    expect(servingsPerPan(6, nineByNine, nineByThirteen)).toBe(9);
  });

  it("returns the native servings when target equals native", () => {
    const size = { shape: "rectangle" as const, widthIn: 9, heightIn: 13 };
    expect(servingsPerPan(8, size, size)).toBe(8);
  });

  it("scales by capacity when switching between pots", () => {
    const sixQt = { shape: "pot" as const, quartsCapacity: 6 };
    const twelveQt = { shape: "pot" as const, quartsCapacity: 12 };
    expect(servingsPerPan(6, sixQt, twelveQt)).toBe(12);
  });
});

describe("steam table pan presets", () => {
  it("includes the standard full/half/third/sixth/ninth sizes, each roughly the expected fraction of full", () => {
    const full = PAN_PRESETS.find((p) => p.id === "steam-full")!.size;
    const half = PAN_PRESETS.find((p) => p.id === "steam-half")!.size;
    const third = PAN_PRESETS.find((p) => p.id === "steam-third")!.size;
    const sixth = PAN_PRESETS.find((p) => p.id === "steam-sixth")!.size;
    const ninth = PAN_PRESETS.find((p) => p.id === "steam-ninth")!.size;

    expect(panAreaRatio(full, half)).toBeCloseTo(0.5, 1);
    expect(panAreaRatio(full, third)).toBeCloseTo(1 / 3, 1);
    expect(panAreaRatio(full, sixth)).toBeCloseTo(1 / 6, 1);
    expect(panAreaRatio(full, ninth)).toBeCloseTo(1 / 9, 1);
  });
});

describe("formatPanSize", () => {
  it("formats a rectangular pan", () => {
    expect(formatPanSize({ shape: "rectangle", widthIn: 9, heightIn: 13 })).toBe('9" x 13"');
  });

  it("formats a round pan", () => {
    expect(formatPanSize({ shape: "round", diameterIn: 9 })).toBe('9" round');
  });

  it("formats a pot", () => {
    expect(formatPanSize({ shape: "pot", quartsCapacity: 12 })).toBe("12 qt pot");
  });
});
