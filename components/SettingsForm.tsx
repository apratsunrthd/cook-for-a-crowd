"use client";

import { useState } from "react";
import { clearAnthropicApiKeyAction, saveAnthropicApiKeyAction } from "@/lib/actions/settings";

type KeySource = "saved" | "environment" | "none";

function statusText(source: KeySource, masked: string | null): string {
  if (source === "saved") return `AI features are ready, using the key you saved here (ending in ${masked}).`;
  if (source === "environment") {
    return `AI features are ready, using the ANTHROPIC_API_KEY from .env.local (ending in ${masked}).`;
  }
  return "AI features (“Generate with AI”, drink suggestions) aren’t set up yet.";
}

export function SettingsForm({ source, masked }: { source: KeySource; masked: string | null }) {
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Optimistic local copy so the status line updates immediately after
  // saving/clearing, without waiting on the server component to re-render.
  const [currentSource, setCurrentSource] = useState(source);
  const [currentMasked, setCurrentMasked] = useState(masked);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    const result = await saveAnthropicApiKeyAction(key);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCurrentSource("saved");
    setCurrentMasked(result.data.masked);
    setKey("");
    setSuccess(
      result.data.verified
        ? "Saved and confirmed working."
        : "Saved -- couldn’t confirm it works right now, but it’s in place for the next AI request.",
    );
  }

  async function handleClear() {
    setClearing(true);
    setError(null);
    setSuccess(null);
    await clearAnthropicApiKeyAction();
    setClearing(false);
    // Re-derive from what's left -- clearing the saved key falls back to
    // the environment variable if one happens to be set, same as the
    // server-side resolution order.
    setCurrentSource("none");
    setCurrentMasked(null);
    setSuccess("Removed.");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-black/[.03] dark:bg-white/[.06] p-3 space-y-1">
        <h2 className="text-sm font-medium">Anthropic API key</h2>
        <p className="text-sm text-black/70 dark:text-white/70">{statusText(currentSource, currentMasked)}</p>
        <p className="text-xs text-black/50 dark:text-white/50">
          Powers &quot;Generate with AI&quot; for recipes and drink suggestions. Everything else in the app
          (importing recipes, scaling, shopping lists) works fine without one.{" "}
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Get a key from Anthropic &rarr;
          </a>
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="api-key">
            {currentSource === "none" ? "Paste your API key" : "Paste a new API key to replace it"}
          </label>
          <div className="flex gap-2">
            <input
              id="api-key"
              type={showKey ? "text" : "password"}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-ant-..."
              autoComplete="off"
              spellCheck={false}
              className="flex-1 rounded-md border border-black/20 dark:border-white/20 bg-transparent px-3 py-2 font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="rounded-md border border-black/20 dark:border-white/20 px-3 py-2 text-xs"
            >
              {showKey ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {success && <p className="text-sm text-green-700 dark:text-green-400">{success}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving || !key.trim()}
            className="rounded-md bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {currentSource === "saved" && (
            <button
              type="button"
              onClick={handleClear}
              disabled={clearing}
              className="rounded-md border border-black/20 dark:border-white/20 px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {clearing ? "Removing…" : "Remove saved key"}
            </button>
          )}
        </div>
      </form>

      <p className="text-xs text-black/50 dark:text-white/50">
        Stored in this app&apos;s own database, not a file you have to edit. Anyone using this app has the
        same access to it that they have to everything else here -- see the README before sharing this
        app anywhere beyond your own machine.
      </p>
    </div>
  );
}
