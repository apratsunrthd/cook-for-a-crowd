import type { PanSize } from "./panSize";

export type BufferMode = "percentage" | "flat";
export type Course = "main" | "side" | "dessert";

export interface ParsedIngredient {
  raw: string;
  quantity: number | null;
  quantity2: number | null;
  /** Canonical singular unit id, e.g. "cup", "tablespoon" -- see unitFormat.ts for display pluralization. */
  unit: string | null;
  description: string;
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
  needsReview: boolean;
  grams: number | null;
}

export interface ShoppingListItem {
  key: string;
  quantity: number | null;
  /** Canonical singular unit id -- see unitFormat.ts for display pluralization. */
  unit: string | null;
  description: string;
  needsReview: boolean;
  sources: string[];
  grams: number | null;
}
