"use client";

import type { ShoppingListItem } from "@/lib/types";
import { formatShoppingListItem } from "@/lib/shoppingList";

export function ShoppingList({ items, eventName }: { items: ShoppingListItem[]; eventName: string }) {
  const confirmed = items.filter((i) => !i.needsReview);
  const needsReview = items.filter((i) => i.needsReview);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between print:hidden">
        <h2 className="text-lg font-semibold">Shopping list</h2>
        <button
          onClick={() => window.print()}
          className="rounded-md border border-black/20 dark:border-white/20 px-3 py-1.5 text-sm font-medium"
        >
          Print
        </button>
      </div>
      <h2 className="hidden print:block text-lg font-semibold mb-2">
        Shopping list -- {eventName}
      </h2>

      {items.length === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60">
          Add a recipe to this event to build a shopping list.
        </p>
      ) : (
        <ul className="space-y-1 text-sm">
          {confirmed.map((item) => (
            <li key={item.key} className="flex items-baseline justify-between gap-3">
              <span>{formatShoppingListItem(item)}</span>
              <span className="text-xs text-black/40 dark:text-white/40 print:hidden">
                {item.sources.join(", ")}
              </span>
            </li>
          ))}
          {needsReview.length > 0 && (
            <>
              <li className="pt-2 text-xs font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
                Double-check these (no quantity found)
              </li>
              {needsReview.map((item) => (
                <li key={item.key} className="text-amber-600 dark:text-amber-400">
                  {formatShoppingListItem(item)}{" "}
                  <span className="text-xs text-black/40 dark:text-white/40 print:hidden">
                    ({item.sources.join(", ")})
                  </span>
                </li>
              ))}
            </>
          )}
        </ul>
      )}
    </div>
  );
}
