"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { IngredientsField } from "@/components/IngredientsField";
import { createVariantAction, deleteVariantAction, updateVariantAction } from "@/lib/actions/events";
import { detachRecipeAction } from "@/lib/actions/recipes";
import { parseIngredientLines } from "@/lib/ingredientParser";
import { formatPanSize, panAreaRatio, panPresetsForFamily, servingsPerPan, vesselNoun, type PanSize } from "@/lib/panSize";
import { batchesNeeded, formatScaledIngredient, scaleIngredients } from "@/lib/scale";
import type { ParsedIngredient, RecipeVariant, ScaledIngredient } from "@/lib/types";

export interface VariantWithIngredients {
  variant: RecipeVariant;
  ingredients: ScaledIngredient[] | null;
  error: string | null;
}

function pluralize(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

// formatPanSize already spells out "qt pot" for a pot -- strip that so
// "N pots of {size}" doesn't read as "2 pots of 8 qt pot".
function sizeOnly(size: PanSize): string {
  const formatted = formatPanSize(size);
  return size.shape === "pot" ? formatted.replace(/\s*pot$/, "") : formatted;
}

export function RecipeVariantsCard({
  eventId,
  recipeId,
  recipeName,
  recipeServings,
  recipeIngredients,
  recipePanSize,
  variants,
}: {
  eventId: number;
  recipeId: number;
  recipeName: string;
  recipeServings: number | null;
  recipeIngredients: ParsedIngredient[];
  recipePanSize: PanSize | null;
  variants: VariantWithIngredients[];
}) {
  const router = useRouter();
  const totalServings = variants.reduce((sum, v) => sum + v.variant.servings, 0);

  return (
    <div className="rounded-md border border-black/10 dark:border-white/10 p-4 space-y-3 print:break-inside-avoid">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href={`/recipes/${recipeId}`} className="font-medium hover:underline">
            {recipeName}
          </Link>
          <div className="text-sm text-black/60 dark:text-white/60">
            {totalServings} people total
            {variants.length > 1 ? ` across ${variants.length} variants` : ""}
          </div>
        </div>
        <button
          onClick={async () => {
            await detachRecipeAction(eventId, recipeId);
            router.refresh();
          }}
          className="text-sm text-red-600 hover:underline print:hidden"
        >
          Remove dish
        </button>
      </div>

      <div className="space-y-3">
        {variants.map(({ variant, ingredients, error }) => (
          <VariantRow
            key={variant.id}
            eventId={eventId}
            variant={variant}
            ingredients={ingredients}
            error={error}
            showLabel={variants.length > 1}
            recipeServings={recipeServings}
            recipePanSize={recipePanSize}
          />
        ))}
      </div>

      <button
        onClick={async () => {
          await createVariantAction(eventId, recipeId, {
            label: "New variant",
            servings: recipeServings ?? 1,
            notes: null,
            ingredients: recipeIngredients,
          });
          router.refresh();
        }}
        className="text-sm underline text-black/70 dark:text-white/70 print:hidden"
      >
        + Add variant (e.g. a gluten-free or allergen-free batch)
      </button>
    </div>
  );
}

function VariantRow({
  eventId,
  variant,
  ingredients,
  error,
  showLabel,
  recipeServings,
  recipePanSize,
}: {
  eventId: number;
  variant: RecipeVariant;
  ingredients: ScaledIngredient[] | null;
  error: string | null;
  showLabel: boolean;
  recipeServings: number | null;
  recipePanSize: PanSize | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(variant.label);
  const [servings, setServings] = useState(variant.servings);
  const [notes, setNotes] = useState(variant.notes ?? "");
  const [ingredientsText, setIngredientsText] = useState(variant.ingredients.map((i) => i.raw).join("\n"));
  const [variantPanSize, setVariantPanSize] = useState<PanSize | null>(variant.panSize);
  const [saving, setSaving] = useState(false);

  // How many people ONE pan feeds for this variant: the recipe's native
  // per-pan capacity, unless this variant has picked a different pan size,
  // in which case it's that pan's capacity (a 9x13 holds more than the 9x9
  // the recipe was written for).
  function perPanCapacity(panSize: PanSize | null): number | null {
    if (!recipeServings) return null;
    if (panSize && recipePanSize) return servingsPerPan(recipeServings, recipePanSize, panSize);
    return recipeServings;
  }

  const savedPerPan = perPanCapacity(variant.panSize);
  const draftPerPan = perPanCapacity(variantPanSize);

  const savedBatches = savedPerPan ? batchesNeeded(variant.servings, savedPerPan) : null;
  const draftBatches = draftPerPan ? batchesNeeded(servings, draftPerPan) : null;
  const draftCoversWhole = draftPerPan && draftBatches ? servings === draftBatches * draftPerPan : true;
  const savedNoun = vesselNoun(variant.panSize ?? recipePanSize);
  const draftNoun = vesselNoun(variantPanSize ?? recipePanSize);

  // Live preview computed from the current (possibly unsaved) form state,
  // so editing servings, the ingredient list, or picking a different pan
  // size all show their effect immediately instead of only after Save.
  const livePreview = useMemo(() => {
    if (!recipeServings || recipeServings <= 0) return null;
    const factor = servings / recipeServings;
    return scaleIngredients(parseIngredientLines(ingredientsText.split("\n")), factor);
  }, [ingredientsText, servings, recipeServings]);

  async function save() {
    setSaving(true);
    await updateVariantAction(eventId, variant.id, {
      label,
      servings,
      notes: notes || null,
      ingredients: parseIngredientLines(ingredientsText.split("\n")),
      panSize: variantPanSize,
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  const displayIngredients = editing ? livePreview : ingredients;

  return (
    <div className="rounded-md bg-black/[.02] dark:bg-white/[.04] p-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          {showLabel && <div className="text-sm font-medium">{variant.label}</div>}
          <div className="text-xs text-black/60 dark:text-white/60">
            {variant.servings} people
            {savedBatches !== null && (
              <>
                {" "}
                &middot; {pluralize(savedBatches, savedNoun)}
                {variant.panSize && ` of ${sizeOnly(variant.panSize)}`}
              </>
            )}
            {variant.notes && <span className="italic"> &middot; {variant.notes}</span>}
          </div>
        </div>
        <div className="flex gap-3 text-xs print:hidden">
          <button onClick={() => setEditing((v) => !v)} className="hover:underline">
            {editing ? "Close" : "Edit"}
          </button>
          <button
            onClick={async () => {
              await deleteVariantAction(eventId, variant.id);
              router.refresh();
            }}
            className="text-red-600 hover:underline"
          >
            Remove
          </button>
        </div>
      </div>

      {editing && (
        <div className="space-y-3 print:hidden">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" htmlFor={`variant-label-${variant.id}`}>
                Label
              </label>
              <input
                id={`variant-label-${variant.id}`}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Gluten-free topping"
                className="w-44 rounded-md border border-black/20 dark:border-white/20 bg-transparent px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" htmlFor={`variant-servings-${variant.id}`}>
                Servings
              </label>
              <input
                id={`variant-servings-${variant.id}`}
                type="number"
                min={1}
                value={servings}
                onChange={(e) => setServings(Number(e.target.value))}
                className="w-24 rounded-md border border-black/20 dark:border-white/20 bg-transparent px-2 py-1 text-sm"
              />
            </div>
            <div className="flex-1 min-w-[12rem]">
              <label className="block text-xs font-medium mb-1" htmlFor={`variant-notes-${variant.id}`}>
                Modification notes
              </label>
              <input
                id={`variant-notes-${variant.id}`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. omit poppy seeds for seed allergy"
                className="w-full rounded-md border border-black/20 dark:border-white/20 bg-transparent px-2 py-1 text-sm"
              />
            </div>
          </div>

          {recipeServings && draftBatches !== null && draftPerPan !== null && (
            <p className="text-xs text-black/60 dark:text-white/60">
              &asymp; {(servings / recipeServings).toFixed(2)}x the recipe &middot; {pluralize(draftBatches, draftNoun)}
              {variantPanSize && ` of ${sizeOnly(variantPanSize)}`} ({draftPerPan}/{draftNoun})
              {!draftCoversWhole && (
                <>
                  {" "}
                  -- {draftBatches * draftPerPan} people if you round up.{" "}
                  <button
                    type="button"
                    onClick={() => setServings(draftBatches * draftPerPan)}
                    className="underline font-medium"
                  >
                    Round up to whole {draftNoun}s
                  </button>
                </>
              )}
            </p>
          )}

          {recipePanSize && recipeServings && (
            <PanSizeCalculator
              recipeServings={recipeServings}
              recipePanSize={recipePanSize}
              currentServings={servings}
              selectedPanSize={variantPanSize}
              onApply={(newServings, panSize) => {
                setServings(newServings);
                setVariantPanSize(panSize);
              }}
            />
          )}

          <IngredientsField
            id={`variant-ingredients-${variant.id}`}
            label="Ingredients for this variant (edit to remove or swap something)"
            value={ingredientsText}
            onChange={setIngredientsText}
            minRows={3}
          />

          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-black text-white dark:bg-white dark:text-black px-3 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}

      {error ? (
        <p className="text-sm text-amber-600 dark:text-amber-400">{error}</p>
      ) : (
        <ul className="text-sm space-y-1">
          {displayIngredients?.map((ingredient, idx) => (
            <li key={idx} className={ingredient.needsReview ? "text-amber-600 dark:text-amber-400" : undefined}>
              {formatScaledIngredient(ingredient)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PanSizeCalculator({
  recipeServings,
  recipePanSize,
  currentServings,
  selectedPanSize,
  onApply,
}: {
  recipeServings: number;
  recipePanSize: PanSize;
  currentServings: number;
  selectedPanSize: PanSize | null;
  onApply: (servings: number, panSize: PanSize) => void;
}) {
  const [show, setShow] = useState(selectedPanSize !== null);
  const options = panPresetsForFamily(recipePanSize);
  const [targetPresetId, setTargetPresetId] = useState(
    options.find((p) => selectedPanSize && formatPanSize(p.size) === formatPanSize(selectedPanSize))?.id ??
      options[0].id,
  );
  const noun = vesselNoun(recipePanSize);

  const targetPreset = options.find((p) => p.id === targetPresetId) ?? options[0];
  const ratio = panAreaRatio(recipePanSize, targetPreset.size);
  // How many people ONE pan of the newly-chosen size feeds -- not the
  // recipe's native per-pan count. The number of pans is then however many
  // of THIS pan it takes to cover the headcount we're currently working
  // toward, rounded up, never a batch count computed against the old pan.
  const newServingsPerPan = servingsPerPan(recipeServings, recipePanSize, targetPreset.size);
  const batches = batchesNeeded(currentServings, newServingsPerPan);
  const totalServings = batches * newServingsPerPan;

  if (!show) {
    return (
      <button type="button" onClick={() => setShow(true)} className="text-xs underline">
        Size by {noun} instead of typing servings
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md bg-black/[.03] dark:bg-white/[.06] p-2 text-xs">
      <span>{noun === "pot" ? "Cooking" : "Baking"} this in</span>
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
        &asymp; {ratio.toFixed(2)}x the recipe &rarr; {newServingsPerPan} people/{noun} &middot;{" "}
        {pluralize(batches, noun)} needed for {currentServings} people &rarr; {totalServings} people total
      </span>
      <button
        type="button"
        onClick={() => onApply(totalServings, targetPreset.size)}
        className="rounded-md border border-black/20 dark:border-white/20 px-2 py-1 font-medium"
      >
        Use this
      </button>
    </div>
  );
}
