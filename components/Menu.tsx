import type { CookPlanDish } from "@/components/CookPlan";
import { COURSE_LABELS, COURSE_ORDER, type EventDrink, type EventPurchasedItem } from "@/lib/types";

interface MenuEntry {
  name: string;
  /** Other versions of this dish a guest with dietary needs might ask for -- "Gluten-Free", "Dairy-Free" -- never the kitchen-facing modification notes, which may say things not meant for a guest-facing menu. */
  alsoAvailable: string[];
}

/**
 * What's being served -- for guests, not the kitchen. Deliberately just
 * names: no quantities, ingredients, or vessel sizes, which belong to the
 * cook's plan and shopping list instead. Grouped by course like the rest of
 * the event, and separately from the meal plan/purchased items pages so it
 * stays safe to hand out or post without exposing prep details.
 */
export function Menu({
  eventName,
  eventDate,
  dishes,
  purchasedItems,
  drinks,
}: {
  eventName: string;
  eventDate: string | null;
  dishes: CookPlanDish[];
  purchasedItems: EventPurchasedItem[];
  drinks: EventDrink[];
}) {
  const entriesByCourse = new Map<string, MenuEntry[]>();
  for (const course of COURSE_ORDER) entriesByCourse.set(course, []);

  for (const dish of dishes) {
    const alsoAvailable = dish.variants
      .map((v) => v.variant.label.trim())
      .filter((label) => label.length > 0 && label.toLowerCase() !== "standard");
    entriesByCourse.get(dish.course)?.push({ name: dish.recipe.name, alsoAvailable });
  }
  for (const item of purchasedItems) {
    entriesByCourse.get(item.course)?.push({ name: item.name, alsoAvailable: [] });
  }

  const hasAnyDish = [...entriesByCourse.values()].some((entries) => entries.length > 0);

  return (
    <div className="space-y-6 print:break-inside-avoid">
      <div className="print:hidden">
        <h2 className="text-lg font-semibold">Menu</h2>
        <p className="text-sm text-black/60 dark:text-white/60">
          Just what&apos;s being served -- for sharing with guests, not the kitchen.
        </p>
      </div>
      <div className="hidden print:block text-center space-y-1 mb-4">
        <h1 className="text-2xl font-semibold">{eventName}</h1>
        {eventDate && <p className="text-sm text-black/60 dark:text-white/60">{eventDate}</p>}
      </div>

      {!hasAnyDish && drinks.length === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60">Nothing added to the meal plan yet.</p>
      ) : (
        <div className="space-y-4">
          {COURSE_ORDER.map((course) => {
            const entries = entriesByCourse.get(course) ?? [];
            if (entries.length === 0) return null;
            return (
              <div key={course}>
                <h3 className="text-sm font-medium uppercase tracking-wide text-black/50 dark:text-white/50 print:text-center">
                  {COURSE_LABELS[course]}
                </h3>
                <ul className="space-y-1 print:text-center">
                  {entries.map((entry, idx) => (
                    <li key={idx} className="text-sm">
                      {entry.name}
                      {entry.alsoAvailable.length > 0 && (
                        <span className="text-black/60 dark:text-white/60">
                          {" "}
                          (also available: {entry.alsoAvailable.join(", ")})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {drinks.length > 0 && (
            <div>
              <h3 className="text-sm font-medium uppercase tracking-wide text-black/50 dark:text-white/50 print:text-center">
                Drinks
              </h3>
              <ul className="space-y-1 print:text-center">
                {drinks.map((drink) => (
                  <li key={drink.id} className="text-sm">
                    {drink.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
