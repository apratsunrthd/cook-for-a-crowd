"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createDrinkAction, createDrinksAction, deleteDrinkAction, suggestDrinksAction, updateDrinkAction } from "@/lib/actions/drinks";
import { DEFAULT_DRINK_SERVING_OZ, DRINK_PACKAGE_PRESETS, drinkUnitsNeeded, splitDrinkHeadcounts } from "@/lib/drinks";
import type { SuggestedDrink } from "@/lib/drinksAI";
import type { DrinkInput } from "@/lib/repo/drinks";
import type { EventDrink } from "@/lib/types";

function pluralize(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/**
 * Plans drinks for an event separately from food recipes -- teas and
 * lemonade (often bought by the gallon), soda (cans or bottles, various
 * sizes), bottled water. Each drink is sized by fluid ounces per person and
 * per purchased unit rather than scaled like a recipe, since "how many
 * gallons of tea" is a units-needed calculation, not an ingredient list.
 */
export function DrinksCard({
  eventId,
  defaultHeadcount,
  drinks,
}: {
  eventId: number;
  defaultHeadcount: number;
  drinks: EventDrink[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "adding" | "suggesting">("idle");

  // Un-customized drinks split the headcount evenly rather than each
  // assuming everyone drinks everything -- see splitDrinkHeadcounts.
  const headcounts = splitDrinkHeadcounts(drinks, defaultHeadcount);
  const newDrinkAutoHeadcount =
    splitDrinkHeadcounts([...drinks, { id: -1, targetHeadcount: null }], defaultHeadcount).get(-1) ?? defaultHeadcount;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Drinks</h2>
      {drinks.length === 0 && mode === "idle" && (
        <p className="text-sm text-black/60 dark:text-white/60">No drinks planned yet.</p>
      )}
      {drinks.length > 0 && (
        <ul className="space-y-2">
          {drinks.map((drink) => (
            <DrinkRow
              key={drink.id}
              eventId={eventId}
              drink={drink}
              autoHeadcount={headcounts.get(drink.id) ?? defaultHeadcount}
            />
          ))}
        </ul>
      )}
      {drinks.length > 1 && (
        <p className="text-xs text-black/50 dark:text-white/50">
          Drinks without a specific headcount split the remaining {defaultHeadcount} people evenly --
          adjust any drink&apos;s headcount if you expect an uneven split (e.g. sweet tea more popular than
          unsweet), or use &quot;Suggest drinks with AI&quot; to estimate a realistic split up front.
        </p>
      )}

      {mode === "adding" && (
        <DrinkForm
          eventId={eventId}
          autoHeadcount={newDrinkAutoHeadcount}
          onDone={() => {
            setMode("idle");
            router.refresh();
          }}
          onCancel={() => setMode("idle")}
        />
      )}

      {mode === "suggesting" && (
        <DrinkSuggestForm
          eventId={eventId}
          defaultHeadcount={defaultHeadcount}
          onDone={() => {
            setMode("idle");
            router.refresh();
          }}
          onCancel={() => setMode("idle")}
        />
      )}

      {mode === "idle" && (
        <div className="flex flex-wrap gap-4 print:hidden">
          <button onClick={() => setMode("adding")} className="text-sm underline text-black/70 dark:text-white/70">
            + Add a drink manually
          </button>
          <button onClick={() => setMode("suggesting")} className="text-sm underline text-black/70 dark:text-white/70">
            Suggest drinks with AI
          </button>
        </div>
      )}
    </div>
  );
}

function DrinkRow({
  eventId,
  drink,
  autoHeadcount,
}: {
  eventId: number;
  drink: EventDrink;
  autoHeadcount: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const headcount = drink.targetHeadcount ?? autoHeadcount;
  const units = drinkUnitsNeeded(headcount, drink.servingSizeOz, drink.packageSizeOz);

  if (editing) {
    return (
      <li>
        <DrinkForm
          eventId={eventId}
          autoHeadcount={autoHeadcount}
          initial={drink}
          drinkId={drink.id}
          onDone={() => {
            setEditing(false);
            router.refresh();
          }}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="rounded-md bg-black/[.02] dark:bg-white/[.04] p-3 flex items-start justify-between gap-3">
      <div className="text-sm">
        <div className="font-medium">{drink.name}</div>
        <div className="text-xs text-black/60 dark:text-white/60">
          {pluralize(units, drink.unitLabel)} &middot; {drink.servingSizeOz} oz/person for {headcount} people
          {drink.targetHeadcount === null && <span className="text-black/40 dark:text-white/40"> (auto-split)</span>}
          {drink.notes && <span className="italic"> &middot; {drink.notes}</span>}
        </div>
      </div>
      <div className="flex gap-3 text-xs print:hidden">
        <button onClick={() => setEditing(true)} className="hover:underline">
          Edit
        </button>
        <button
          onClick={async () => {
            await deleteDrinkAction(eventId, drink.id);
            router.refresh();
          }}
          className="text-red-600 hover:underline"
        >
          Remove
        </button>
      </div>
    </li>
  );
}

function DrinkForm({
  eventId,
  autoHeadcount,
  initial,
  drinkId,
  onDone,
  onCancel,
}: {
  eventId: number;
  autoHeadcount: number;
  initial?: EventDrink;
  drinkId?: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [presetId, setPresetId] = useState(
    DRINK_PACKAGE_PRESETS.find((p) => p.sizeOz === initial?.packageSizeOz && p.unitLabel === initial?.unitLabel)
      ?.id ?? DRINK_PACKAGE_PRESETS[0].id,
  );
  const [servingSizeOz, setServingSizeOz] = useState(initial?.servingSizeOz ?? DEFAULT_DRINK_SERVING_OZ);
  const [targetHeadcount, setTargetHeadcount] = useState<number | "">(initial?.targetHeadcount ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const preset = DRINK_PACKAGE_PRESETS.find((p) => p.id === presetId) ?? DRINK_PACKAGE_PRESETS[0];
  const headcount = targetHeadcount === "" ? autoHeadcount : targetHeadcount;
  const units = drinkUnitsNeeded(headcount, servingSizeOz, preset.sizeOz);

  async function save() {
    setSaving(true);
    const input: DrinkInput = {
      name,
      unitLabel: preset.unitLabel,
      packageSizeOz: preset.sizeOz,
      servingSizeOz,
      targetHeadcount: targetHeadcount === "" ? null : targetHeadcount,
      notes: notes || null,
    };
    if (drinkId) {
      await updateDrinkAction(eventId, drinkId, input);
    } else {
      await createDrinkAction(eventId, input);
    }
    setSaving(false);
    onDone();
  }

  return (
    <div className="rounded-md bg-black/[.03] dark:bg-white/[.06] p-3 space-y-3 print:hidden">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" htmlFor="drink-name">
            Name
          </label>
          <input
            id="drink-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sweet tea"
            className="w-40 rounded-md border border-black/20 dark:border-white/20 bg-transparent px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" htmlFor="drink-preset">
            Sold as
          </label>
          <select
            id="drink-preset"
            value={presetId}
            onChange={(e) => setPresetId(e.target.value)}
            className="rounded-md border border-black/20 dark:border-white/20 bg-transparent px-2 py-1 text-sm"
          >
            {DRINK_PACKAGE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" htmlFor="drink-serving-oz">
            Oz per person
          </label>
          <input
            id="drink-serving-oz"
            type="number"
            min={1}
            value={servingSizeOz}
            onChange={(e) => setServingSizeOz(Number(e.target.value))}
            className="w-20 rounded-md border border-black/20 dark:border-white/20 bg-transparent px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" htmlFor="drink-headcount">
            For how many people
          </label>
          <input
            id="drink-headcount"
            type="number"
            min={1}
            value={targetHeadcount}
            onChange={(e) => setTargetHeadcount(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder={String(autoHeadcount)}
            className="w-24 rounded-md border border-black/20 dark:border-white/20 bg-transparent px-2 py-1 text-sm"
          />
          <p className="mt-1 text-xs text-black/40 dark:text-white/40">
            Blank = auto-split with other drinks (~{autoHeadcount})
          </p>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" htmlFor="drink-notes">
          Notes
        </label>
        <input
          id="drink-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. half regular, half decaf"
          className="w-full rounded-md border border-black/20 dark:border-white/20 bg-transparent px-2 py-1 text-sm"
        />
      </div>
      <p className="text-xs text-black/60 dark:text-white/60">
        &rarr; {pluralize(units, preset.unitLabel)} needed for {headcount} people
      </p>
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving || !name.trim()}
          className="rounded-md bg-black text-white dark:bg-white dark:text-black px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button onClick={onCancel} className="text-sm underline text-black/70 dark:text-white/70">
          Cancel
        </button>
      </div>
    </div>
  );
}

/**
 * Asks the AI for a realistic drink lineup and headcount split -- e.g.
 * "tea and lemonade" for a Southern event should come back weighted toward
 * sweet tea, with unsweet tea offered too, not an even three-way split.
 * Suggestions land as editable drafts; nothing is saved until the user
 * reviews and confirms.
 */
function DrinkSuggestForm({
  eventId,
  defaultHeadcount,
  onDone,
  onCancel,
}: {
  eventId: number;
  defaultHeadcount: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [request, setRequest] = useState("");
  const [headcount, setHeadcount] = useState(defaultHeadcount);
  const [servingSizeOz, setServingSizeOz] = useState(16);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestedDrink[] | null>(null);
  const [saving, setSaving] = useState(false);

  async function suggest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await suggestDrinksAction(eventId, request, headcount, servingSizeOz);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuggestions(result.data);
  }

  function updateSuggestion(index: number, patch: Partial<SuggestedDrink>) {
    setSuggestions((prev) => (prev ? prev.map((s, i) => (i === index ? { ...s, ...patch } : s)) : prev));
  }

  function removeSuggestion(index: number) {
    setSuggestions((prev) => (prev ? prev.filter((_, i) => i !== index) : prev));
  }

  async function saveAll() {
    if (!suggestions || suggestions.length === 0) return;
    setSaving(true);
    await createDrinksAction(
      eventId,
      suggestions.map(
        (s): DrinkInput => ({
          name: s.name,
          unitLabel: s.unitLabel,
          packageSizeOz: s.packageSizeOz,
          servingSizeOz,
          targetHeadcount: s.expectedDrinkers,
          notes: null,
        }),
      ),
    );
    setSaving(false);
    onDone();
  }

  if (suggestions) {
    const totalDrinkers = suggestions.reduce((sum, s) => sum + s.expectedDrinkers, 0);
    return (
      <div className="rounded-md bg-black/[.03] dark:bg-white/[.06] p-3 space-y-3 print:hidden">
        <p className="text-xs text-black/60 dark:text-white/60">
          Suggested for {headcount} people ({totalDrinkers} accounted for) -- adjust names, headcounts, or
          remove any before saving.
        </p>
        <ul className="space-y-2">
          {suggestions.map((s, i) => {
            const units = drinkUnitsNeeded(s.expectedDrinkers, servingSizeOz, s.packageSizeOz);
            return (
              <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
                <input
                  value={s.name}
                  onChange={(e) => updateSuggestion(i, { name: e.target.value })}
                  aria-label="Drink name"
                  className="w-36 rounded-md border border-black/20 dark:border-white/20 bg-transparent px-2 py-1"
                />
                <label className="flex items-center gap-1 text-xs text-black/60 dark:text-white/60">
                  for
                  <input
                    type="number"
                    min={0}
                    value={s.expectedDrinkers}
                    onChange={(e) => updateSuggestion(i, { expectedDrinkers: Number(e.target.value) })}
                    aria-label="Expected drinkers"
                    className="w-16 rounded-md border border-black/20 dark:border-white/20 bg-transparent px-2 py-1"
                  />
                  people
                </label>
                <span className="text-xs text-black/60 dark:text-white/60">
                  &rarr; {pluralize(units, s.unitLabel)}
                </span>
                <button onClick={() => removeSuggestion(i)} className="text-xs text-red-600 hover:underline">
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex gap-2">
          <button
            onClick={saveAll}
            disabled={saving || suggestions.length === 0}
            className="rounded-md bg-black text-white dark:bg-white dark:text-black px-3 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Saving…" : `Add ${pluralize(suggestions.length, "drink")}`}
          </button>
          <button onClick={onCancel} className="text-sm underline text-black/70 dark:text-white/70">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={suggest} className="rounded-md bg-black/[.03] dark:bg-white/[.06] p-3 space-y-3 print:hidden">
      <div>
        <label className="block text-xs font-medium mb-1" htmlFor="drink-suggest-request">
          What drinks, and any context that affects preferences
        </label>
        <input
          id="drink-suggest-request"
          required
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          placeholder="e.g. tea and lemonade, Southern-style, Chattanooga TN"
          className="w-full rounded-md border border-black/20 dark:border-white/20 bg-transparent px-2 py-1 text-sm"
        />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" htmlFor="drink-suggest-headcount">
            Headcount
          </label>
          <input
            id="drink-suggest-headcount"
            type="number"
            min={1}
            value={headcount}
            onChange={(e) => setHeadcount(Number(e.target.value))}
            className="w-24 rounded-md border border-black/20 dark:border-white/20 bg-transparent px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" htmlFor="drink-suggest-oz">
            Oz per person
          </label>
          <input
            id="drink-suggest-oz"
            type="number"
            min={1}
            value={servingSizeOz}
            onChange={(e) => setServingSizeOz(Number(e.target.value))}
            className="w-20 rounded-md border border-black/20 dark:border-white/20 bg-transparent px-2 py-1 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !request.trim()}
          className="rounded-md bg-black text-white dark:bg-white dark:text-black px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Suggesting…" : "Suggest"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm underline text-black/70 dark:text-white/70">
          Cancel
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
