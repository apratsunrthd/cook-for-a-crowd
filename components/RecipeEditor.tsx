"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { attachRecipeAction } from "@/lib/actions/events";
import { saveRecipeAction } from "@/lib/actions/recipes";
import { parseIngredientLines } from "@/lib/ingredientParser";
import type { Recipe } from "@/lib/types";

export interface RecipeDraft {
  name: string;
  sourceUrl: string | null;
  servings: number | null;
  rawYieldText: string | null;
  ingredientLines: string[];
  instructions: string | null;
  imageUrl: string | null;
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
  };
}

export function RecipeEditor({
  recipeId,
  initialDraft,
  attachToEventId,
}: {
  recipeId?: number;
  initialDraft?: RecipeDraft | Recipe;
  attachToEventId?: number;
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
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const parsedIngredients = useMemo(
    () => parseIngredientLines(ingredientsText.split("\n")),
    [ingredientsText],
  );
  const needsReviewCount = parsedIngredients.filter((i) => i.needsReview).length;

  const requiresServings = attachToEventId !== undefined;

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
    });

    if (!result.ok) {
      setSaving(false);
      setError(result.error);
      return;
    }

    if (attachToEventId !== undefined) {
      await attachRecipeAction(attachToEventId, result.data.id);
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

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="ingredients">
          Ingredients (one per line)
        </label>
        <textarea
          id="ingredients"
          rows={Math.max(6, ingredientsText.split("\n").length + 1)}
          value={ingredientsText}
          onChange={(e) => setIngredientsText(e.target.value)}
          className="w-full rounded-md border border-black/20 dark:border-white/20 bg-transparent px-3 py-2 font-mono text-sm"
          placeholder={"2 cups flour\n1 tsp salt"}
        />
        {needsReviewCount > 0 && (
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            {needsReviewCount} line{needsReviewCount === 1 ? "" : "s"} had no quantity found and
            won&apos;t be scaled automatically -- shown as-is when the recipe is scaled.
          </p>
        )}
        <IngredientPreview lines={parsedIngredients} />
      </div>

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

      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {saving ? "Saving…" : attachToEventId !== undefined ? "Save and add to event" : "Save recipe"}
      </button>
    </form>
  );
}

function IngredientPreview({ lines }: { lines: ReturnType<typeof parseIngredientLines> }) {
  if (lines.length === 0) return null;
  return (
    <ul className="mt-2 space-y-0.5 text-xs text-black/60 dark:text-white/60">
      {lines.map((line, idx) => (
        <li key={idx} className={line.needsReview ? "text-amber-600 dark:text-amber-400" : undefined}>
          {line.isGroupHeader
            ? `— ${line.description} —`
            : line.needsReview
              ? `⚠ "${line.raw}" (no quantity found)`
              : `✓ ${line.quantity}${line.quantity2 ? `-${line.quantity2}` : ""} ${line.unit ?? ""} ${line.description}`}
        </li>
      ))}
    </ul>
  );
}
