import type { PanSize } from "./panSize";

export type BufferMode = "percentage" | "flat";
export type Course = "main" | "side" | "dessert";

export const COURSE_LABELS: Record<Course, string> = { main: "Mains", side: "Sides", dessert: "Desserts" };
export const COURSE_ORDER: Course[] = ["main", "side", "dessert"];

export interface ParsedIngredient {
  raw: string;
  quantity: number | null;
  quantity2: number | null;
  /** Canonical singular unit id, e.g. "cup", "tablespoon" -- see unitFormat.ts for display pluralization. */
  unit: string | null;
  description: string;
  /** Per-unit size, e.g. "14.5 oz" for "10 (14.5 oz) cans ..." -- kept separate from `description` (rather than baked in) so it can be re-emitted in its original leading position every time this line is reformatted after scaling. Baking it into `description` instead would drift it to a trailing position on the next parse, which reads as "total weight of the stated quantity" rather than "size of one unit" -- a real bug this field exists to prevent. */
  sizeAnnotation: string | null;
  isGroupHeader: boolean;
  needsReview: boolean;
  /** Weight of this line at its raw (unscaled) quantity, in grams, if it could be determined -- see ingredientWeight.ts. Scales proportionally with quantity. */
  gramsAtRawQuantity: number | null;
  /** Whether this ingredient's quantity must stay a whole number when scaled (a chicken breast, an egg) vs. can be used fractionally (a can, a cup) -- see ingredientDivisibility.ts. */
  roundsToWhole: boolean;
}

export interface Recipe {
  id: number;
  name: string;
  sourceUrl: string | null;
  servings: number | null;
  rawYieldText: string | null;
  ingredients: ParsedIngredient[];
  instructions: string | null;
  imageUrl: string | null;
  /** The recipe's native pan/dish size, if recorded -- lets variants scale by pan-area ratio. */
  panSize: PanSize | null;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: number;
  name: string;
  eventDate: string | null;
  rsvpCount: number;
  bufferMode: BufferMode;
  bufferValue: number;
  createdAt: string;
  updatedAt: string;
}

export interface EventRecipe {
  eventId: number;
  recipeId: number;
  course: Course;
}

/**
 * One way a dish is being made for an event -- e.g. "Standard" (4 batches),
 * "Gluten-free topping" (1 batch), "No poppy seed" (1 batch). Each variant
 * scales the recipe independently to its own target headcount and can carry
 * its own modification notes for a food sensitivity.
 */
export interface RecipeVariant {
  id: number;
  eventId: number;
  recipeId: number;
  label: string;
  servings: number;
  notes: string | null;
  /** This variant's own editable copy of the recipe's ingredients -- lets a variant remove or swap an ingredient, not just note the change. */
  ingredients: ParsedIngredient[];
  /** Overrides the recipe's native pan for this variant only (e.g. baking this batch in a 9x13 instead of the recipe's native 9x9). Null = use the recipe's own pan. */
  panSize: PanSize | null;
}

export interface ScaledIngredient {
  raw: string;
  quantity: number | null;
  quantity2: number | null;
  /** Canonical singular unit id -- see unitFormat.ts for display pluralization. */
  unit: string | null;
  description: string;
  sizeAnnotation: string | null;
  needsReview: boolean;
  grams: number | null;
}

export interface ShoppingListItem {
  key: string;
  quantity: number | null;
  /** Canonical singular unit id -- see unitFormat.ts for display pluralization. */
  unit: string | null;
  description: string;
  /** Per-unit size, e.g. "14.5 oz" for a can -- from the first merged ingredient line that had one. Recipes calling for a different can size for the same item is an accepted, documented limitation, same as the plural/singular merge gap below. */
  sizeAnnotation: string | null;
  needsReview: boolean;
  sources: string[];
  grams: number | null;
}

/**
 * A drink to buy for an event -- teas, lemonade, soda, bottled water. Sized
 * by fluid ounces rather than by recipe ingredients: how big one purchased
 * unit is (a can, a gallon jug), how much one person is assumed to drink,
 * and how many people it needs to cover. See lib/drinks.ts for the math.
 */
export interface EventDrink {
  id: number;
  eventId: number;
  name: string;
  /** Display label for one purchased unit, e.g. "can", "bottle", "gallon jug". */
  unitLabel: string;
  packageSizeOz: number;
  servingSizeOz: number;
  /** Null = use the event's own effective headcount. */
  targetHeadcount: number | null;
  notes: string | null;
}

/**
 * A simple per-person consumable for an event -- plates, napkins, utensils,
 * ice. Unlike drinks (which vary a lot by package size and person-to-person
 * preference), these are well-established per-person multipliers with no
 * real judgment call involved, so there's no AI suggestion step -- just a
 * default multiplier the user can override. `unit` is a free label (e.g.
 * "plate", "lb") so the same shape covers both counted and weighed items.
 */
export interface EventSupply {
  id: number;
  eventId: number;
  name: string;
  unit: string;
  perPersonQuantity: number;
  /** Null = use the event's own effective headcount. */
  targetHeadcount: number | null;
  notes: string | null;
}

/**
 * A dish that's being bought or ordered rather than cooked from a recipe --
 * a store-bought dessert, a catering order. No ingredients to scale; just
 * enough to remember it's part of the plan and how much was ordered.
 */
export interface EventPurchasedItem {
  id: number;
  eventId: number;
  name: string;
  course: Course;
  quantityNote: string;
  notes: string | null;
}
