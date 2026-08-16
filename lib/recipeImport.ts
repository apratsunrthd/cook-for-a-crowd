import * as cheerio from "cheerio";
import { parseIngredientLines } from "./ingredientParser";
import type { ParsedIngredient } from "./types";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
// A realistic browser UA -- many recipe sites block the default fetch UA.
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export interface ImportedRecipeDraft {
  name: string;
  sourceUrl: string;
  servings: number | null;
  rawYieldText: string | null;
  ingredients: ParsedIngredient[];
  instructions: string | null;
  imageUrl: string | null;
}

export class RecipeImportError extends Error {
  constructor(message: string, public readonly code: "FETCH_FAILED" | "NO_RECIPE_FOUND") {
    super(message);
    this.name = "RecipeImportError";
  }
}

/** Flattens whatever shape a JSON-LD document takes into a list of node objects. */
function collectJsonLdNodes(json: unknown): Record<string, unknown>[] {
  if (Array.isArray(json)) {
    return json.flatMap(collectJsonLdNodes);
  }
  if (json && typeof json === "object") {
    const obj = json as Record<string, unknown>;
    const nested = Array.isArray(obj["@graph"]) ? (obj["@graph"] as unknown[]) : [];
    return [obj, ...nested.flatMap(collectJsonLdNodes)];
  }
  return [];
}

function isRecipeNode(node: Record<string, unknown>): boolean {
  const type = node["@type"];
  if (typeof type === "string") return type === "Recipe";
  if (Array.isArray(type)) return type.includes("Recipe");
  return false;
}

function findRecipeNode(html: string): Record<string, unknown> | null {
  const $ = cheerio.load(html);
  const scripts = $('script[type="application/ld+json"]').toArray();

  for (const script of scripts) {
    const raw = $(script).contents().text();
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      continue; // Malformed JSON-LD on the page -- skip it, don't fail the whole import.
    }
    const recipeNode = collectJsonLdNodes(json).find(isRecipeNode);
    if (recipeNode) return recipeNode;
  }
  return null;
}

/**
 * `recipeYield` shows up in the wild as a bare number, a plain string
 * ("Serves 4-6", "4 servings"), or an array of alternate representations.
 * We only need "how many people does this feed" -- pull the first integer
 * we can find and keep the original text for the user to double-check,
 * since yield is sometimes ambiguous between servings and items produced
 * (e.g. "makes 2 dozen cookies").
 */
function parseServings(recipeYield: unknown): { servings: number | null; rawText: string | null } {
  const text = Array.isArray(recipeYield) ? recipeYield.join(", ") : recipeYield;
  if (text === null || text === undefined) return { servings: null, rawText: null };
  const rawText = String(text);
  const match = rawText.match(/\d+/);
  return { servings: match ? Number(match[0]) : null, rawText };
}

function firstString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  if (value && typeof value === "object" && "url" in value) {
    return firstString((value as { url: unknown }).url);
  }
  return null;
}

function extractIngredientLines(node: Record<string, unknown>): string[] {
  const raw = node["recipeIngredient"] ?? node["ingredients"];
  if (!Array.isArray(raw)) return [];
  return raw.filter((line): line is string => typeof line === "string");
}

function extractInstructions(node: Record<string, unknown>): string | null {
  const raw = node["recipeInstructions"];
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    const steps = raw
      .map((step) => {
        if (typeof step === "string") return step;
        if (step && typeof step === "object" && "text" in step) {
          return String((step as { text: unknown }).text);
        }
        return null;
      })
      .filter((step): step is string => !!step);
    return steps.length > 0 ? steps.join("\n") : null;
  }
  return null;
}

/** Parses a recipe from already-fetched HTML. Exposed separately from `importRecipeFromUrl` so tests can run offline against saved fixtures. */
export function parseRecipeFromHtml(html: string, sourceUrl: string): ImportedRecipeDraft {
  const recipeNode = findRecipeNode(html);
  if (!recipeNode) {
    throw new RecipeImportError(
      "Couldn't find recipe data on that page. You can still add this recipe manually.",
      "NO_RECIPE_FOUND",
    );
  }

  const { servings, rawText } = parseServings(recipeNode["recipeYield"]);
  const name = typeof recipeNode["name"] === "string" ? recipeNode["name"] : "";

  return {
    name,
    sourceUrl,
    servings,
    rawYieldText: rawText,
    ingredients: parseIngredientLines(extractIngredientLines(recipeNode)),
    instructions: extractInstructions(recipeNode),
    imageUrl: firstString(recipeNode["image"]),
  };
}

export async function importRecipeFromUrl(url: string): Promise<ImportedRecipeDraft> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    });
  } catch (err) {
    throw new RecipeImportError(
      `Couldn't reach that URL: ${err instanceof Error ? err.message : String(err)}`,
      "FETCH_FAILED",
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new RecipeImportError(`That page returned an error (HTTP ${response.status}).`, "FETCH_FAILED");
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("html")) {
    throw new RecipeImportError("That URL didn't return a web page.", "FETCH_FAILED");
  }
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_RESPONSE_BYTES) {
    throw new RecipeImportError("That page is too large to import.", "FETCH_FAILED");
  }

  const html = await response.text();
  return parseRecipeFromHtml(html, url);
}
