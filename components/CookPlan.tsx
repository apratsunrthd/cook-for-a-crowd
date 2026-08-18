import { formatPanSize, servingsPerPan, vesselNoun, type PanSize } from "@/lib/panSize";
import { batchesNeeded, formatScaledIngredient, scaleIngredients } from "@/lib/scale";
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
 * since "make 9.5x the recipe" isn't an instruction a kitchen can follow --
 * and then breaks the ingredients down PER PAN, since "make 10 pans" is
 * still not actionable on its own once you're standing at the counter.
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

  return (
    <div className="rounded-md border border-black/10 dark:border-white/10 p-3 space-y-3">
      <div className="font-medium">{recipe.name}</div>
      {variants.map(({ variant }) => (
        <VariantPlan key={variant.id} recipe={recipe} variant={variant} showLabel={variants.length > 1} />
      ))}
    </div>
  );
}

function VariantPlan({
  recipe,
  variant,
  showLabel,
}: {
  recipe: Recipe;
  variant: VariantWithIngredients["variant"];
  showLabel: boolean;
}) {
  const panSize: PanSize | null = variant.panSize ?? recipe.panSize;
  const perPanServings =
    recipe.servings && panSize && recipe.panSize
      ? servingsPerPan(recipe.servings, recipe.panSize, panSize)
      : recipe.servings;
  const batches = perPanServings ? batchesNeeded(variant.servings, perPanServings) : null;
  const noun = vesselNoun(panSize);
  // formatPanSize already spells out "qt pot" for a pot, so only a pan
  // needs the noun appended to read as a vessel ("9" x 13" pan").
  const panLabel = panSize ? ` (${formatPanSize(panSize)}${noun === "pot" ? "" : ` ${noun}`})` : "";

  const header = (
    <div className="text-sm font-medium">
      {batches !== null
        ? `Make ${batches} ${batches === 1 ? noun : `${noun}s`}${panLabel}, ${perPanServings} people per ${noun}`
        : `Make enough for ${variant.servings} people`}
      {showLabel && <> &mdash; {variant.label}</>}
      {variant.notes && (
        <span className="italic text-black/60 dark:text-white/60"> ({variant.notes})</span>
      )}
    </div>
  );

  if (batches === null || !perPanServings || !recipe.servings) {
    return header;
  }

  const perPanFactor = perPanServings / recipe.servings;
  const perPanIngredients = scaleIngredients(variant.ingredients, perPanFactor);

  return (
    <div className="space-y-1">
      {header}
      <div className="text-xs text-black/60 dark:text-white/60">Per {noun}:</div>
      <ul className="text-sm pl-4 list-disc space-y-0.5">
        {perPanIngredients.map((ingredient, idx) => (
          <li key={idx} className={ingredient.needsReview ? "text-amber-600 dark:text-amber-400" : undefined}>
            {formatScaledIngredient(ingredient)}
          </li>
        ))}
      </ul>
    </div>
  );
}
