import type Database from "better-sqlite3";
import type { CookPlanDish } from "@/components/CookPlan";
import type { VariantWithIngredients } from "@/components/RecipeVariantsCard";
import { listAllVariantsForEvent, listEventRecipes } from "./repo/eventRecipes";
import { getEvent } from "./repo/events";
import { InvalidServingsError, effectiveHeadcount, scaleFactor, scaleIngredients } from "./scale";
import { aggregateIngredients, type RecipeIngredients } from "./shoppingList";
import type { Event, ScaledIngredient, ShoppingListItem } from "./types";

export interface EventPlan {
  event: Event;
  headcount: number;
  dishes: CookPlanDish[];
  shoppingList: ShoppingListItem[];
}

/**
 * Computes everything derived from an event's attached recipes -- scaled
 * dishes (for the meal plan / cook's plan) and the aggregated shopping
 * list -- in one place, so the live event page and the dedicated print
 * pages can never drift out of sync with each other.
 */
export function getEventPlan(db: Database.Database, eventId: number): EventPlan | null {
  const event = getEvent(db, eventId);
  if (!event) return null;

  const headcount = effectiveHeadcount(event);
  const attached = listEventRecipes(db, event.id);
  const allVariants = listAllVariantsForEvent(db, event.id);

  const dishes: CookPlanDish[] = attached.map(({ eventRecipe, recipe }) => {
    const variantsForRecipe = allVariants.filter((v) => v.recipeId === recipe.id);
    const variants: VariantWithIngredients[] = variantsForRecipe.map((variant) => {
      try {
        const factor = scaleFactor(recipe, variant.servings);
        return { variant, ingredients: scaleIngredients(variant.ingredients, factor), error: null };
      } catch (err) {
        const message = err instanceof InvalidServingsError ? err.message : "Couldn't scale this recipe.";
        return { variant, ingredients: null, error: message };
      }
    });
    return { recipe, course: eventRecipe.course, variants };
  });

  const shoppingListInputs: RecipeIngredients[] = dishes.flatMap((dish) =>
    dish.variants
      .filter((v): v is VariantWithIngredients & { ingredients: ScaledIngredient[] } => v.ingredients !== null)
      .map((v) => ({
        recipeName: dish.variants.length > 1 ? `${dish.recipe.name} (${v.variant.label})` : dish.recipe.name,
        ingredients: v.ingredients,
      })),
  );
  const shoppingList = aggregateIngredients(shoppingListInputs);

  return { event, headcount, dishes, shoppingList };
}
