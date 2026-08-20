import type Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDb } from "../db";
import {
  anthropicApiKeySource,
  clearAnthropicApiKey,
  getAnthropicApiKey,
  maskApiKey,
  saveAnthropicApiKey,
} from "../settings";

let db: Database.Database;
const originalEnvKey = process.env.ANTHROPIC_API_KEY;

beforeEach(() => {
  db = createDb(":memory:");
  vi.unstubAllEnvs();
});

afterEach(() => {
  if (originalEnvKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = originalEnvKey;
});

describe("getAnthropicApiKey / anthropicApiKeySource", () => {
  it("is none when nothing is configured", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(getAnthropicApiKey(db)).toBeNull();
    expect(anthropicApiKeySource(db)).toBe("none");
  });

  it("falls back to the environment variable when nothing is saved", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-from-env");
    expect(getAnthropicApiKey(db)).toBe("sk-ant-from-env");
    expect(anthropicApiKeySource(db)).toBe("environment");
  });

  it("prefers a saved key over the environment variable", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-from-env");
    saveAnthropicApiKey("sk-ant-from-ui", db);
    expect(getAnthropicApiKey(db)).toBe("sk-ant-from-ui");
    expect(anthropicApiKeySource(db)).toBe("saved");
  });

  it("falls back to the environment variable again after the saved key is cleared", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-from-env");
    saveAnthropicApiKey("sk-ant-from-ui", db);
    clearAnthropicApiKey(db);
    expect(getAnthropicApiKey(db)).toBe("sk-ant-from-env");
    expect(anthropicApiKeySource(db)).toBe("environment");
  });

  it("trims whitespace pasted around the key", () => {
    saveAnthropicApiKey("  sk-ant-with-spaces  ", db);
    expect(getAnthropicApiKey(db)).toBe("sk-ant-with-spaces");
  });

  it("throws rather than saving an empty key", () => {
    expect(() => saveAnthropicApiKey("   ", db)).toThrow();
  });
});

describe("maskApiKey", () => {
  it("keeps only the last 4 characters visible", () => {
    const masked = maskApiKey("sk-ant-api03-abcdefgh1234");
    expect(masked.endsWith("1234")).toBe(true);
    expect(masked).not.toContain("sk-ant");
    expect(masked.slice(0, -4)).toMatch(/^\*+$/);
  });

  it("masks a short string entirely rather than revealing all of it", () => {
    expect(maskApiKey("abcd")).toBe("****");
    expect(maskApiKey("ab")).toBe("**");
  });
});
