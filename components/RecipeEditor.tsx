"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { IngredientsField } from "@/components/IngredientsField";
import { PanRescaleField } from "@/components/PanRescaleField";
import { PanSizeField } from "@/components/PanSizeField";
import { attachRecipeAction, getEventHeadcountAction } from "@/lib/actions/events";
import { saveRecipeAction } from "@/lib/actions/recipes";
import { parseIngredientLines } from "@/lib/ingredientParser";
import { formatPanSize, vesselNoun, type PanSize } from "@/lib/panSize";
import { formatScaledIngredientLine, scaleIngredients } from "@/lib/scale";
import type { Course, Recipe } from "@/lib/types";

function panSizeKey(size: PanSize | null): string {
  return size ? formatPanSize(size) : "";
}

export interface RecipeDraft {
  name: string;
  sourceUrl: string | null;
  servings: number | null;
  rawYieldText: string | null;
  ingredientLines: string[];
  instructions: string | null;
  imageUrl: string | null;
  panSize: PanSize | null;
}

function recipeToDraft(recipe: Recipe): RecipeDraft {
  return {
    name: recipe.name,
    sourceUrl: recipe.sourceUrl,
    servings: recipe.servings,
    rawYieldText: recipe.rawYieldText,
    ingredientLines: recipe.ingredients.map((i) => i.raw),
    instructions: recipe.instructions,
    imageUrl: recipe.imageUrl,
    panSize: recipe.panSize,
  };
}

function initialPanSize(initialDraft: RecipeDraft | Recipe | undefined): PanSize | null {
  return initialDraft && "panSize" in initialDraft ? initialDraft.panSize : null;
}

