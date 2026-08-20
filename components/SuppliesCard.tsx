"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupplyAction, deleteSupplyAction, updateSupplyAction } from "@/lib/actions/supplies";
import { SUPPLY_PRESETS, suppliesNeeded, type SupplyPreset } from "@/lib/supplies";
import type { SupplyInput } from "@/lib/repo/supplies";
import type { EventSupply } from "@/lib/types";

function pluralize(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/**
 * Plates, napkins, utensils, ice -- simple per-person multipliers with no
 * real judgment call (unlike drinks, where preference genuinely varies),
 * so this is one-click presets plus a plain override, no AI involved.
 */
export function SuppliesCard({
  eventId,
  defaultHeadcount,
  supplies,
}: {
  eventId: number;
  defaultHeadcount: number;
  supplies: EventSupply[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  const addedNames = new Set(supplies.map((s) => s.name));
  const availablePresets = SUPPLY_PRESETS.filter((p) => !addedNames.has(p.name));

  async function quickAdd(preset: SupplyPreset) {
    await createSupplyAction(eventId, {
      name: preset.name,
      unit: preset.unit,
      perPersonQuantity: preset.perPersonQuantity,
      targetHeadcount: null,
      notes: null,
    });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Supplies</h2>
      {supplies.length === 0 && !adding && (
        <p className="text-sm text-black/60 dark:text-white/60">No supplies planned yet.</p>
      )}
      {supplies.length > 0 && (
        <ul className="space-y-2">
          {supplies.map((supply) => (
            <SupplyRow key={supply.id} eventId={eventId} supply={supply} defaultHeadcount={defaultHeadcount} />
          ))}
        </ul>
      )}
      {availablePresets.length > 0 && (
        <div className="flex flex-wrap gap-2 print:hidden">
          {availablePresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => quickAdd(preset)}
              className="text-xs rounded-md border border-black/20 dark:border-white/20 px-2 py-1"
            >
              + {preset.name}
            </button>
          ))}
        </div>
      )}
      {adding ? (
        <SupplyForm
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
          + Add something else
        </button>
      )}
    </div>
  );
}

function SupplyRow({
  eventId,
  supply,
  defaultHeadcount,
}: {
  eventId: number;
  supply: EventSupply;
  defaultHeadcount: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const headcount = supply.targetHeadcount ?? defaultHeadcount;
  const needed = suppliesNeeded(supply.perPersonQuantity, headcount);

  if (editing) {
    return (
      <li>
        <SupplyForm
          eventId={eventId}
          defaultHeadcount={defaultHeadcount}
          initial={supply}
          supplyId={supply.id}
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
        <div className="font-medium">{supply.name}</div>
        <div className="text-xs text-black/60 dark:text-white/60">
          {pluralize(needed, supply.unit)} &middot; {supply.perPersonQuantity} per person for {headcount} people
          {supply.notes && <span className="italic"> &middot; {supply.notes}</span>}
        </div>
      </div>
      <div className="flex gap-3 text-xs print:hidden">
        <button onClick={() => setEditing(true)} className="hover:underline">
          Edit
        </button>
        <button
          onClick={async () => {
            await deleteSupplyAction(eventId, supply.id);
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

function SupplyForm({
  eventId,
  defaultHeadcount,
  initial,
  supplyId,
  onDone,
  onCancel,
}: {
  eventId: number;
  defaultHeadcount: number;
  initial?: EventSupply;
  supplyId?: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const [perPersonQuantity, setPerPersonQuantity] = useState(initial?.perPersonQuantity ?? 1);
  const [targetHeadcount, setTargetHeadcount] = useState<number | "">(initial?.targetHeadcount ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const headcount = targetHeadcount === "" ? defaultHeadcount : targetHeadcount;
  const needed = suppliesNeeded(perPersonQuantity, headcount);

  async function save() {
    setSaving(true);
    const input: SupplyInput = {
      name,
      unit,
      perPersonQuantity,
      targetHeadcount: targetHeadcount === "" ? null : targetHeadcount,
      notes: notes || null,
    };
    if (supplyId) {
      await updateSupplyAction(eventId, supplyId, input);
    } else {
      await createSupplyAction(eventId, input);
    }
    setSaving(false);
    onDone();
  }

  return (
    <div className="rounded-md bg-black/[.03] dark:bg-white/[.06] p-3 space-y-3 print:hidden">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" htmlFor="supply-name">
            Name
          </label>
          <input
            id="supply-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Trash bags"
            className="w-40 rounded-md border border-black/20 dark:border-white/20 bg-transparent px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" htmlFor="supply-unit">
            Unit
          </label>
          <input
            id="supply-unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="e.g. bag"
            className="w-24 rounded-md border border-black/20 dark:border-white/20 bg-transparent px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" htmlFor="supply-per-person">
            Per person
          </label>
          <input
            id="supply-per-person"
            type="number"
            min={0.1}
            step={0.1}
            value={perPersonQuantity}
            onChange={(e) => setPerPersonQuantity(Number(e.target.value))}
            className="w-20 rounded-md border border-black/20 dark:border-white/20 bg-transparent px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" htmlFor="supply-headcount">
            For how many people
          </label>
          <input
            id="supply-headcount"
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
        <label className="block text-xs font-medium mb-1" htmlFor="supply-notes">
          Notes
        </label>
        <input
          id="supply-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. large size"
          className="w-full rounded-md border border-black/20 dark:border-white/20 bg-transparent px-2 py-1 text-sm"
        />
      </div>
      <p className="text-xs text-black/60 dark:text-white/60">
        &rarr; {pluralize(needed, unit || "unit")} needed for {headcount} people
      </p>
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving || !name.trim() || !unit.trim()}
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
