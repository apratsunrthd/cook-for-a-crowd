"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createPurchasedItemAction,
  deletePurchasedItemAction,
  updatePurchasedItemAction,
} from "@/lib/actions/purchasedItems";
import type { PurchasedItemInput } from "@/lib/repo/purchasedItems";
import type { Course, EventPurchasedItem } from "@/lib/types";

const COURSE_LABELS: Record<Course, string> = { main: "Main", side: "Side", dessert: "Dessert" };

/**
 * Dishes that are being bought or ordered instead of cooked -- a store-bought
 * dessert, a catering order. No ingredient list or scaling, just enough to
 * keep it visible as part of the plan and remember how much was ordered.
 */
export function PurchasedItemsCard({ eventId, items }: { eventId: number; items: EventPurchasedItem[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Store-bought &amp; catered items</h2>
      <p className="text-sm text-black/60 dark:text-white/60">
        For dishes you&apos;re buying or ordering instead of cooking -- keeps them visible in the plan
        and shopping list without needing an ingredient list.
      </p>
      {items.length === 0 && !adding && (
        <p className="text-sm text-black/60 dark:text-white/60">Nothing added yet.</p>
      )}
      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item) => (
            <PurchasedItemRow key={item.id} eventId={eventId} item={item} />
          ))}
        </ul>
      )}
      {adding ? (
        <PurchasedItemForm
          eventId={eventId}
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
          + Add a store-bought item
        </button>
      )}
    </div>
  );
}

function PurchasedItemRow({ eventId, item }: { eventId: number; item: EventPurchasedItem }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li>
        <PurchasedItemForm
          eventId={eventId}
          initial={item}
          itemId={item.id}
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
        <div className="font-medium">
          {item.name}{" "}
          <span className="font-normal text-black/50 dark:text-white/50">({COURSE_LABELS[item.course]})</span>
        </div>
        <div className="text-xs text-black/60 dark:text-white/60">
          {item.quantityNote}
          {item.notes && <span className="italic"> &middot; {item.notes}</span>}
        </div>
      </div>
      <div className="flex gap-3 text-xs print:hidden">
        <button onClick={() => setEditing(true)} className="hover:underline">
          Edit
        </button>
        <button
          onClick={async () => {
            await deletePurchasedItemAction(eventId, item.id);
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

function PurchasedItemForm({
  eventId,
  initial,
  itemId,
  onDone,
  onCancel,
}: {
  eventId: number;
  initial?: EventPurchasedItem;
  itemId?: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [course, setCourse] = useState<Course>(initial?.course ?? "dessert");
  const [quantityNote, setQuantityNote] = useState(initial?.quantityNote ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const input: PurchasedItemInput = {
      name,
      course,
      quantityNote,
      notes: notes || null,
    };
    if (itemId) {
      await updatePurchasedItemAction(eventId, itemId, input);
    } else {
      await createPurchasedItemAction(eventId, input);
    }
    setSaving(false);
    onDone();
  }

  return (
    <div className="rounded-md bg-black/[.03] dark:bg-white/[.06] p-3 space-y-3 print:hidden">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" htmlFor="purchased-name">
            Name
          </label>
          <input
            id="purchased-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sheet cake from Kroger"
            className="w-52 rounded-md border border-black/20 dark:border-white/20 bg-transparent px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" htmlFor="purchased-course">
            Course
          </label>
          <select
            id="purchased-course"
            value={course}
            onChange={(e) => setCourse(e.target.value as Course)}
            className="rounded-md border border-black/20 dark:border-white/20 bg-transparent px-2 py-1 text-sm"
          >
            <option value="main">Main</option>
            <option value="side">Side</option>
            <option value="dessert">Dessert</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" htmlFor="purchased-quantity">
            Quantity
          </label>
          <input
            id="purchased-quantity"
            value={quantityNote}
            onChange={(e) => setQuantityNote(e.target.value)}
            placeholder="e.g. 3 dozen, feeds ~40"
            className="w-48 rounded-md border border-black/20 dark:border-white/20 bg-transparent px-2 py-1 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" htmlFor="purchased-notes">
          Notes
        </label>
        <input
          id="purchased-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. order by Thursday"
          className="w-full rounded-md border border-black/20 dark:border-white/20 bg-transparent px-2 py-1 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving || !name.trim() || !quantityNote.trim()}
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