export function RecipeEditor({
  recipeId,
  initialDraft,
  attachToEventId,
  initialCourse,
}: {
  recipeId?: number;
  initialDraft?: RecipeDraft | Recipe;
  attachToEventId?: number;
  initialCourse?: Course;
}) {
  const router = useRouter();
  const draft = initialDraft && "ingredients" in initialDraft ? recipeToDraft(initialDraft) : initialDraft;

  const [name, setName] = useState(draft?.name ?? "");
  const [sourceUrl] = useState(draft?.sourceUrl ?? null);
  const [servings, setServings] = useState<number | "">(draft?.servings ?? "");
  const [rawYieldText] = useState(draft?.rawYieldText ?? null);
  const [ingredientsText, setIngredientsText] = useState((draft?.ingredientLines ?? []).join("\n"));
  const [instructions, setInstructions] = useState(draft?.instructions ?? "");
  const [imageUrl] = useState(draft?.imageUrl ?? null);
  const [panSize, setPanSize] = useState<PanSize | null>(initialPanSize(initialDraft));
  // Bumped whenever panSize is overwritten from OUTSIDE PanSizeField (i.e.
  // by PanRescaleField), forcing it to remount and re-seed its display from
  // the new value instead of showing a stale preset.
  const [panSizeVersion, setPanSizeVersion] = useState(0);
  // Picking a vessel that doesn't match the recipe's current servings is
  // exactly how a "20qt pot, 6 servings" inconsistency gets created --
  // whenever a vessel choice would leave servings unexplained, ask instead
  // of silently tagging it.
  const [pendingVesselChange, setPendingVesselChange] = useState<PanSize | null>(null);
  const [resizeTargetServings, setResizeTargetServings] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [course, setCourse] = useState<Course>(initialCourse ?? "main");
  const [eventHeadcount, setEventHeadcount] = useState<number | null>(null);

  useEffect(() => {
    if (attachToEventId === undefined) return;
    getEventHeadcountAction(attachToEventId).then(setEventHeadcount);
  }, [attachToEventId]);

  const parsedIngredients = useMemo(
    () => parseIngredientLines(ingredientsText.split("\n")),
    [ingredientsText],
  );

  const requiresServings = attachToEventId !== undefined;

  /**
   * Only commits a vessel choice immediately when there's nothing it could
   * contradict (no servings recorded yet, or it's an actual no-op). If the
   * recipe already has real servings, a vessel change is ambiguous --
   * "record what this recipe (as written) already uses" vs. "resize this
   * recipe to fill a different vessel" -- and picking wrong silently
   * produces exactly the bug this exists to prevent.
   */
  function handlePanSizeChange(newSize: PanSize | null) {
    const servingsNumber = servings === "" ? null : Number(servings);
    const changed = panSizeKey(newSize) !== panSizeKey(panSize);
    if (newSize !== null && changed && servingsNumber !== null && servingsNumber > 0) {
      setPendingVesselChange(newSize);
      // Default to the event's actual target headcount when known -- the
      // whole point of asking is to size for how many people you're really
      // cooking for, not to guess at how full a vessel should be.
      setResizeTargetServings(eventHeadcount ?? servingsNumber);
      return;
    }
    setPanSize(newSize);
    setPanSizeVersion((v) => v + 1);
  }

  function confirmServingsUnchanged() {
    if (!pendingVesselChange) return;
    setPanSize(pendingVesselChange);
    setPanSizeVersion((v) => v + 1);
    setPendingVesselChange(null);
  }

  function confirmResizeToVessel() {
    if (!pendingVesselChange || resizeTargetServings === "" || Number(resizeTargetServings) <= 0) return;
    const currentServings = servings === "" ? 0 : Number(servings);
    const factor = currentServings > 0 ? Number(resizeTargetServings) / currentServings : 1;
    const scaled = scaleIngredients(parsedIngredients, factor);
    setIngredientsText(scaled.map(formatScaledIngredientLine).join("\n"));
    setServings(Number(resizeTargetServings));
    setPanSize(pendingVesselChange);
    setPanSizeVersion((v) => v + 1);
    setPendingVesselChange(null);
  }

  function cancelVesselChange() {
    setPendingVesselChange(null);
    // PanSizeField already updated its own display optimistically -- force
    // it to remount and re-seed from the actual (unchanged) panSize.
    setPanSizeVersion((v) => v + 1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const servingsNumber = servings === "" ? null : Number(servings);
    if (requiresServings && (!servingsNumber || servingsNumber <= 0)) {
      setError("Enter how many people this recipe serves before adding it to an event.");
      return;
    }

    setSaving(true);
    const result = await saveRecipeAction(recipeId ?? null, {
      name,
      sourceUrl,
      servings: servingsNumber,
      rawYieldText,
      ingredients: parsedIngredients,
      instructions: instructions || null,
      imageUrl,
      panSize,
    });

    if (!result.ok) {
      setSaving(false);
      setError(result.error);
      return;
    }

    if (attachToEventId !== undefined) {
      await attachRecipeAction(attachToEventId, result.data.id, course, eventHeadcount ?? servingsNumber ?? 1);
      router.push(`/events/${attachToEventId}`);
    } else {
      router.push(`/recipes/${result.data.id}`);
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {sourceUrl && (
        <p className="text-sm text-black/60 dark:text-white/60">
          Imported from{" "}
          <a href={sourceUrl} target="_blank" rel="noreferrer" className="underline">
            {sourceUrl}
          </a>
        </p>
      )}

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="name">
          Recipe name
        </label>
        <input
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-black/20 dark:border-white/20 bg-transparent px-3 py-2"
        />
      </div>

      {attachToEventId !== undefined && (
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="course">
            Course
          </label>
          <select
            id="course"
            value={course}
            onChange={(e) => setCourse(e.target.value as Course)}
            className="rounded-md border border-black/20 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
          >
            <option value="main">Main</option>
            <option value="side">Side</option>
            <option value="dessert">Dessert</option>
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="servings">
          Servings (how many people this feeds){requiresServings && " *"}
        </label>
        <input
          id="servings"
          type="number"
          min={1}
          value={servings}
          onChange={(e) => setServings(e.target.value === "" ? "" : Number(e.target.value))}
          className="w-32 rounded-md border border-black/20 dark:border-white/20 bg-transparent px-3 py-2"
        />
        {rawYieldText && (
          <p className="mt-1 text-xs text-black/50 dark:text-white/50">
            Scraped yield text: &ldquo;{rawYieldText}&rdquo; -- correct the number above if this
            means something other than servings (e.g. &ldquo;makes 2 dozen cookies&rdquo;).
          </p>
        )}
      </div>

      <IngredientsField id="ingredients" value={ingredientsText} onChange={setIngredientsText} />

      <PanSizeField key={panSizeVersion} value={panSize} onChange={handlePanSizeChange} />

      {pendingVesselChange && (
        <div className="rounded-md border border-amber-400/50 bg-amber-50 dark:bg-amber-900/20 p-3 space-y-2 text-sm">
          <p>
            Recording this as {formatPanSize(pendingVesselChange)}. This recipe currently has{" "}
            {servings} servings -- does a {vesselNoun(pendingVesselChange)} that size actually make about{" "}
            {servings} servings of this dish, or are you cooking for a different number of people?
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={confirmServingsUnchanged}
              className="rounded-md border border-black/20 dark:border-white/20 px-2 py-1 font-medium"
            >
              Yes, {servings} is right for this {vesselNoun(pendingVesselChange)}
            </button>
            <span>or I&apos;m actually cooking for about</span>
            <input
              type="number"
              min={1}
              value={resizeTargetServings}
              onChange={(e) => setResizeTargetServings(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-20 rounded-md border border-black/20 dark:border-white/20 bg-transparent px-2 py-1"
              aria-label="How many people you're actually cooking for"
            />
            <button
              type="button"
              onClick={confirmResizeToVessel}
              disabled={resizeTargetServings === ""}
              className="rounded-md border border-black/20 dark:border-white/20 px-2 py-1 font-medium disabled:opacity-50"
            >
              people -- resize to match
            </button>
          </div>
          <p className="text-xs text-black/50 dark:text-white/50">
            {eventHeadcount !== null
              ? `Pre-filled with this event's target headcount (${eventHeadcount}) -- adjust if this dish should cover a different number.`
              : "The recipe scales exactly to whatever headcount you enter -- no need to fill the vessel to its maximum capacity."}
          </p>
          <button type="button" onClick={cancelVesselChange} className="text-xs underline">
            Cancel
          </button>
        </div>
      )}

      {panSize && (
        <PanRescaleField
          panSize={panSize}
          servings={servings === "" ? null : Number(servings)}
          ingredients={parsedIngredients}
          onApply={({ panSize: newPanSize, servings: newServings, ingredientLines }) => {
            setPanSize(newPanSize);
            setPanSizeVersion((v) => v + 1);
            if (newServings !== null) setServings(newServings);
            setIngredientsText(ingredientLines.join("\n"));
          }}
        />
      )}

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="instructions">
          Instructions <span className="text-black/40 dark:text-white/40">(optional)</span>
        </label>
        <textarea
          id="instructions"
          rows={4}
          value={instructions ?? ""}
          onChange={(e) => setInstructions(e.target.value)}
          className="w-full rounded-md border border-black/20 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Saving…" : attachToEventId !== undefined ? "Save and add to event" : "Save recipe"}
        </button>
        <button
          type="button"
          onClick={() =>
            router.push(
              attachToEventId !== undefined
                ? `/events/${attachToEventId}`
                : recipeId !== undefined
                  ? `/recipes/${recipeId}`
                  : "/recipes",
            )
          }
          className="rounded-md border border-black/20 dark:border-white/20 px-4 py-2 text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
