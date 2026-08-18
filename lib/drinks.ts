export interface DrinkPackagePreset {
  id: string;
  label: string;
  unitLabel: string;
  sizeOz: number;
}

// Fluid-ounce sizes for common ways drinks show up at a group event --
// cans/bottles of soda, gallons of tea or lemonade, cases of bottled water.
// Tracked per individual purchasable unit (one can, one jug), not by the
// case/pack, so "how many do I need" stays a single division.
export const DRINK_PACKAGE_PRESETS: DrinkPackagePreset[] = [
  { id: "can-12oz", label: "12 fl oz can", unitLabel: "can", sizeOz: 12 },
  { id: "bottle-16.9oz", label: "16.9 fl oz bottle (500 mL)", unitLabel: "bottle", sizeOz: 16.9 },
  { id: "bottle-20oz", label: "20 fl oz bottle", unitLabel: "bottle", sizeOz: 20 },
  { id: "bottle-1L", label: "1 liter bottle", unitLabel: "bottle", sizeOz: 33.8 },
  { id: "bottle-2L", label: "2 liter bottle", unitLabel: "bottle", sizeOz: 67.6 },
  { id: "jug-half-gallon", label: "Half-gallon jug", unitLabel: "jug", sizeOz: 64 },
  { id: "jug-gallon", label: "Gallon jug", unitLabel: "gallon", sizeOz: 128 },
];

export const DEFAULT_DRINK_SERVING_OZ = 8;

/**
 * How many purchasable units (cans, jugs, bottles) to buy so `packageSizeOz`
 * units of `servingSizeOz` each cover `targetHeadcount` people -- always
 * rounds up, same "never leave anyone short" rule as pan/batch math.
 */
export function drinkUnitsNeeded(targetHeadcount: number, servingSizeOz: number, packageSizeOz: number): number {
  if (packageSizeOz <= 0 || targetHeadcount <= 0 || servingSizeOz <= 0) return 0;
  return Math.ceil((targetHeadcount * servingSizeOz) / packageSizeOz);
}

/**
 * Not everyone at an event drinks every drink on offer -- someone having
 * sweet tea skips the lemonade. Rather than sizing every drink as if it
 * alone covers the whole headcount (wildly over-buying once you offer more
 * than one option), a drink with no explicit target headcount splits the
 * event's headcount evenly with the other auto-split drinks, AFTER setting
 * aside whatever headcount has been explicitly assigned elsewhere. This
 * naturally covers every case: one drink with no target gets everyone
 * (unchanged from before multiple drinks existed); a manually-tuned drink
 * ("only ~10 people will want soda") is honored exactly, and the remaining
 * headcount splits evenly across whatever's left unset -- no separate
 * "share %" concept for the user to manage, just the same targetHeadcount
 * field every drink already has, used a little more intelligently.
 */
export function splitDrinkHeadcounts(
  drinks: Array<{ id: number; targetHeadcount: number | null }>,
  eventHeadcount: number,
): Map<number, number> {
  const result = new Map<number, number>();
  const customized = drinks.filter((d) => d.targetHeadcount !== null);
  const auto = drinks.filter((d) => d.targetHeadcount === null);

  for (const drink of customized) {
    result.set(drink.id, drink.targetHeadcount as number);
  }

  if (auto.length === 0) return result;

  const customizedTotal = customized.reduce((sum, d) => sum + (d.targetHeadcount as number), 0);
  const remaining = Math.max(0, eventHeadcount - customizedTotal);
  const share = Math.ceil(remaining / auto.length);
  for (const drink of auto) {
    result.set(drink.id, share);
  }
  return result;
}
