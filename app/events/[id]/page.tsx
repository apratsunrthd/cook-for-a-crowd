import Link from "next/link";
import { notFound } from "next/navigation";
import { AddRecipeToEvent } from "@/components/AddRecipeToEvent";
import { CookPlan } from "@/components/CookPlan";
import { DeleteEventButton } from "@/components/DeleteEventButton";
import { RecipeVariantsCard, type VariantWithIngredients } from "@/components/RecipeVariantsCard";
import { ShoppingList } from "@/components/ShoppingList";
import { getDb } from "@/lib/db";
import { listAllVariantsForEvent, listEventRecipes } from "@/lib/repo/eventRecipes";
import { getEvent } from "@/lib/repo/events";
import { listRecipes } from "@/lib/repo/recipes";
import { InvalidServingsError, effectiveHeadcount, scaleFactor, scaleIngredients } from "@/lib/scale";
import { aggregateIngredients, type RecipeIngredients } from "@/lib/shoppingList";
import type { Course, Recipe, ScaledIngredient } from "@/lib/types";

const COURSE_LABELS: Record<Course, string> = { main: "Mains", side: "Sides", dessert: "Desserts" };
const COURSE_ORDER: Course[] = ["main", "side", "dessert"];

interface DishWithVariants {
  recipe: Recipe;
  course: Course;
  variants: VariantWithIngredients[];
}

export default async function EventDetailPage({ params }: PageProps<"/events/[id]">) {
  const { id } = await params;
  const db = getDb();
  const event = getEvent(db, Number(id));
  if (!event) notFound();

  const headcount = effectiveHeadcount(event);
  const attached = listEventRecipes(db, event.id);
  const allVariants = listAllVariantsForEvent(db, event.id);
  const allRecipes = listRecipes(db);
  const attachedIds = new Set(attached.map((a) => a.recipe.id));
  const availableRecipes = allRecipes.filter((r) => !attachedIds.has(r.id));

  const dishes: DishWithVariants[] = attached.map(({ eventRecipe, recipe }) => {
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

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-semibold">{event.name}</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            {event.eventDate ?? "No date set"} &middot; {event.rsvpCount} RSVPs &middot; cooking for{" "}
            <span className="font-medium">{headcount}</span> people
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link href={`/events/${event.id}/edit`} className="text-sm underline">
            Edit event
          </Link>
          <DeleteEventButton eventId={event.id} />
        </div>
      </div>
      <h1 className="hidden print:block text-2xl font-semibold">
        {event.eventDate ? `${event.name} -- ${event.eventDate}` : event.name}
      </h1>

      <section className="space-y-4 print:hidden">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Meal plan</h2>
        </div>
        <AddRecipeToEvent eventId={event.id} defaultHeadcount={headcount} availableRecipes={availableRecipes} />
        {dishes.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">No dishes added yet.</p>
        ) : (
          COURSE_ORDER.map((course) => {
            const dishesForCourse = dishes.filter((d) => d.course === course);
            if (dishesForCourse.length === 0) return null;
            return (
              <div key={course} className="space-y-3">
                <h3 className="text-sm font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
                  {COURSE_LABELS[course]}
                </h3>
                {dishesForCourse.map((dish) => (
                  <RecipeVariantsCard
                    key={dish.recipe.id}
                    eventId={event.id}
                    recipeId={dish.recipe.id}
                    recipeName={dish.recipe.name}
                    recipeServings={dish.recipe.servings}
                    recipeIngredients={dish.recipe.ingredients}
                    recipePanSize={dish.recipe.panSize}
                    variants={dish.variants}
                  />
                ))}
              </div>
            );
          })
        )}
      </section>

      {dishes.length > 0 && (
        <section className="print:mt-0">
          <CookPlan dishes={dishes} />
        </section>
      )}

      <section className="print:mt-0">
        <ShoppingList items={shoppingList} eventName={event.name} />
      </section>
    </div>
  );
}
