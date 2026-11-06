import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export type SqlValue = string | number | bigint | null | Uint8Array;
export type SqlRow = Record<string, unknown>;

type SqliteDatabase = {
  exec(sql: string): void;
  prepare(sql: string): {
    all(...params: SqlValue[]): unknown[];
    get(...params: SqlValue[]): unknown;
    run(...params: SqlValue[]): { changes: number | bigint; lastInsertRowid: number | bigint };
  };
  close(): void;
};

type D1Prepared = {
  bind(...values: SqlValue[]): D1Prepared;
  all(): Promise<{ results?: SqlRow[] }>;
  first<T extends SqlRow>(): Promise<T | null>;
  run(): Promise<{ meta?: { changes?: number; last_row_id?: number } }>;
};

type D1Database = {
  prepare(sql: string): D1Prepared;
};

let database: SqliteDatabase | null = null;
let openedPath: string | null = null;
let queue: Promise<void> = Promise.resolve();
let transactionDepth = 0;

function onWorker(): boolean {
  return typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
}

export function databasePath(): string {
  return process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "wheel.db");
}

async function sqliteDb(): Promise<SqliteDatabase> {
  const file = databasePath();
  if (database && openedPath === file) return database;
  if (database) {
    database.close();
    database = null;
  }
  if (file !== ":memory:") {
    mkdirSync(path.dirname(file), { recursive: true });
  }
  const specifier = "node:" + "sqlite";
  const imported = (await import(specifier)) as { DatabaseSync: new (path: string) => SqliteDatabase };
  const next = new imported.DatabaseSync(file);
  next.exec("PRAGMA foreign_keys = ON");
  next.exec("PRAGMA busy_timeout = 5000");
  if (file !== ":memory:") next.exec("PRAGMA journal_mode = WAL");
  migrate(next);
  database = next;
  openedPath = file;
  return next;
}

async function cloudflareDb(): Promise<D1Database | null> {
  if (!onWorker()) return null;
  const imported = (await import("@opennextjs/cloudflare")) as {
    getCloudflareContext: () => { env: { DB?: D1Database } };
  };
  return imported.getCloudflareContext().env.DB ?? null;
}

export function closeDb(): void {
  if (database) database.close();
  database = null;
  openedPath = null;
}

function migrate(current: SqliteDatabase): void {
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

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  if (transactionDepth > 0) return fn();
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function asRow(row: unknown): SqlRow {
  if (!row || typeof row !== "object") throw new Error("数据库返回了无效记录");
  return row as SqlRow;
}

export async function allRows(sql: string, params: SqlValue[] = []): Promise<SqlRow[]> {
  const remote = await cloudflareDb();
  if (remote) {
    const statement = params.length > 0 ? remote.prepare(sql).bind(...params) : remote.prepare(sql);
    const result = await statement.all();
    return (result.results ?? []).map(asRow);
  }
  return enqueue(async () => {
    const result = (await sqliteDb()).prepare(sql).all(...params);
    return result.map(asRow);
  });
}

export async function getRow(sql: string, params: SqlValue[] = []): Promise<SqlRow | null> {
  const remote = await cloudflareDb();
  if (remote) {
    const statement = params.length > 0 ? remote.prepare(sql).bind(...params) : remote.prepare(sql);
    const row = await statement.first<SqlRow>();
    return row ? asRow(row) : null;
  }
  return enqueue(async () => {
    const row = (await sqliteDb()).prepare(sql).get(...params);
    if (row === undefined) return null;
    return asRow(row);
  });
}

export async function runSql(
  sql: string,
  params: SqlValue[] = [],
): Promise<{ changes: number; lastInsertRowid: number }> {
  const remote = await cloudflareDb();
  if (remote) {
    const statement = params.length > 0 ? remote.prepare(sql).bind(...params) : remote.prepare(sql);
    const result = await statement.run();
    return {
      changes: Number(result.meta?.changes ?? 0),
      lastInsertRowid: Number(result.meta?.last_row_id ?? 0),
    };
  }
  return enqueue(async () => {
    const result = (await sqliteDb()).prepare(sql).run(...params);
    return { changes: Number(result.changes), lastInsertRowid: Number(result.lastInsertRowid) };
  });
}

export async function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  const remote = await cloudflareDb();
  if (remote) return fn();
  return enqueue(async () => {
    const current = await sqliteDb();
    current.exec("BEGIN IMMEDIATE");
    transactionDepth += 1;
    try {
      const value = await fn();
      current.exec("COMMIT");
      return value;
    } catch (error) {
      try {
        current.exec("ROLLBACK");
      } catch {
        // Preserve the error from the transaction body.
      }
      throw error;
    } finally {
      transactionDepth -= 1;
    }
  });
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
