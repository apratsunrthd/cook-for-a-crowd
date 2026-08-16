"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { attachRecipeAction } from "@/lib/actions/events";
import { detachRecipeAction } from "@/lib/actions/recipes";
import { formatScaledIngredient } from "@/lib/scale";
import type { ScaledIngredient } from "@/lib/types";

export function EventRecipeCard({
  eventId,
  recipeId,
  recipeName,
  defaultHeadcount,
  headcountOverride,
  notes,
  scaledIngredients,
  scalingError,
}: {
  eventId: number;
  recipeId: number;
  recipeName: string;
  defaultHeadcount: number;
  headcountOverride: number | null;
  notes: string | null;
  scaledIngredients: ScaledIngredient[] | null;
  scalingError: string | null;
}) {
  const router = useRouter();
  const [editingOverride, setEditingOverride] = useState(false);
  const [overrideValue, setOverrideValue] = useState(headcountOverride ?? defaultHeadcount);
  const [notesValue, setNotesValue] = useState(notes ?? "");
  const [saving, setSaving] = useState(false);

  async function saveOverride() {
    setSaving(true);
    await attachRecipeAction(eventId, recipeId, {
      headcountOverride: overrideValue === defaultHeadcount ? null : overrideValue,
      notes: notesValue || null,
    });
    setSaving(false);
    setEditingOverride(false);
    router.refresh();
  }

  return (
    <div className="rounded-md border border-black/10 dark:border-white/10 p-4 space-y-3 print:break-inside-avoid">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href={`/recipes/${recipeId}`} className="font-medium hover:underline">
            {recipeName}
          </Link>
          <div className="text-sm text-black/60 dark:text-white/60">
            Scaled for {headcountOverride ?? defaultHeadcount} people
            {headcountOverride !== null && " (custom)"}
          </div>
          {notes && <div className="text-sm italic text-black/60 dark:text-white/60">{notes}</div>}
        </div>
        <div className="flex gap-3 text-sm print:hidden">
          <button onClick={() => setEditingOverride((v) => !v)} className="hover:underline">
            {editingOverride ? "Close" : "Adjust"}
          </button>
          <button
            onClick={async () => {
              await detachRecipeAction(eventId, recipeId);
              router.refresh();
            }}
            className="text-red-600 hover:underline"
          >
            Remove
          </button>
        </div>
      </div>

      {editingOverride && (
        <div className="flex flex-wrap items-end gap-3 rounded-md bg-black/[.03] dark:bg-white/[.05] p-3 print:hidden">
          <div>
            <label className="block text-xs font-medium mb-1" htmlFor={`headcount-${recipeId}`}>
              Scale to this many people
            </label>
            <input
              id={`headcount-${recipeId}`}
              type="number"
              min={1}
              value={overrideValue}
              onChange={(e) => setOverrideValue(Number(e.target.value))}
              className="w-24 rounded-md border border-black/20 dark:border-white/20 bg-transparent px-2 py-1 text-sm"
            />
          </div>
          <div className="flex-1 min-w-[10rem]">
            <label className="block text-xs font-medium mb-1" htmlFor={`notes-${recipeId}`}>
              Notes
            </label>
            <input
              id={`notes-${recipeId}`}
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              placeholder="e.g. double batch, needs 2 crockpots"
              className="w-full rounded-md border border-black/20 dark:border-white/20 bg-transparent px-2 py-1 text-sm"
            />
          </div>
          <button
            onClick={saveOverride}
            disabled={saving}
            className="rounded-md bg-black text-white dark:bg-white dark:text-black px-3 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}

      {scalingError ? (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          {scalingError} <Link href={`/recipes/${recipeId}`} className="underline">Fix it</Link>
        </p>
      ) : (
        <ul className="text-sm space-y-1">
          {scaledIngredients?.map((ingredient, idx) => (
            <li key={idx} className={ingredient.needsReview ? "text-amber-600 dark:text-amber-400" : undefined}>
              {formatScaledIngredient(ingredient)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
