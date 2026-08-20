"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { RecipeEditor, type RecipeDraft } from "@/components/RecipeEditor";
import { getEventHeadcountAction } from "@/lib/actions/events";
import {
  generateRecipeDraftAction,
  importRecipeDraftAction,
  regenerateRecipeDraftAction,
  reviseRecipeDraftAction,
} from "@/lib/actions/recipes";
import { formatPanSize } from "@/lib/panSize";
import type { ImportedRecipeDraft } from "@/lib/recipeImport";
import type { Course } from "@/lib/types";

export default function NewRecipePage() {
  return (
    <Suspense fallback={null}>
      <NewRecipeForm />
    </Suspense>
  );
}

function NewRecipeForm() {
  const searchParams = useSearchParams();
  const eventIdParam = searchParams.get("eventId");
  const attachToEventId = eventIdParam ? Number(eventIdParam) : undefined;

  const [pasted, setPasted] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiCourse, setAiCourse] = useState<Course>("main");
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // AI-generated drafts land here for review first -- unlike a pasted/
  // imported recipe (which comes from a real source you either want or
  // don't), a generated one is worth being able to reroll or nudge before
  // committing to it.
  const [reviewDraft, setReviewDraft] = useState<ImportedRecipeDraft | null>(null);
  const [feedback, setFeedback] = useState("");
  const [revising, setRevising] = useState(false);

  const [draft, setDraft] = useState<RecipeDraft | null>(null);
  const [initialCourse, setInitialCourse] = useState<Course>("main");
  const [started, setStarted] = useState(false);
  const [eventHeadcount, setEventHeadcount] = useState<number | null>(null);

  useEffect(() => {
    if (attachToEventId === undefined) return;
    getEventHeadcountAction(attachToEventId).then(setEventHeadcount);
  }, [attachToEventId]);

  function applyDraft(data: ImportedRecipeDraft) {
    setDraft({
      name: data.name,
      sourceUrl: data.sourceUrl,
      servings: data.servings,
      rawYieldText: data.rawYieldText,
      ingredientLines: data.ingredients.map((i) => i.raw),
      instructions: data.instructions,
      imageUrl: data.imageUrl,
      panSize: data.panSize,
    });
    setStarted(true);
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    setImporting(true);
    setImportError(null);
    const result = await importRecipeDraftAction(pasted);
    setImporting(false);
    if (!result.ok) {
      setImportError(result.error);
      return;
    }
    applyDraft(result.data);
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setAiError(null);
    const result = await generateRecipeDraftAction(aiPrompt, aiCourse, eventHeadcount);
    setGenerating(false);
    if (!result.ok) {
      setAiError(result.error);
      return;
    }
    setReviewDraft(result.data);
  }

  async function handleTryAgain() {
    setGenerating(true);
    setAiError(null);
    const result = await regenerateRecipeDraftAction(aiPrompt, aiCourse, eventHeadcount);
    setGenerating(false);
    if (!result.ok) {
      setAiError(result.error);
      return;
    }
    setReviewDraft(result.data);
    setFeedback("");
  }

  async function handleRevise(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewDraft) return;
    setRevising(true);
    setAiError(null);
    const result = await reviseRecipeDraftAction(
      aiPrompt,
      {
        name: reviewDraft.name,
        servings: reviewDraft.servings,
        ingredientLines: reviewDraft.ingredients.map((i) => i.raw),
        instructions: reviewDraft.instructions,
      },
      feedback,
      aiCourse,
      eventHeadcount,
    );
    setRevising(false);
    if (!result.ok) {
      setAiError(result.error);
      return;
    }
    setReviewDraft(result.data);
    setFeedback("");
  }

  function useReviewDraft() {
    if (!reviewDraft) return;
    setInitialCourse(aiCourse);
    applyDraft(reviewDraft);
    setReviewDraft(null);
  }

  function startOver() {
    setReviewDraft(null);
    setFeedback("");
    setAiError(null);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New recipe</h1>

      {!started && !reviewDraft && (
        <div className="space-y-4 max-w-md">
          <form onSubmit={handleImport} className="space-y-2">
            <label className="block text-sm font-medium" htmlFor="paste">
              Paste a recipe
            </label>
            <p className="text-xs text-black/60 dark:text-white/60">
              A recipe URL, the page&apos;s HTML source (if the URL fails to import), or just the
              recipe text you copied off the page.
            </p>
            <textarea
              id="paste"
              required
              rows={4}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder={"https://example.com/some-recipe\n\n...or paste HTML or plain recipe text here"}
              className="w-full rounded-md border border-black/20 dark:border-white/20 bg-transparent px-3 py-2 font-mono text-xs"
            />
            <button
              type="submit"
              disabled={importing}
              className="rounded-md bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {importing ? "Importing…" : "Import"}
            </button>
            {importError && <p className="text-sm text-red-600">{importError}</p>}
          </form>

          <div className="flex items-center gap-3 text-sm text-black/50 dark:text-white/50">
            <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
            or
            <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
          </div>

          <form onSubmit={handleGenerate} className="space-y-2">
            <label className="block text-sm font-medium" htmlFor="ai-prompt">
              Generate with AI
            </label>
            <div className="flex gap-2">
              <input
                id="ai-prompt"
                required
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="a simple recipe for canned green beans"
                className="flex-1 rounded-md border border-black/20 dark:border-white/20 bg-transparent px-3 py-2"
              />
              <select
                value={aiCourse}
                onChange={(e) => setAiCourse(e.target.value as Course)}
                aria-label="Course, so portion sizes are realistic"
                className="rounded-md border border-black/20 dark:border-white/20 bg-transparent px-2 py-2 text-sm"
              >
                <option value="main">Main</option>
                <option value="side">Side</option>
                <option value="dessert">Dessert</option>
              </select>
              <button
                type="submit"
                disabled={generating}
                className="rounded-md border border-black/20 dark:border-white/20 px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {generating ? "Generating…" : "Generate"}
              </button>
            </div>
            <p className="text-xs text-black/50 dark:text-white/50">
              Course affects portion sizing -- sides and desserts get smaller, more realistic
              per-person amounts than a main.
              {eventHeadcount !== null &&
                ` Sized directly for this event's ${eventHeadcount}-person target headcount.`}
            </p>
            {aiError && <p className="text-sm text-red-600">{aiError}</p>}
          </form>

          <button
            onClick={() => setStarted(true)}
            className="text-sm underline text-black/70 dark:text-white/70"
          >
            Start with a blank recipe
          </button>
        </div>
      )}

      {reviewDraft && (
        <div className="space-y-4 max-w-md">
          <div className="rounded-md border border-black/10 dark:border-white/10 p-4 space-y-2">
            <div className="font-medium">{reviewDraft.name}</div>
            <div className="text-sm text-black/60 dark:text-white/60">
              Serves {reviewDraft.servings ?? "?"}
              {reviewDraft.panSize && ` · ${formatPanSize(reviewDraft.panSize)}`}
            </div>
            <ul className="text-sm list-disc pl-4 space-y-0.5">
              {reviewDraft.ingredients.map((ingredient, idx) => (
                <li key={idx}>{ingredient.raw}</li>
              ))}
            </ul>
            {reviewDraft.instructions && (
              <p className="text-sm whitespace-pre-line text-black/80 dark:text-white/80">
                {reviewDraft.instructions}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={useReviewDraft}
              className="rounded-md bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-sm font-medium"
            >
              Use this recipe
            </button>
            <button
              onClick={handleTryAgain}
              disabled={generating}
              className="rounded-md border border-black/20 dark:border-white/20 px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {generating ? "Trying again…" : "Try again"}
            </button>
          </div>

          <form onSubmit={handleRevise} className="space-y-2">
            <label className="block text-sm font-medium" htmlFor="feedback">
              Or give feedback and revise
            </label>
            <div className="flex gap-2">
              <input
                id="feedback"
                required
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="e.g. less spicy, use chicken thighs instead of breasts"
                className="flex-1 rounded-md border border-black/20 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={revising || !feedback.trim()}
                className="rounded-md border border-black/20 dark:border-white/20 px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {revising ? "Revising…" : "Revise"}
              </button>
            </div>
          </form>

          {aiError && <p className="text-sm text-red-600">{aiError}</p>}

          <button onClick={startOver} className="text-sm underline text-black/70 dark:text-white/70">
            Start over with a different prompt
          </button>
        </div>
      )}

      {started && (
        <RecipeEditor
          initialDraft={draft ?? undefined}
          attachToEventId={attachToEventId}
          initialCourse={initialCourse}
        />
      )}
    </div>
  );
}
