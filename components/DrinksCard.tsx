"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createDrinkAction, deleteDrinkAction, updateDrinkAction } from "@/lib/actions/drinks";
import { DEFAULT_DRINK_SERVING_OZ, DRINK_PACKAGE_PRESETS, drinkUnitsNeeded } from "@/lib/drinks";
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
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Drinks</h2>
      {drinks.length === 0 && !adding && (
        <p className="text-sm text-black/60 dark:text-white/60">No drinks planned yet.</p>
      )}
      {drinks.length > 0 && (
        <ul className="space-y-2">
          {drinks.map((drink) => (
            <DrinkRow key={drink.id} eventId={eventId} drink={drink} defaultHeadcount={defaultHeadcount} />
          ))}
        </ul>
      )}
      {adding ? (
        <DrinkForm
          eventId={eventId}
          defaultHeadcount={defaultHeadcount}
          onDone={() => {
            setAdding(false);
            router.refresh();
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="text-sm underline text-black/70 dark:text-white/70 print:hidden"
        >
          + Add a drink (tea, lemonade, soda, water…)
        </button>
      )}
    </div>
  );
}

function DrinkRow({
  eventId,
  drink,
  defaultHeadcount,
}: {
  eventId: number;
  drink: EventDrink;
  defaultHeadcount: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const headcount = drink.targetHeadcount ?? defaultHeadcount;
  const units = drinkUnitsNeeded(headcount, drink.servingSizeOz, drink.packageSizeOz);

  if (editing) {
    return (
      <li>
        <DrinkForm
          eventId={eventId}
          defaultHeadcount={defaultHeadcount}
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
  defaultHeadcount,
  initial,
  drinkId,
  onDone,
  onCancel,
}: {
  eventId: number;
  defaultHeadcount: number;
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
  const headcount = targetHeadcount === "" ? defaultHeadcount : targetHeadcount;
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
            placeholder={String(defaultHeadcount)}
            className="w-24 rounded-md border border-black/20 dark:border-white/20 bg-transparent px-2 py-1 text-sm"
          />
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
