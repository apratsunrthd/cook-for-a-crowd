"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
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

// Buying in bulk (a #10 can instead of a consumer-size one) is a per-trip
// choice, not something worth writing to the recipe or the event -- but it
// still needs to survive ordinary use of the page: editing an unrelated
// dish, adding a supply, or opening the separate printable view all
// re-render or reload this component, and a plain useState reset on every
// one of those was the actual bug being fixed here. localStorage survives
// all of that for free, scoped per event so switching between events in
// the same browser session doesn't cross-contaminate selections.
//
// Modeled as a tiny external store (like ThemeToggle's) rather than
// useState + useEffect: reading localStorage inside an effect would still
// need a real value on the very first client render, and synchronously
// reading it in the render body would mismatch the server-rendered HTML.
// useSyncExternalStore is the one hook that reads a client-only value
// without that hydration-mismatch warning -- it renders the server
// snapshot first, then reconciles once mounted.
const buyAsCache = new Map<number, Record<string, string>>();
let buyAsListeners: Array<() => void> = [];

function buyAsStorageKey(eventId: number): string {
  return `cook-for-a-crowd:buy-as:${eventId}`;
}

function subscribeBuyAs(callback: () => void) {
  buyAsListeners.push(callback);
  return () => {
    buyAsListeners = buyAsListeners.filter((listener) => listener !== callback);
  };
}

function readBuyAsFromStorage(eventId: number): Record<string, string> {
  try {
    const raw = localStorage.getItem(buyAsStorageKey(eventId));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

function getBuyAsSnapshot(eventId: number): Record<string, string> {
  if (!buyAsCache.has(eventId)) buyAsCache.set(eventId, readBuyAsFromStorage(eventId));
  return buyAsCache.get(eventId)!;
}

// A stable reference, not a fresh `{}` literal each call -- useSyncExternalStore
// compares snapshots by reference, and a new object every render trips its
// "getServerSnapshot should be cached" infinite-loop guard.
const EMPTY_BUY_AS: Record<string, string> = {};

function getBuyAsServerSnapshot(): Record<string, string> {
  return EMPTY_BUY_AS;
}

function setBuyAsPreset(eventId: number, itemKey: string, presetId: string) {
  const next = { ...getBuyAsSnapshot(eventId), [itemKey]: presetId };
  buyAsCache.set(eventId, next);
  try {
    localStorage.setItem(buyAsStorageKey(eventId), JSON.stringify(next));
  } catch {
    // Storage unavailable (private browsing, quota) -- the selection just
    // won't survive a reload, not worth surfacing as an error.
  }
  buyAsListeners.forEach((listener) => listener());
}

export function ShoppingList({
  items,
  eventName,
  eventId,
  showPrintLink = false,
}: {
  items: ShoppingListItem[];
  eventName: string;
  eventId: number;
  /** Omit on the print page itself -- no point linking to itself. */
  showPrintLink?: boolean;
}) {
  const confirmed = items.filter((i) => !i.needsReview);
  const needsReview = items.filter((i) => i.needsReview);
  const packagePresetId = useSyncExternalStore(
    subscribeBuyAs,
    () => getBuyAsSnapshot(eventId),
    getBuyAsServerSnapshot,
  );

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
        <ul className="space-y-2 text-sm">
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
              <li key={item.key}>
                <div className="flex items-baseline justify-between gap-3">
                  <span>
                    {formatShoppingListItem(item)}
                    {packagesNeeded !== null && (
                      <span className="text-black/70 dark:text-white/70">
                        {" "}
                        &rarr; buy {pluralize(packagesNeeded, preset!.unitLabel)}
                      </span>
                    )}
                  </span>
                  {options.length > 0 && (
                    <select
                      value={presetId}
                      onChange={(e) => setBuyAsPreset(eventId, item.key, e.target.value)}
                      aria-label={`Buy ${item.description} as`}
                      className="shrink-0 rounded-md border border-black/20 dark:border-white/20 bg-transparent px-1.5 py-0.5 text-xs print:hidden"
                    >
                      <option value={AS_LISTED}>As listed</option>
                      {options.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {/* On its own line, not fighting the item name for width -- a
                    long ingredient description next to a long list of dish
                    names on one row was cramped and hard to read. */}
                {item.sources.length > 0 && (
                  <div className="text-xs text-black/40 dark:text-white/40 print:hidden">
                    {item.sources.join(", ")}
                  </div>
                )}
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

      {showPrintLink && (
        <Link
          href={`/events/${eventId}/print/shopping-list`}
          className="text-sm underline text-black/70 dark:text-white/70 print:hidden"
        >
          Open printable view &rarr;
        </Link>
      )}
    </div>
  );
}
