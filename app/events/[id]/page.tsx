import Link from "next/link";
import { notFound } from "next/navigation";
import { AddRecipeToEvent } from "@/components/AddRecipeToEvent";
import { DeleteEventButton } from "@/components/DeleteEventButton";
import { EventRecipeCard } from "@/components/EventRecipeCard";
import { ShoppingList } from "@/components/ShoppingList";
import { getDb } from "@/lib/db";
import { listEventRecipes } from "@/lib/repo/eventRecipes";
import { getEvent } from "@/lib/repo/events";
import { listRecipes } from "@/lib/repo/recipes";
import { InvalidServingsError, effectiveHeadcount, scaleRecipe } from "@/lib/scale";
import { aggregateIngredients, type RecipeIngredients } from "@/lib/shoppingList";
import type { ScaledIngredient } from "@/lib/types";

export default async function EventDetailPage({ params }: PageProps<"/events/[id]">) {
  const { id } = await params;
  const db = getDb();
  const event = getEvent(db, Number(id));
  if (!event) notFound();

  const headcount = effectiveHeadcount(event);
  const attached = listEventRecipes(db, event.id);
  const allRecipes = listRecipes(db);
  const attachedIds = new Set(attached.map((a) => a.recipe.id));
  const availableRecipes = allRecipes.filter((r) => !attachedIds.has(r.id));

  const scaledByRecipe = attached.map(({ eventRecipe, recipe }) => {
    const target = eventRecipe.headcountOverride ?? headcount;
    try {
      return { recipe, eventRecipe, ingredients: scaleRecipe(recipe, target), error: null as string | null };
    } catch (err) {
      const message = err instanceof InvalidServingsError ? err.message : "Couldn't scale this recipe.";
      return { recipe, eventRecipe, ingredients: null, error: message };
    }
  });

  const shoppingListInputs: RecipeIngredients[] = scaledByRecipe
    .filter((r): r is typeof r & { ingredients: ScaledIngredient[] } => r.ingredients !== null)
    .map((r) => ({ recipeName: r.recipe.name, ingredients: r.ingredients }));
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
          <h2 className="text-lg font-semibold">Recipes</h2>
        </div>
        <AddRecipeToEvent eventId={event.id} availableRecipes={availableRecipes} />
        {scaledByRecipe.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">No recipes added yet.</p>
        ) : (
          <div className="space-y-3">
            {scaledByRecipe.map(({ recipe, eventRecipe, ingredients, error }) => (
              <EventRecipeCard
                key={recipe.id}
                eventId={event.id}
                recipeId={recipe.id}
                recipeName={recipe.name}
                defaultHeadcount={headcount}
                headcountOverride={eventRecipe.headcountOverride}
                notes={eventRecipe.notes}
                scaledIngredients={ingredients}
                scalingError={error}
              />
            ))}
          </div>
        )}
      </section>

      <section className="print:mt-0">
        <ShoppingList items={shoppingList} eventName={event.name} />
      </section>
    </div>
  );
}
