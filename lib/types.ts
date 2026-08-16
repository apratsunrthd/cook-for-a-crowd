export type BufferMode = "percentage" | "flat";

export interface ParsedIngredient {
  raw: string;
  quantity: number | null;
  quantity2: number | null;
  /** Canonical singular unit id, e.g. "cup", "tablespoon" -- see unitFormat.ts for display pluralization. */
  unit: string | null;
  description: string;
  isGroupHeader: boolean;
  needsReview: boolean;
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
  headcountOverride: number | null;
  notes: string | null;
}

export interface ScaledIngredient {
  raw: string;
  quantity: number | null;
  quantity2: number | null;
  /** Canonical singular unit id -- see unitFormat.ts for display pluralization. */
  unit: string | null;
  description: string;
  needsReview: boolean;
}

export interface ShoppingListItem {
  key: string;
  quantity: number | null;
  /** Canonical singular unit id -- see unitFormat.ts for display pluralization. */
  unit: string | null;
  description: string;
  needsReview: boolean;
  sources: string[];
}
