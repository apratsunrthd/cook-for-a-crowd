import { formatPanSize } from "@/lib/panSize";
import { batchesNeeded } from "@/lib/scale";
import type { Course, Recipe } from "@/lib/types";
import type { VariantWithIngredients } from "./RecipeVariantsCard";

const COURSE_LABELS: Record<Course, string> = { main: "Mains", side: "Sides", dessert: "Desserts" };
const COURSE_ORDER: Course[] = ["main", "side", "dessert"];

export interface CookPlanDish {
  recipe: Recipe;
  course: Course;
  variants: VariantWithIngredients[];
}

/**
 * The day-of answer to "what do I actually make" -- distinct from the meal
 * plan (where you set up recipes and variants) and the shopping list (what
 * to buy). Turns each variant's target headcount into a whole pan count,
 * since "make 9.5x the recipe" isn't an instruction a kitchen can follow.
 */
export function CookPlan({ dishes }: { dishes: CookPlanDish[] }) {
  if (dishes.length === 0) return null;

  return (
    <div className="space-y-4 print:break-inside-avoid">
      <h2 className="text-lg font-semibold">Cook&apos;s plan</h2>
      {COURSE_ORDER.map((course) => {
        const dishesForCourse = dishes.filter((d) => d.course === course);
        if (dishesForCourse.length === 0) return null;
        return (
          <div key={course} className="space-y-2">
            <h3 className="text-sm font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
              {COURSE_LABELS[course]}
            </h3>
            <ul className="space-y-2">
              {dishesForCourse.map((dish) => (
                <li key={dish.recipe.id}>
                  <DishPlan dish={dish} />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function DishPlan({ dish }: { dish: CookPlanDish }) {
  const { recipe, variants } = dish;
  const panLabel = recipe.panSize ? ` (${formatPanSize(recipe.panSize)} pan)` : "";

  return (
    <div className="rounded-md border border-black/10 dark:border-white/10 p-3">
      <div className="font-medium">{recipe.name}</div>
      <ul className="mt-1 space-y-1 text-sm">
        {variants.map(({ variant }) => {
          const batches = recipe.servings ? batchesNeeded(variant.servings, recipe.servings) : null;
          const instruction =
            batches !== null
              ? `Make ${batches} ${batches === 1 ? "pan" : "pans"}${panLabel}`
              : `Make enough for ${variant.servings} people`;
          return (
            <li key={variant.id}>
              {instruction}
              {variants.length > 1 && <> &mdash; {variant.label}</>}
              {variant.notes && (
                <span className="italic text-black/60 dark:text-white/60"> ({variant.notes})</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
