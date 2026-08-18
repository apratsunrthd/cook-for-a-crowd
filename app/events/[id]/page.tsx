import Link from "next/link";
import { notFound } from "next/navigation";
import { AddRecipeToEvent } from "@/components/AddRecipeToEvent";
import { DeleteEventButton } from "@/components/DeleteEventButton";
import { DrinksCard } from "@/components/DrinksCard";
import { RecipeVariantsCard } from "@/components/RecipeVariantsCard";
import { getDb } from "@/lib/db";
import { getEventPlan } from "@/lib/eventPlan";
import { listDrinksForEvent } from "@/lib/repo/drinks";
import { listEventRecipes } from "@/lib/repo/eventRecipes";
import { listRecipes } from "@/lib/repo/recipes";
import type { Course } from "@/lib/types";

const COURSE_LABELS: Record<Course, string> = { main: "Mains", side: "Sides", dessert: "Desserts" };
const COURSE_ORDER: Course[] = ["main", "side", "dessert"];

export default async function EventDetailPage({ params }: PageProps<"/events/[id]">) {
  const { id } = await params;
  const db = getDb();
  const plan = getEventPlan(db, Number(id));
  if (!plan) notFound();
  const { event, headcount, dishes } = plan;

  const attached = listEventRecipes(db, event.id);
  const allRecipes = listRecipes(db);
  const attachedIds = new Set(attached.map((a) => a.recipe.id));
  const availableRecipes = allRecipes.filter((r) => !attachedIds.has(r.id));
  const drinks = listDrinksForEvent(db, event.id);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
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

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Meal plan</h2>
        </div>
        <p className="text-sm text-black/60 dark:text-white/60">
          Target headcount: <span className="font-medium text-black dark:text-white">{headcount} people</span>.
          Each dish below rounds up to whole pans, so an individual dish may end up covering a few more people
          than the target -- that&apos;s expected, it just means nobody goes hungry.
        </p>
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

      <section>
        <DrinksCard eventId={event.id} defaultHeadcount={headcount} drinks={drinks} />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Printable views</h2>
        <p className="text-sm text-black/60 dark:text-white/60">
          The shopping list and the cook&apos;s plan print separately, so you can take just the list
          to the store or just the plan into the kitchen.
        </p>
        <div className="flex gap-3">
          <Link
            href={`/events/${event.id}/print/shopping-list`}
            className="rounded-md border border-black/20 dark:border-white/20 px-3 py-1.5 text-sm font-medium"
          >
            Print shopping list
          </Link>
          <Link
            href={`/events/${event.id}/print/cook-plan`}
            className="rounded-md border border-black/20 dark:border-white/20 px-3 py-1.5 text-sm font-medium"
          >
            Print cook&apos;s plan
          </Link>
        </div>
      </section>
    </div>
  );
}
