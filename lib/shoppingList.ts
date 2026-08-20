import { formatGrams } from "./ingredientWeight";
import { formatQuantity } from "./quantityFormat";
import { pluralizeUnit } from "./unitFormat";
import type { ScaledIngredient, ShoppingListItem } from "./types";

function addGrams(a: number | null, b: number | null): number | null {
  if (a === null && b === null) return null;
  return (a ?? 0) + (b ?? 0);
}

export interface RecipeIngredients {
  recipeName: string;
  ingredients: ScaledIngredient[];
}

// Prep clauses that commonly differ between two recipes calling for the
// same base ingredient ("1 onion, diced" vs "1 onion, sliced"). Stripped
// only for the *matching key* -- the original description is still shown.
const PREP_CLAUSE = new RegExp(
  ",?\\s*(diced|chopped|minced|sliced|grated|crushed|melted|softened|peeled|cubed|shredded|julienned)\\b.*$",
  "i",
);

function normalizeForMatching(description: string): string {
  return description.toLowerCase().replace(PREP_CLAUSE, "").trim();
}

function matchKey(unit: string | null, description: string): string {
  return `${(unit ?? "").toLowerCase().trim()}|${normalizeForMatching(description)}`;
}

/**
 * Combines ingredients from every recipe attached to an event into a single
 * shopping list. Items with the same unit and (normalized) description are
 * summed; everything else -- including lines that couldn't be scaled at all
 * -- is listed separately and flagged for manual review.
 */
export function aggregateIngredients(recipes: RecipeIngredients[]): ShoppingListItem[] {
  const merged = new Map<string, ShoppingListItem>();
  const needsReview: ShoppingListItem[] = [];

  for (const { recipeName, ingredients } of recipes) {
    for (const ingredient of ingredients) {
      if (ingredient.needsReview || ingredient.quantity === null) {
        needsReview.push({
          key: `review:${recipeName}:${ingredient.raw}`,
          quantity: null,
          unit: ingredient.unit,
          description: ingredient.description || ingredient.raw,
          sizeAnnotation: ingredient.sizeAnnotation,
          needsReview: true,
          sources: [recipeName],
          grams: ingredient.grams,
        });
        continue;
      }

      const value =
        ingredient.quantity2 === null
          ? ingredient.quantity
          : (ingredient.quantity + ingredient.quantity2) / 2;

      const key = matchKey(ingredient.unit, ingredient.description);
      const existing = merged.get(key);
      if (existing && existing.quantity !== null) {
        existing.quantity += value;
        existing.grams = addGrams(existing.grams, ingredient.grams);
        if (!existing.sources.includes(recipeName)) {
          existing.sources.push(recipeName);
        }
      } else {
        merged.set(key, {
          key,
          quantity: value,
          unit: ingredient.unit,
          description: ingredient.description,
          sizeAnnotation: ingredient.sizeAnnotation,
          needsReview: false,
          sources: [recipeName],
          grams: ingredient.grams,
        });
      }
    }
  }

  return [...merged.values(), ...needsReview];
}

export function formatShoppingListItem(item: ShoppingListItem): string {
  if (item.quantity === null) {
    return item.description;
  }
  const unit = pluralizeUnit(item.unit, item.quantity);
  const sizeAnnotation = item.sizeAnnotation ? `(${item.sizeAnnotation})` : null;
  const parts = [formatQuantity(item.quantity), sizeAnnotation, unit, item.description].filter(
    (part): part is string => !!part && part.length > 0,
  );
  const line = parts.join(" ");
  return item.grams !== null ? `${line} (${formatGrams(item.grams)})` : line;
}
