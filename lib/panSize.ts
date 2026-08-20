export type PanShape = "rectangle" | "round" | "pot";

export interface PanSize {
  shape: PanShape;
  widthIn?: number;
  heightIn?: number;
  diameterIn?: number;
  /** For shape "pot" -- not every recipe bakes in a pan; some (rice, soup, stovetop dishes) are sized by pot capacity instead. */
  quartsCapacity?: number;
}

export interface PanPreset {
  id: string;
  label: string;
  size: PanSize;
}

export const PAN_PRESETS: PanPreset[] = [
  { id: "8x8", label: '8" x 8" square', size: { shape: "rectangle", widthIn: 8, heightIn: 8 } },
  { id: "9x9", label: '9" x 9" square', size: { shape: "rectangle", widthIn: 9, heightIn: 9 } },
  {
    id: "9x13",
    label: '9" x 13" (standard casserole)',
    size: { shape: "rectangle", widthIn: 9, heightIn: 13 },
  },
  {
    id: "half-sheet",
    label: 'Half sheet pan (13" x 18")',
    size: { shape: "rectangle", widthIn: 13, heightIn: 18 },
  },
  {
    id: "full-sheet",
    label: 'Full sheet pan (18" x 26")',
    size: { shape: "rectangle", widthIn: 18, heightIn: 26 },
  },
  // Steam table / hotel pans -- a different standard from home baking sheet
  // pans despite the similar full/half naming, for anyone with access to a
  // commercial kitchen's steam table or chafing setup. Depth isn't tracked
  // here, matching every other rectangular pan in this list (a 9x13 doesn't
  // record depth either) -- just footprint, which is what area-ratio
  // scaling actually uses.
  {
    id: "steam-full",
    label: 'Full-size steam table pan (20¾" x 12¾")',
    size: { shape: "rectangle", widthIn: 20.75, heightIn: 12.75 },
  },
  {
    id: "steam-half",
    label: 'Half-size steam table pan (12¾" x 10⅜")',
    size: { shape: "rectangle", widthIn: 12.75, heightIn: 10.375 },
  },
  {
    id: "steam-third",
    label: 'Third-size steam table pan (12¾" x 6⅞")',
    size: { shape: "rectangle", widthIn: 12.75, heightIn: 6.875 },
  },
  {
    id: "steam-sixth",
    label: 'Sixth-size steam table pan (6⅞" x 6⅜")',
    size: { shape: "rectangle", widthIn: 6.875, heightIn: 6.375 },
  },
  {
    id: "steam-ninth",
    label: 'Ninth-size steam table pan (6⅞" x 4¼")',
    size: { shape: "rectangle", widthIn: 6.875, heightIn: 4.25 },
  },
  { id: "loaf-8x4", label: '8" x 4" loaf', size: { shape: "rectangle", widthIn: 8, heightIn: 4 } },
  { id: "loaf-9x5", label: '9" x 5" loaf', size: { shape: "rectangle", widthIn: 9, heightIn: 5 } },
  { id: "round-8", label: '8" round', size: { shape: "round", diameterIn: 8 } },
  { id: "round-9", label: '9" round', size: { shape: "round", diameterIn: 9 } },
  { id: "round-10", label: '10" round', size: { shape: "round", diameterIn: 10 } },
  // Not everything bakes in a pan -- rice, soup, chili, and other stovetop
  // dishes are sized by pot capacity instead. Same area-ratio scaling math
  // applies, just against quarts of capacity rather than square inches.
  { id: "pot-2qt", label: "2 qt saucepan", size: { shape: "pot", quartsCapacity: 2 } },
  { id: "pot-4qt", label: "4 qt pot", size: { shape: "pot", quartsCapacity: 4 } },
  { id: "pot-6qt", label: "6 qt pot", size: { shape: "pot", quartsCapacity: 6 } },
  { id: "pot-8qt", label: "8 qt stock pot", size: { shape: "pot", quartsCapacity: 8 } },
  { id: "pot-12qt", label: "12 qt stock pot", size: { shape: "pot", quartsCapacity: 12 } },
  { id: "pot-16qt", label: "16 qt stock pot (large)", size: { shape: "pot", quartsCapacity: 16 } },
  { id: "pot-20qt", label: "20 qt stock pot (large)", size: { shape: "pot", quartsCapacity: 20 } },
  { id: "pot-32qt", label: "32 qt stock pot (very large)", size: { shape: "pot", quartsCapacity: 32 } },
];

/** Standard pot sizes in quarts, smallest first -- the only sizes anyone actually owns, and the only ones a vessel suggestion (human or AI) should ever land on. */
export const STANDARD_POT_QUARTS: number[] = PAN_PRESETS.filter((p) => p.size.shape === "pot")
  .map((p) => p.size.quartsCapacity as number)
  .sort((a, b) => a - b);

/**
 * Whether two vessels are in the same pot-vs-pan family. Square inches of
 * footprint and quarts of capacity aren't on a comparable scale, so a ratio
 * between them (panAreaRatio, servingsPerPan) is only meaningful within a
 * family -- callers computing "how many people does this vessel feed"
 * across a pot/pan switch (e.g. green beans moving from a stovetop pot to a
 * steam table pan for serving) need a real headcount from the user instead,
 * not an area-ratio guess. See PanRescaleField and PanSizeCalculator.
 */
export function sameVesselFamily(a: PanSize, b: PanSize): boolean {
  return (a.shape === "pot") === (b.shape === "pot");
}

/**
 * A single "capacity" number for a vessel -- square inches of footprint for
 * a baking pan, quarts for a pot. Only meaningful when comparing two
 * vessels in the same family -- see sameVesselFamily.
 */
export function panArea(size: PanSize): number {
  if (size.shape === "round") {
    const radius = (size.diameterIn ?? 0) / 2;
    return Math.PI * radius * radius;
  }
  if (size.shape === "pot") {
    return size.quartsCapacity ?? 0;
  }
  return (size.widthIn ?? 0) * (size.heightIn ?? 0);
}

/** How many times bigger the target vessel is than the native one, by capacity. */
export function panAreaRatio(nativeSize: PanSize, targetSize: PanSize): number {
  const nativeArea = panArea(nativeSize);
  if (nativeArea <= 0) return 1;
  return panArea(targetSize) / nativeArea;
}

/**
 * How many people one pan of `targetSize` feeds, given the recipe's native
 * servings and the pan it was written for. This is the number a batch count
 * should divide by once a different pan size is in play -- a 9x13 holds
 * more per pan than the 9x9 the recipe was written for, so "how many pans"
 * has to use the new pan's capacity, not the recipe's original one.
 */
export function servingsPerPan(nativeServings: number, nativeSize: PanSize, targetSize: PanSize): number {
  return Math.round(nativeServings * panAreaRatio(nativeSize, targetSize));
}

/** "pot" or "pan" -- for building UI copy that reads right for either vessel family. */
export function vesselNoun(size: PanSize | null): string {
  return size?.shape === "pot" ? "pot" : "pan";
}

export function formatPanSize(size: PanSize): string {
  if (size.shape === "round") return `${size.diameterIn ?? "?"}" round`;
  if (size.shape === "pot") return `${size.quartsCapacity ?? "?"} qt pot`;
  return `${size.widthIn ?? "?"}" x ${size.heightIn ?? "?"}"`;
}
