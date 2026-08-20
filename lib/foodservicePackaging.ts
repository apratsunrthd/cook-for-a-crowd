export type FoodservicePackageCategory = "can" | "bulkBag";

export interface FoodservicePackagePreset {
  id: string;
  /** Full label for the picker, e.g. "#10 can (~6.5 lb)". */
  label: string;
  /** Short noun for pluralizing a count, e.g. "#10 can" -> "2 #10 cans". */
  unitLabel: string;
  /** Net weight in grams -- lets this share a unit with ShoppingListItem.grams instead of juggling fl oz for cans and lb for bags separately. */
  grams: number;
  category: FoodservicePackageCategory;
}

// Common bulk/institutional package sizes -- for someone with access to a
// commercial kitchen or a warehouse club who'd rather buy a #10 can of
// green beans than a dozen consumer-size 14.5oz cans. Weights are
// approximate (a #10 can's net weight varies some by product); good enough
// for "how many do I need to buy," the same tolerance every other rounding
// rule in this app already accepts.
export const FOODSERVICE_PACKAGE_PRESETS: FoodservicePackagePreset[] = [
  { id: "can-10", label: "#10 can (~6.5 lb)", unitLabel: "#10 can", grams: 2948, category: "can" },
  { id: "can-5", label: "#5 can (~3.5 lb)", unitLabel: "#5 can", grams: 1588, category: "can" },
  { id: "bag-5lb", label: "5 lb bag", unitLabel: "5 lb bag", grams: 2268, category: "bulkBag" },
  { id: "bag-10lb", label: "10 lb bag", unitLabel: "10 lb bag", grams: 4536, category: "bulkBag" },
  { id: "bag-25lb", label: "25 lb bag", unitLabel: "25 lb bag", grams: 11340, category: "bulkBag" },
  { id: "bag-50lb", label: "50 lb bag", unitLabel: "50 lb bag", grams: 22680, category: "bulkBag" },
];

// Dry staples that only ever show up as a bulk bag foodservice purchase --
// deliberately narrow (no "cheese", no "butter") rather than guessing at a
// package form nobody actually sells that ingredient in. An ingredient not
// covered here just doesn't get a "buy as" option, same tolerance as
// leaving a weight estimate null rather than guessing it wrong.
const BULK_BAG_KEYWORDS = [
  "flour",
  "sugar",
  "rice",
  "oats",
  "cornmeal",
  "cornstarch",
  "corn starch",
  "breadcrumbs",
  "bread crumbs",
  "panko",
  "grits",
  "dried bean",
  "dry bean",
  "black bean",
  "pinto bean",
  "kidney bean",
  "navy bean",
  "lentil",
  "pasta",
  "noodle",
  "macaroni",
  "spaghetti",
  "penne",
  "rotini",
];

/**
 * What kind of bulk package (if any) makes sense to buy this ingredient
 * as -- a canned vegetable comes in a #10 can, a bag of flour comes in a
 * 25 lb bag, but nobody sells a #10 can of butter. `unit === "can"` is a
 * strong, already-parsed signal (the recipe itself said "cans"); dry bulk
 * staples are recognized by keyword since they're normally measured by
 * volume (cups, tablespoons) rather than by a count unit.
 */
export function foodservicePackageCategoryFor(
  item: { unit: string | null; description: string },
): FoodservicePackageCategory | null {
  if (item.unit === "can") return "can";
  const lower = item.description.toLowerCase();
  if (BULK_BAG_KEYWORDS.some((keyword) => lower.includes(keyword))) return "bulkBag";
  return null;
}

/** How many of a bulk package to buy to cover a total weight -- always rounds up, same rule as every other purchase-unit calculation in this app. */
export function foodservicePackagesNeeded(totalGrams: number, packageGrams: number): number {
  if (totalGrams <= 0 || packageGrams <= 0) return 0;
  return Math.ceil(totalGrams / packageGrams);
}
