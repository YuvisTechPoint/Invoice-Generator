import "server-only";

import { StorageUnavailableError } from "@/lib/data/storageErrors";

let schemaReady = false;

export function getPostgresUrl(): string | null {
  return (
    process.env.POSTGRES_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_PRISMA_URL?.trim() ||
    null
  );
}

async function getSql() {
  const url = getPostgresUrl();
  if (!url) {
    throw new StorageUnavailableError("Postgres URL is not configured.");
  }
  const { neon } = await import("@neondatabase/serverless");
  return neon(url);
}

async function ensureSchema(): Promise<void> {
  if (schemaReady) return;
  const sql = await getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS app_storage (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  schemaReady = true;
}

export async function readPostgresJson<T>(key: string, fallback: T): Promise<T> {
  try {
    await ensureSchema();
    const sql = await getSql();
    const rows = await sql`
      SELECT value FROM app_storage WHERE key = ${key} LIMIT 1
    `;
    const row = rows[0] as { value?: unknown } | undefined;
    if (!row?.value) return fallback;
    return row.value as T;
  } catch (error) {
    console.warn(
      "[storage] Postgres read failed:",
      error instanceof Error ? error.message : error
    );
    return fallback;
  }
}

export async function writePostgresJson(key: string, value: unknown): Promise<void> {
  try {
    await ensureSchema();
    const sql = await getSql();
    await sql`
      INSERT INTO app_storage (key, value, updated_at)
      VALUES (${key}, ${value as never}, NOW())
      ON CONFLICT (key)
      DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Postgres write failed";
    throw new StorageUnavailableError(
      `Unable to save data to Postgres (${message}). Check your database connection and redeploy.`
    );
  }
}

export async function deletePostgresKey(key: string): Promise<boolean> {
  try {
    await ensureSchema();
    const sql = await getSql();
    await sql`DELETE FROM app_storage WHERE key = ${key}`;
    return true;
  } catch {
    return false;
  }
}

export async function listPostgresKeys(prefix: string): Promise<string[]> {
  try {
    await ensureSchema();
    const sql = await getSql();
    const like = `${prefix}%`;
    const rows = await sql`
      SELECT key FROM app_storage WHERE key LIKE ${like} ORDER BY key
    `;
    return rows.map((row) => String((row as { key: string }).key));
  } catch (error) {
    console.warn(
      "[storage] Postgres list failed:",
      error instanceof Error ? error.message : error
    );
    return [];
  }
}
