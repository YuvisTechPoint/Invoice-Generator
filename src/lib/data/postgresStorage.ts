import "server-only";

import { StorageUnavailableError } from "@/lib/data/storageErrors";

let schemaReady = false;
let schemaInitPromise: Promise<void> | null = null;

/** Resolve Neon / Vercel Postgres connection string (never log this value). */
export function getPostgresUrl(): string | null {
  const candidates = [
    process.env.POSTGRES_URL,
    process.env.DATABASE_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.DATABASE_URL_UNPOOLED,
  ];

  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed && /^postgres(ql)?:\/\//i.test(trimmed)) {
      return trimmed;
    }
  }

  return null;
}

export function hasPostgresEnvConfigured(): boolean {
  return Boolean(getPostgresUrl());
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
  if (!schemaInitPromise) {
    schemaInitPromise = (async () => {
      const sql = await getSql();
      await sql`
        CREATE TABLE IF NOT EXISTS app_storage (
          key TEXT PRIMARY KEY,
          value JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      schemaReady = true;
    })().catch((error) => {
      schemaInitPromise = null;
      throw error;
    });
  }
  await schemaInitPromise;
}

/** Lightweight connectivity check for /api/health. */
export async function probePostgresStorage(): Promise<boolean> {
  if (!hasPostgresEnvConfigured()) return false;
  try {
    await ensureSchema();
    const sql = await getSql();
    const rows = await sql`SELECT 1 AS ok`;
    return Boolean(rows[0]);
  } catch (error) {
    console.warn(
      "[storage] Postgres probe failed:",
      error instanceof Error ? error.message : error
    );
    return false;
  }
}

export async function readPostgresJson<T>(key: string, fallback: T): Promise<T> {
  try {
    await ensureSchema();
    const sql = await getSql();
    const rows = await sql`
      SELECT value FROM app_storage WHERE key = ${key} LIMIT 1
    `;
    const row = rows[0] as { value?: unknown } | undefined;
    if (row?.value === undefined || row?.value === null) return fallback;
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
    const payload = JSON.stringify(value);
    await sql`
      INSERT INTO app_storage (key, value, updated_at)
      VALUES (${key}, ${payload}::jsonb, NOW())
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
