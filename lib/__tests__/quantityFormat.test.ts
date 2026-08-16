import { describe, expect, it } from "vitest";
import { formatQuantity } from "../quantityFormat";

describe("formatQuantity", () => {
  it.each([
    [0, "0"],
    [1, "1"],
    [2, "2"],
    [0.5, "1/2"],
    [1.5, "1 1/2"],
    [2.25, "2 1/4"],
    [0.333, "1/3"],
    [3.3333333333333335, "3 1/3"], // 10/3 servings scaled -- float noise
    [0.125, "1/8"],
    [0.99, "1"], // snaps up and carries into the integer part
    [1.99, "2"],
    [4.625, "4 5/8"],
  ])("formats %s as %s", (input, expected) => {
    expect(formatQuantity(input)).toBe(expected);
  });

  it("handles the awkward 37/8 scale-factor case", () => {
    expect(formatQuantity(37 / 8)).toBe("4 5/8");
  });

  it("never returns a negative value", () => {
    expect(formatQuantity(-1)).toBe("0");
  });
});
