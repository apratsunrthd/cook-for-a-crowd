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
