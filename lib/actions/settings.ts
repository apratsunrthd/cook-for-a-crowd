"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { clearAnthropicApiKey, maskApiKey, saveAnthropicApiKey } from "../settings";
import type { ActionResult } from "./recipes";

/**
 * Saves the key, then makes one cheap metadata call (listing models, not a
 * completion -- no generation cost) to confirm it's actually valid before
 * telling the user it worked. Still saves even if the check itself fails
 * to run (e.g. a network hiccup) -- a key that's merely unverified isn't
 * the same as a key that's wrong, and the AI features' own error messages
 * already cover a genuinely bad key at the point of actual use.
 */
export async function saveAnthropicApiKeyAction(key: string): Promise<ActionResult<{ masked: string; verified: boolean }>> {
  const trimmed = key.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter an API key." };
  }

  let verified = false;
  try {
    const client = new Anthropic({ apiKey: trimmed });
    await client.models.list({ limit: 1 });
    verified = true;
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: "That key was rejected by Anthropic -- double-check you copied the whole thing." };
    }
    // Any other error (network, rate limit, etc.) -- not proof the key is
    // bad, so save it and let the user know verification just didn't run.
  }

  saveAnthropicApiKey(trimmed);
  revalidatePath("/settings");
  return { ok: true, data: { masked: maskApiKey(trimmed), verified } };
}

export async function clearAnthropicApiKeyAction(): Promise<void> {
  clearAnthropicApiKey();
  revalidatePath("/settings");
}
