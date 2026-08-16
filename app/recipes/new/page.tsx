"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { RecipeEditor, type RecipeDraft } from "@/components/RecipeEditor";
import { importRecipeDraftAction } from "@/lib/actions/recipes";

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

  const [url, setUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [draft, setDraft] = useState<RecipeDraft | null>(null);
  const [started, setStarted] = useState(false);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    setImporting(true);
    setImportError(null);
    const result = await importRecipeDraftAction(url);
    setImporting(false);
    if (!result.ok) {
      setImportError(result.error);
      return;
    }
    setDraft({
      name: result.data.name,
      sourceUrl: result.data.sourceUrl,
      servings: result.data.servings,
      rawYieldText: result.data.rawYieldText,
      ingredientLines: result.data.ingredients.map((i) => i.raw),
      instructions: result.data.instructions,
      imageUrl: result.data.imageUrl,
    });
    setStarted(true);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New recipe</h1>

      {!started && (
        <div className="space-y-4 max-w-md">
          <form onSubmit={handleImport} className="space-y-2">
            <label className="block text-sm font-medium" htmlFor="url">
              Import from a recipe URL
            </label>
            <div className="flex gap-2">
              <input
                id="url"
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/some-recipe"
                className="flex-1 rounded-md border border-black/20 dark:border-white/20 bg-transparent px-3 py-2"
              />
              <button
                type="submit"
                disabled={importing}
                className="rounded-md bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {importing ? "Importing…" : "Import"}
              </button>
            </div>
            {importError && <p className="text-sm text-red-600">{importError}</p>}
          </form>

          <div className="flex items-center gap-3 text-sm text-black/50 dark:text-white/50">
            <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
            or
            <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
          </div>

          <button
            onClick={() => setStarted(true)}
            className="rounded-md border border-black/20 dark:border-white/20 px-4 py-2 text-sm font-medium"
          >
            Enter a recipe by hand
          </button>
        </div>
      )}

      {started && (
        <RecipeEditor initialDraft={draft ?? undefined} attachToEventId={attachToEventId} />
      )}
    </div>
  );
}
