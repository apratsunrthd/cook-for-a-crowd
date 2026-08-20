import { formatPanSize, sameVesselFamily, servingsPerPan, vesselNoun, type PanSize } from "@/lib/panSize";
import { batchesNeeded, formatScaledIngredient, scaleIngredients } from "@/lib/scale";
import { COURSE_LABELS, COURSE_ORDER, type Course, type Recipe } from "@/lib/types";
import type { VariantWithIngredients } from "./RecipeVariantsCard";

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
      {recipe.instructions && (
        <div className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
            Directions
          </div>
          <div className="text-sm whitespace-pre-line">{recipe.instructions}</div>
          {variants.length > 1 && (
            <p className="text-xs italic text-black/50 dark:text-white/50">
              From the original recipe -- adjust for each variant&apos;s ingredient changes below.
            </p>
          )}
        </div>
      )}
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
  // Area (sq in) and capacity (qt) aren't on a comparable scale, so a
  // switch across the pot/pan family (recorded via PanSizeCalculator, e.g.
  // moving a pot recipe to a steam table pan for serving) can't derive
  // "people per vessel" from the recipe's native pan the way a same-family
  // switch can -- that number only exists because the person setting it up
  // entered it directly, and isn't persisted for reconstruction later. This
  // still shows the chosen vessel, just without a batch count that would
  // otherwise be a made-up number.
  const knowsPerPanServings = panSize && recipe.panSize && sameVesselFamily(recipe.panSize, panSize);
  const perPanServings =
    recipe.servings && knowsPerPanServings && panSize && recipe.panSize
      ? servingsPerPan(recipe.servings, recipe.panSize, panSize)
      : knowsPerPanServings
        ? recipe.servings
        : null;
  const batches = perPanServings ? batchesNeeded(variant.servings, perPanServings) : null;
  const noun = vesselNoun(panSize);
  // formatPanSize already spells out "qt pot" for a pot, so only a pan
  // needs the noun appended to read as a vessel ("9" x 13" pan").
  const panLabel = panSize ? ` (${formatPanSize(panSize)}${noun === "pot" ? "" : ` ${noun}`})` : "";

  const header = (
    <div className="text-sm font-medium">
      {batches !== null
        ? `Make ${batches} ${batches === 1 ? noun : `${noun}s`}${panLabel}, ${perPanServings} people per ${noun}`
        : panSize
          ? `Make enough for ${variant.servings} people, using ${formatPanSize(panSize)}${noun === "pot" ? "" : ` ${noun}`} -- split across as many as you need`
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
