export type PanShape = "rectangle" | "round";

export interface PanSize {
  shape: PanShape;
  widthIn?: number;
  heightIn?: number;
  diameterIn?: number;
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
];

export function panArea(size: PanSize): number {
  if (size.shape === "round") {
    const radius = (size.diameterIn ?? 0) / 2;
    return Math.PI * radius * radius;
  }
  return (size.widthIn ?? 0) * (size.heightIn ?? 0);
}

/** How many times bigger the target pan is than the native pan, by area. */
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

export function formatPanSize(size: PanSize): string {
  if (size.shape === "round") return `${size.diameterIn ?? "?"}" round`;
  return `${size.widthIn ?? "?"}" x ${size.heightIn ?? "?"}"`;
}
