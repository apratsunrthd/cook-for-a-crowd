import type Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { createDb } from "../../db";
import { deleteSetting, getSetting, setSetting } from "../settings";

let db: Database.Database;

beforeEach(() => {
  db = createDb(":memory:");
});

describe("settings repo", () => {
  it("returns null for a key that's never been set", () => {
    expect(getSetting(db, "anthropic_api_key")).toBeNull();
  });

  it("round-trips a value", () => {
    setSetting(db, "anthropic_api_key", "sk-ant-abc123");
    expect(getSetting(db, "anthropic_api_key")).toBe("sk-ant-abc123");
  });

  it("overwrites rather than duplicating on a second set", () => {
    setSetting(db, "anthropic_api_key", "first");
    setSetting(db, "anthropic_api_key", "second");
    expect(getSetting(db, "anthropic_api_key")).toBe("second");
  });

  it("removes a value", () => {
    setSetting(db, "anthropic_api_key", "sk-ant-abc123");
    deleteSetting(db, "anthropic_api_key");
    expect(getSetting(db, "anthropic_api_key")).toBeNull();
  });

  it("keeps different keys independent", () => {
    setSetting(db, "a", "1");
    setSetting(db, "b", "2");
    expect(getSetting(db, "a")).toBe("1");
    expect(getSetting(db, "b")).toBe("2");
  });
});
