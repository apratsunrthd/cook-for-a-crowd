"use client";

import Link from "next/link";
import { useState } from "react";
import {
  FOODSERVICE_PACKAGE_PRESETS,
  foodservicePackageCategoryFor,
  foodservicePackagesNeeded,
} from "@/lib/foodservicePackaging";
import { formatShoppingListItem } from "@/lib/shoppingList";
import type { ShoppingListItem } from "@/lib/types";

const AS_LISTED = "";

function pluralize(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function ShoppingList({
  items,
  eventName,
  eventId,
  showPrintLink = false,
  initialPackagePresetId,
}: {
  items: ShoppingListItem[];
  eventName: string;
  /** Needed to build the "Open printable view" link -- omit when this instance IS the print page (no point linking to itself). */
  eventId?: number;
  showPrintLink?: boolean;
  /** Seeds the "buy as" selections from the interactive page's own choices, passed via the printable view's URL -- see the print/shopping-list page. */
  initialPackagePresetId?: Record<string, string>;
}) {
  const confirmed = items.filter((i) => !i.needsReview);
  const needsReview = items.filter((i) => i.needsReview);
  // Buying in bulk (a #10 can instead of a consumer-size one) is a per-trip
  // choice, not something worth persisting to the recipe or the event --
  // this is plain client-side state that recomputes from the same
  // aggregated weight already shown, never stored in the database. It's
  // carried over to the printable view via a URL param instead (see
  // printHref below), so choosing a bulk size doesn't silently vanish the
  // moment you open the page meant for actually taking to the store.
  const [packagePresetId, setPackagePresetId] = useState<Record<string, string>>(
    initialPackagePresetId ?? {},
  );

  const hasSelections = Object.keys(packagePresetId).length > 0;
  const printHref =
    eventId !== undefined
      ? `/events/${eventId}/print/shopping-list${hasSelections ? `?buyAs=${encodeURIComponent(JSON.stringify(packagePresetId))}` : ""}`
      : null;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold print:hidden">Shopping list</h2>
      <h2 className="hidden print:block text-lg font-semibold mb-2">
        Shopping list -- {eventName}
      </h2>

      {items.length === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60">
          Add a recipe to this event to build a shopping list.
        </p>
      ) : (
        <ul className="space-y-1 text-sm">
          {confirmed.map((item) => {
            const category = foodservicePackageCategoryFor(item);
            const options = category
              ? FOODSERVICE_PACKAGE_PRESETS.filter((p) => p.category === category)
              : [];
            const presetId = packagePresetId[item.key] ?? AS_LISTED;
            const preset = options.find((p) => p.id === presetId);
            const packagesNeeded =
              preset && item.grams !== null ? foodservicePackagesNeeded(item.grams, preset.grams) : null;

            return (
              <li key={item.key} className="flex items-baseline justify-between gap-3">
                <span>
                  {formatShoppingListItem(item)}
                  {packagesNeeded !== null && (
                    <span className="text-black/70 dark:text-white/70">
                      {" "}
                      &rarr; buy {pluralize(packagesNeeded, preset!.unitLabel)}
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-2 print:hidden">
                  {options.length > 0 && (
                    <select
                      value={presetId}
                      onChange={(e) =>
                        setPackagePresetId((prev) => ({ ...prev, [item.key]: e.target.value }))
                      }
                      aria-label={`Buy ${item.description} as`}
                      className="rounded-md border border-black/20 dark:border-white/20 bg-transparent px-1.5 py-0.5 text-xs"
                    >
                      <option value={AS_LISTED}>As listed</option>
                      {options.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  )}
                  <span className="text-xs text-black/40 dark:text-white/40">{item.sources.join(", ")}</span>
                </span>
              </li>
            );
          })}
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

      {showPrintLink && printHref && (
        <Link href={printHref} className="text-sm underline text-black/70 dark:text-white/70 print:hidden">
          Open printable view &rarr;
        </Link>
      )}
    </div>
  );
}
