"use client";

import { useState } from "react";
import { PAN_PRESETS, formatPanSize, panAreaRatio, sameVesselFamily, vesselNoun, type PanSize } from "@/lib/panSize";
import { formatScaledIngredientLine, scaleIngredients } from "@/lib/scale";
import type { ParsedIngredient } from "@/lib/types";

/**
 * Lets you rescale the recipe you're about to save from the pan it's
 * currently written for to the pan you actually plan to bake it in --
 * servings and every ingredient quantity scale by pan area together, live,
 * before you ever save. Applying sets the recorded pan size to the new
 * target too, so it stays the source of truth for future rescales.
 *
 * Offers every preset, pots and pans alike -- a dish written for a stovetop
 * pot (e.g. canned green beans) can just as reasonably end up served from a
 * steam table pan at the event. Area (sq in) and capacity (qt) aren't on a
 * comparable scale though, so a same-family pick keeps the automatic
 * area/capacity ratio; a cross-family pick asks directly how many people
 * the new vessel should feed instead of computing a ratio that would be
 * meaningless.
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
  const [targetPresetId, setTargetPresetId] = useState(PAN_PRESETS[0].id);
  const [crossFamilyHeadcount, setCrossFamilyHeadcount] = useState<number | "">(servings ?? "");
  const noun = vesselNoun(panSize);

  const targetPreset = PAN_PRESETS.find((p) => p.id === targetPresetId) ?? PAN_PRESETS[0];
  const sameFamily = sameVesselFamily(panSize, targetPreset.size);
  const ratio = sameFamily ? panAreaRatio(panSize, targetPreset.size) : null;
  const areaBasedServings = ratio !== null && servings !== null ? Math.round(servings * ratio) : null;

  const effectiveRatio =
    ratio ?? (crossFamilyHeadcount !== "" && servings !== null && servings > 0
      ? Number(crossFamilyHeadcount) / servings
      : null);
  const newServings = sameFamily ? areaBasedServings : crossFamilyHeadcount === "" ? null : Number(crossFamilyHeadcount);

  if (!show) {
    return (
      <button
        type="button"
        onClick={() => setShow(true)}
        className="text-xs underline text-black/70 dark:text-white/70"
      >
        I actually want to {noun === "pot" ? "cook" : "bake"} this in a different pan or pot
      </button>
    );
  }

  return (
    <div className="rounded-md bg-black/[.03] dark:bg-white/[.06] p-2 space-y-2 text-xs">
      <p className="text-black/60 dark:text-white/60">
        Written for {formatPanSize(panSize)}
        {servings !== null && ` (serves ${servings})`}. Pick the pan or pot you actually plan to use and
        the servings and ingredients below will rescale to match.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={targetPresetId}
          onChange={(e) => {
            const nextId = e.target.value;
            setTargetPresetId(nextId);
            const nextPreset = PAN_PRESETS.find((p) => p.id === nextId) ?? PAN_PRESETS[0];
            if (!sameVesselFamily(panSize, nextPreset.size)) setCrossFamilyHeadcount(servings ?? "");
          }}
          className="rounded-md border border-black/20 dark:border-white/20 bg-transparent px-2 py-1"
        >
          {PAN_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>

        {sameFamily ? (
          <span>
            &asymp; {ratio!.toFixed(2)}x{areaBasedServings !== null && <> &rarr; serves {areaBasedServings}</>}
          </span>
        ) : (
          <>
            <span className="text-black/60 dark:text-white/60">
              A {vesselNoun(panSize)} and a {vesselNoun(targetPreset.size)} don&apos;t compare by size directly --
              how many people should this serve?
            </span>
            <input
              type="number"
              min={1}
              value={crossFamilyHeadcount}
              onChange={(e) => setCrossFamilyHeadcount(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-20 rounded-md border border-black/20 dark:border-white/20 bg-transparent px-2 py-1"
              aria-label="Target servings for the new vessel"
            />
            <span>people</span>
          </>
        )}

        <button
          type="button"
          disabled={effectiveRatio === null}
          onClick={() => {
            if (effectiveRatio === null) return;
            const scaled = scaleIngredients(ingredients, effectiveRatio);
            onApply({
              panSize: targetPreset.size,
              servings: newServings,
              ingredientLines: scaled.map(formatScaledIngredientLine),
            });
            setShow(false);
          }}
          className="rounded-md border border-black/20 dark:border-white/20 px-2 py-1 font-medium disabled:opacity-50"
        >
          Use this size instead
        </button>
        <button
          type="button"
          onClick={() => setShow(false)}
          className="text-black/60 dark:text-white/60 underline"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
