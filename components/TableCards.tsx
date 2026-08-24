import type { CookPlanDish } from "@/components/CookPlan";
import { COURSE_LABELS, COURSE_ORDER, type EventPurchasedItem } from "@/lib/types";

interface TableCard {
  name: string;
  course: string;
  dietary: string[];
  notes: string | null;
}

/**
 * Printable table cards -- one per dish, meant to be cut out and placed next
 * to each dish at the serving table. Includes dietary variant labels (e.g.
 * "Gluten-Free") so guests can ask about substitutions.
 */
export function TableCards({
  dishes,
  purchasedItems,
}: {
  dishes: CookPlanDish[];
  purchasedItems: EventPurchasedItem[];
}) {
  const cards: TableCard[] = [];

  for (const course of COURSE_ORDER) {
    for (const dish of dishes.filter((d) => d.course === course)) {
      const dietary = dish.variants
        .map((v) => v.variant.label.trim())
        .filter((label) => label.toLowerCase() !== "standard" && label.length > 0);
      cards.push({ name: dish.recipe.name, course: COURSE_LABELS[course], dietary, notes: null });
    }
    for (const item of purchasedItems.filter((p) => p.course === course)) {
      cards.push({ name: item.name, course: COURSE_LABELS[course], dietary: [], notes: item.notes });
    }
  }

  if (cards.length === 0) {
    return <p className="text-sm text-black/60 dark:text-white/60">No dishes added yet.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="border-2 border-black/20 dark:border-white/20 print:border-black/50 rounded-lg p-6 min-h-36 flex flex-col items-center justify-center text-center break-inside-avoid"
        >
          <div className="text-xs font-medium uppercase tracking-wider text-black/40 dark:text-white/40 mb-2">
            {card.course}
          </div>
          <div className="text-2xl font-bold leading-tight">{card.name}</div>
          {card.dietary.length > 0 && (
            <div className="text-sm text-black/55 dark:text-white/55 mt-2">
              Also available: {card.dietary.join(", ")}
            </div>
          )}
          {card.notes && (
            <div className="text-sm text-black/45 dark:text-white/45 mt-1 italic">{card.notes}</div>
          )}
        </div>
      ))}
    </div>
  );
}
