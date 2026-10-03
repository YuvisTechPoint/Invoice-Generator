import "server-only";

import fs from "node:fs";
import path from "node:path";
import { atomicWriteJson, getDataDir, readJsonFile } from "@/lib/data/paths";
import {
  deletePostgresKey,
  hasPostgresEnvConfigured,
  listPostgresKeys,
  probePostgresStorage,
  readPostgresJson,
  writePostgresJson,
} from "@/lib/data/postgresStorage";
import {
  STORAGE_SETUP_MESSAGE,
  StorageUnavailableError,
} from "@/lib/data/storageErrors";

export { StorageUnavailableError } from "@/lib/data/storageErrors";

export const SETTINGS_STORAGE_KEY = "settings.json";
export const INVOICE_STORAGE_PREFIX = "invoices/";

export type StorageDriver = "postgres" | "blob" | "filesystem" | "ephemeral";

export type StorageStatus = {
  driver: StorageDriver;
  persistent: boolean;
  warning?: string;
};

export function invoiceStorageKey(id: string): string {
  const safe = id.replace(/[^\w.-]+/g, "_");
  return `${INVOICE_STORAGE_PREFIX}${safe}.json`;
}

export function hasPostgresCredentials(): boolean {
  return hasPostgresEnvConfigured();
}

export async function verifyPostgresStorage(): Promise<boolean> {
  if (!hasPostgresEnvConfigured()) return false;
  return probePostgresStorage();
}

export function hasBlobCredentials(): boolean {
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) return true;
  if (process.env.BLOB_STORE_ID?.trim() && process.env.VERCEL?.trim()) {
    return true;
  }
  return false;
}

export function getActiveStorageDriver(): StorageDriver {
  const configured = process.env.STORAGE_DRIVER?.trim().toLowerCase();

  if (configured === "filesystem") return "filesystem";
  if (configured === "blob") return hasBlobCredentials() ? "blob" : "ephemeral";
  if (configured === "postgres") {
    return hasPostgresCredentials() ? "postgres" : "ephemeral";
  }

  if (hasPostgresCredentials()) return "postgres";
  if (hasBlobCredentials()) return "blob";
  if (process.env.VERCEL?.trim()) return "ephemeral";
  return "filesystem";
}

export function usePostgresStorage(): boolean {
  return getActiveStorageDriver() === "postgres";
}

export function useBlobStorage(): boolean {
  return getActiveStorageDriver() === "blob";
}

export function hasPersistentStorage(): boolean {
  const driver = getActiveStorageDriver();
  return driver === "postgres" || driver === "blob" || driver === "filesystem";
}

export function isEphemeralFilesystem(): boolean {
  return getActiveStorageDriver() === "ephemeral";
}

export function getStorageStatus(): StorageStatus {
  const driver = getActiveStorageDriver();
  if (driver === "ephemeral") {
    return {
      driver,
      persistent: false,
      warning: STORAGE_SETUP_MESSAGE,
    };
  }
  return { driver, persistent: true };
}

export function requirePersistentStorage(): void {
  if (!hasPersistentStorage()) {
    throw new StorageUnavailableError(STORAGE_SETUP_MESSAGE);
  }
}

function filesystemPath(key: string): string {
  const root = getDataDir();
  const full = path.join(root, key);
  const dir = path.dirname(full);
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch {
    throw new StorageUnavailableError(
      `Cannot write to local storage (${dir}). ${STORAGE_SETUP_MESSAGE}`
    );
  }
  return full;
}

async function readBlobJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const { get } = await import("@vercel/blob");
    const result = await get(key, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return fallback;
    }
    const raw = await new Response(result.stream).text();
    if (!raw.trim()) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(
      "[storage] Blob read failed:",
      error instanceof Error ? error.message : error
    );
    return fallback;
  }
}

export async function readStorageJson<T>(key: string, fallback: T): Promise<T> {
  const driver = getActiveStorageDriver();
  if (driver === "postgres") return readPostgresJson(key, fallback);
  if (driver === "blob") return readBlobJson(key, fallback);

  try {
    return readJsonFile<T>(filesystemPath(key), fallback);
  } catch {
    return fallback;
  }
}

export async function writeStorageJson(key: string, value: unknown): Promise<void> {
  const driver = getActiveStorageDriver();

  if (driver === "postgres") {
    await writePostgresJson(key, value);
    return;
  }

  if (driver === "blob") {
    try {
      const { put } = await import("@vercel/blob");
      await put(key, JSON.stringify(value, null, 2), {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
      });
      return;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Blob write failed";
      throw new StorageUnavailableError(
        `Unable to save data to Vercel Blob (${message}). ${STORAGE_SETUP_MESSAGE}`
      );
    }
  }

  if (driver === "ephemeral") {
    throw new StorageUnavailableError(STORAGE_SETUP_MESSAGE);
  }

  try {
    atomicWriteJson(filesystemPath(key), value);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Filesystem write failed";
    throw new StorageUnavailableError(`Unable to save data (${message}).`);
  }
}

export async function deleteStorageKey(key: string): Promise<boolean> {
  const driver = getActiveStorageDriver();
  if (driver === "postgres") return deletePostgresKey(key);
  if (driver === "blob") {
    try {
      const { del } = await import("@vercel/blob");
      await del(key);
      return true;
    } catch {
      return false;
    }
  }

  try {
    const filePath = filesystemPath(key);
    if (!fs.existsSync(filePath)) return false;
    fs.unlinkSync(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function listStorageKeys(prefix: string): Promise<string[]> {
  const driver = getActiveStorageDriver();
  if (driver === "postgres") return listPostgresKeys(prefix);

  if (driver === "blob") {
    try {
      const { list } = await import("@vercel/blob");
      const keys: string[] = [];
      let cursor: string | undefined;

      do {
        const result = await list({ prefix, cursor, limit: 1000 });
        keys.push(...result.blobs.map((blob) => blob.pathname));
        cursor = result.hasMore ? result.cursor : undefined;
      } while (cursor);

      return keys;
    } catch (error) {
      console.warn(
        "[storage] Blob list failed:",
        error instanceof Error ? error.message : error
      );
      return [];
    }
  }

  try {
    const dir = filesystemPath(prefix.replace(/\/$/, ""));
    if (!fs.existsSync(dir)) return [];

    return fs
      .readdirSync(dir)
      .filter((file) => file.endsWith(".json"))
      .map((file) => `${prefix}${file}`);
  } catch (error) {
    console.warn(
      "[storage] Filesystem list failed:",
      error instanceof Error ? error.message : error
    );
    return [];
  }
}
