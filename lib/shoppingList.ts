import { formatQuantity } from "./quantityFormat";
import { pluralizeUnit } from "./unitFormat";
import type { ScaledIngredient, ShoppingListItem } from "./types";

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
          needsReview: true,
          sources: [recipeName],
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
        if (!existing.sources.includes(recipeName)) {
          existing.sources.push(recipeName);
        }
      } else {
        merged.set(key, {
          key,
          quantity: value,
          unit: ingredient.unit,
          description: ingredient.description,
          needsReview: false,
          sources: [recipeName],
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
  const parts = [formatQuantity(item.quantity), unit, item.description].filter(
    (part): part is string => !!part && part.length > 0,
  );
  return parts.join(" ");
}
