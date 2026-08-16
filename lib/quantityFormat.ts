// Common cooking fractions, in eighths and thirds -- the only denominators
// that show up in practice on a recipe card. A lookup table is simpler and
// sufficient here; a general continued-fraction search would be overkill.
const COOKING_FRACTIONS: Array<{ value: number; label: string }> = [
  { value: 0, label: "" },
  { value: 1 / 8, label: "1/8" },
  { value: 1 / 4, label: "1/4" },
  { value: 1 / 3, label: "1/3" },
  { value: 3 / 8, label: "3/8" },
  { value: 1 / 2, label: "1/2" },
  { value: 5 / 8, label: "5/8" },
  { value: 2 / 3, label: "2/3" },
  { value: 3 / 4, label: "3/4" },
  { value: 7 / 8, label: "7/8" },
  { value: 1, label: "1" },
];

/**
 * Formats a scaled quantity for display, snapping the fractional part to
 * the nearest common cooking fraction (eighths/thirds) instead of showing
 * long decimals like "3.3333333333335".
 */
export function formatQuantity(n: number): string {
  if (!Number.isFinite(n)) return "";
  if (n < 0) return "0";

  const whole = Math.floor(n);
  const frac = n - whole;

  let closest = COOKING_FRACTIONS[0];
  let closestDiff = Math.abs(frac - closest.value);
  for (const candidate of COOKING_FRACTIONS) {
    const diff = Math.abs(frac - candidate.value);
    if (diff < closestDiff) {
      closest = candidate;
      closestDiff = diff;
    }
  }

  // Snapped fraction rounded up to a whole -> carry into the integer part.
  if (closest.value === 1) {
    return String(whole + 1);
  }
  if (closest.value === 0) {
    return String(whole);
  }
  if (whole === 0) {
    return closest.label;
  }
  return `${whole} ${closest.label}`;
}
