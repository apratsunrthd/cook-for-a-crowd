import { unitsOfMeasure } from "parse-ingredient";

/**
 * Renders a canonical unit id for display, pluralizing it to match the
 * given quantity (e.g. "cup" for 1, "cups" for 2.5). `unitsOfMeasure` ids
 * are always the singular form, so this just looks up the matching plural.
 */
export function pluralizeUnit(unitId: string | null, quantity: number | null): string | null {
  if (!unitId) return null;
  const isSingular = quantity !== null && Math.abs(quantity - 1) < 1e-9;
  if (isSingular) return unitId;
  return unitsOfMeasure[unitId]?.plural ?? `${unitId}s`;
}
