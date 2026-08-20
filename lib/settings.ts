import type Database from "better-sqlite3";
import { getDb } from "./db";
import { deleteSetting, getSetting, setSetting } from "./repo/settings";

const ANTHROPIC_API_KEY_SETTING = "anthropic_api_key";

// `db` defaults to the real singleton so every existing call site can keep
// calling these with no arguments, while tests can still pass an isolated
// :memory: database explicitly.

/**
 * The Anthropic API key to use for AI features. A key saved through the
 * Settings page takes priority over the ANTHROPIC_API_KEY environment
 * variable -- pasting one in from the UI works immediately, no server
 * restart or file editing needed, which is the whole point of having a
 * Settings page for someone non-technical.
 */
export function getAnthropicApiKey(db: Database.Database = getDb()): string | null {
  const stored = getSetting(db, ANTHROPIC_API_KEY_SETTING);
  if (stored && stored.trim().length > 0) return stored.trim();
  const fromEnv = process.env.ANTHROPIC_API_KEY?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : null;
}

/** Where the currently-effective key came from, for the Settings page to explain e.g. "using the one from .env.local" vs "using the one you saved here" -- without ever exposing the key itself. */
export function anthropicApiKeySource(db: Database.Database = getDb()): "saved" | "environment" | "none" {
  const stored = getSetting(db, ANTHROPIC_API_KEY_SETTING);
  if (stored && stored.trim().length > 0) return "saved";
  if (process.env.ANTHROPIC_API_KEY?.trim()) return "environment";
  return "none";
}

export function saveAnthropicApiKey(key: string, db: Database.Database = getDb()): void {
  const trimmed = key.trim();
  if (!trimmed) throw new Error("API key can't be empty");
  setSetting(db, ANTHROPIC_API_KEY_SETTING, trimmed);
}

export function clearAnthropicApiKey(db: Database.Database = getDb()): void {
  deleteSetting(db, ANTHROPIC_API_KEY_SETTING);
}

/** Last 4 characters only, for confirming "yes, this looks like the right key" on the Settings page without ever re-displaying the full thing. */
export function maskApiKey(key: string): string {
  if (key.length <= 4) return "*".repeat(key.length);
  return `${"*".repeat(Math.min(key.length - 4, 20))}${key.slice(-4)}`;
}
