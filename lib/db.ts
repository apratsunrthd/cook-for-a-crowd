import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const MIGRATIONS_DIR = path.join(process.cwd(), "lib", "migrations");
const DEFAULT_DB_PATH = path.join(process.cwd(), "data", "cook-for-a-crowd.sqlite");

function runMigrations(db: Database.Database) {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const applied = new Set(
    db.prepare("SELECT version FROM migrations").all().map((row) => (row as { version: string }).version),
  );

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    db.transaction(() => {
      db.exec(sql);
      db.prepare("INSERT INTO migrations (version) VALUES (?)").run(file);
    })();
  }
}

export function createDb(filePath: string = DEFAULT_DB_PATH): Database.Database {
  if (filePath !== ":memory:") {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }
  const db = new Database(filePath);
  runMigrations(db);
  return db;
}

// Next.js dev-server hot reload re-evaluates this module on every change;
// without stashing the connection on globalThis we'd accumulate open
// better-sqlite3 handles and eventually hit "database is locked".
declare global {
  var __cookForACrowdDb: Database.Database | undefined;
}

export function getDb(): Database.Database {
  if (!globalThis.__cookForACrowdDb) {
    globalThis.__cookForACrowdDb = createDb();
  }
  return globalThis.__cookForACrowdDb;
}
