import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export type SqlValue = string | number | bigint | null | Uint8Array;
export type SqlRow = Record<string, unknown>;

let database: DatabaseSync | null = null;
let openedPath: string | null = null;

export function databasePath(): string {
  return process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "wheel.db");
}

export function getDb(): DatabaseSync {
  const file = databasePath();
  if (database && openedPath === file) return database;
  if (database) {
    database.close();
    database = null;
  }
  if (file !== ":memory:") {
    mkdirSync(path.dirname(file), { recursive: true });
  }
  const next = new DatabaseSync(file);
  next.exec("PRAGMA foreign_keys = ON");
  next.exec("PRAGMA busy_timeout = 5000");
  if (file !== ":memory:") next.exec("PRAGMA journal_mode = WAL");
  migrate(next);
  database = next;
  openedPath = file;
  return next;
}

export function closeDb(): void {
  if (database) database.close();
  database = null;
  openedPath = null;
}

function migrate(current: DatabaseSync): void {
  current.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  )`);
  const directory = path.join(process.cwd(), "migrations");
  const files = readdirSync(directory)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const existing = current.prepare("SELECT id FROM schema_migrations WHERE id = ?").get(file);
    if (existing) continue;
    const sql = readFileSync(path.join(directory, file), "utf8");
    current.exec("BEGIN IMMEDIATE");
    try {
      current.exec(sql);
      current
        .prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)")
        .run(file, new Date().toISOString());
      current.exec("COMMIT");
    } catch (error) {
      try {
        current.exec("ROLLBACK");
      } catch {
        // The original migration error is the one worth throwing.
      }
      throw error;
    }
  }
}

export function allRows(sql: string, params: SqlValue[] = []): SqlRow[] {
  const result = getDb().prepare(sql).all(...params);
  return result.map((row) => {
    if (!row || typeof row !== "object") throw new Error("数据库返回了无效记录");
    return row as SqlRow;
  });
}

export function getRow(sql: string, params: SqlValue[] = []): SqlRow | null {
  const row = getDb().prepare(sql).get(...params);
  if (row === undefined) return null;
  if (!row || typeof row !== "object") throw new Error("数据库返回了无效记录");
  return row as SqlRow;
}

export function runSql(sql: string, params: SqlValue[] = []): { changes: number; lastInsertRowid: number } {
  const result = getDb().prepare(sql).run(...params);
  return { changes: Number(result.changes), lastInsertRowid: Number(result.lastInsertRowid) };
}

export function withTransaction<T>(fn: () => T): T {
  const current = getDb();
  current.exec("BEGIN IMMEDIATE");
  try {
    const value = fn();
    current.exec("COMMIT");
    return value;
  } catch (error) {
    try {
      current.exec("ROLLBACK");
    } catch {
      // Preserve the error from the transaction body.
    }
    throw error;
  }
}

export function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  throw new Error("数据库数值无效");
}

export function asString(value: unknown): string {
  if (typeof value === "string") return value;
  throw new Error("数据库文本无效");
}

export function isUniqueConstraint(error: unknown): boolean {
  return error instanceof Error && error.message.includes("UNIQUE constraint failed");
}
