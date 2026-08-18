"use client";

import { useState } from "react";
import { formatPanSize, panAreaRatio, panPresetsForFamily, vesselNoun, type PanSize } from "@/lib/panSize";
import { formatScaledIngredientLine, scaleIngredients } from "@/lib/scale";
import type { ParsedIngredient } from "@/lib/types";

/**
 * Lets you rescale the recipe you're about to save from the pan it's
 * currently written for to the pan you actually plan to bake it in --
 * servings and every ingredient quantity scale by pan area together, live,
 * before you ever save. Applying sets the recorded pan size to the new
 * target too, so it stays the source of truth for future rescales.
 */
export function PanRescaleField({
  panSize,
  servings,
  ingredients,
  onApply,
}: {
  panSize: PanSize;
  servings: number | null;
  ingredients: ParsedIngredient[];
  onApply: (result: { panSize: PanSize; servings: number | null; ingredientLines: string[] }) => void;
}) {
  const [show, setShow] = useState(false);
  const options = panPresetsForFamily(panSize);
  const [targetPresetId, setTargetPresetId] = useState(options[0].id);
  const noun = vesselNoun(panSize);

  const targetPreset = options.find((p) => p.id === targetPresetId) ?? options[0];
  const ratio = panAreaRatio(panSize, targetPreset.size);
  const newServings = servings !== null ? Math.round(servings * ratio) : null;

  if (!show) {
    return (
      <button
        type="button"
        onClick={() => setShow(true)}
        className="text-xs underline text-black/70 dark:text-white/70"
      >
        I actually want to {noun === "pot" ? "cook" : "bake"} this in a different {noun}
      </button>
    );
  }

  return (
    <div className="rounded-md bg-black/[.03] dark:bg-white/[.06] p-2 space-y-2 text-xs">
      <p className="text-black/60 dark:text-white/60">
        Written for {formatPanSize(panSize)}
        {servings !== null && ` (serves ${servings})`}. Pick the {noun} you actually plan to use and
        the servings and ingredients below will rescale to match.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={targetPresetId}
          onChange={(e) => setTargetPresetId(e.target.value)}
          className="rounded-md border border-black/20 dark:border-white/20 bg-transparent px-2 py-1"
        >
          {options.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <span>
          &asymp; {ratio.toFixed(2)}x{newServings !== null && <> &rarr; serves {newServings}</>}
        </span>
        <button
          type="button"
          onClick={() => {
            const scaled = scaleIngredients(ingredients, ratio);
            onApply({
              panSize: targetPreset.size,
              servings: newServings,
              ingredientLines: scaled.map(formatScaledIngredientLine),
            });
            setShow(false);
          }}
          className="rounded-md border border-black/20 dark:border-white/20 px-2 py-1 font-medium"
        >
          Use this size instead
        </button>
      </div>
    </div>
  );
}
