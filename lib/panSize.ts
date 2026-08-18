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

/**
 * A single "capacity" number for a vessel -- square inches of footprint for
 * a baking pan, quarts for a pot. The two units are never compared against
 * each other in practice (nobody switches a casserole to a stockpot), so
 * sharing one function keeps every ratio/scaling call site shape-agnostic.
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

/** Presets in the same vessel family as `nativeSize` -- pots only offer other pots, pans only offer other pans, since switching families (e.g. a stockpot to a sheet pan) isn't a real choice anyone makes. */
export function panPresetsForFamily(nativeSize: PanSize): PanPreset[] {
  const nativeIsPot = nativeSize.shape === "pot";
  return PAN_PRESETS.filter((p) => (p.size.shape === "pot") === nativeIsPot);
}

export function formatPanSize(size: PanSize): string {
  if (size.shape === "round") return `${size.diameterIn ?? "?"}" round`;
  if (size.shape === "pot") return `${size.quartsCapacity ?? "?"} qt pot`;
  return `${size.widthIn ?? "?"}" x ${size.heightIn ?? "?"}"`;
}
