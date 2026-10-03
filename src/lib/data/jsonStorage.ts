import "server-only";

import fs from "node:fs";
import path from "node:path";
import { atomicWriteJson, getDataDir, readJsonFile } from "@/lib/data/paths";

export const SETTINGS_STORAGE_KEY = "settings.json";
export const INVOICE_STORAGE_PREFIX = "invoices/";

export class StorageUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageUnavailableError";
  }
}

export function invoiceStorageKey(id: string): string {
  const safe = id.replace(/[^\w.-]+/g, "_");
  return `${INVOICE_STORAGE_PREFIX}${safe}.json`;
}

export function useBlobStorage(): boolean {
  if (process.env.STORAGE_DRIVER === "filesystem") return false;
  if (process.env.STORAGE_DRIVER === "blob") {
    return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
  }
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

export function isEphemeralFilesystem(): boolean {
  return Boolean(process.env.VERCEL?.trim()) && !useBlobStorage();
}

function filesystemPath(key: string): string {
  const root = getDataDir();
  const full = path.join(root, key);
  const dir = path.dirname(full);
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (error) {
    throw new StorageUnavailableError(
      `Cannot write to local storage (${dir}). On Vercel, connect Blob storage in your project settings.`
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
  if (useBlobStorage()) {
    return readBlobJson(key, fallback);
  }

  try {
    return readJsonFile<T>(filesystemPath(key), fallback);
  } catch {
    return fallback;
  }
}

export async function writeStorageJson(key: string, value: unknown): Promise<void> {
  if (useBlobStorage()) {
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
        `Unable to save data to Vercel Blob (${message}). Connect Blob storage to this Vercel project and redeploy.`
      );
    }
  }

  try {
    atomicWriteJson(filesystemPath(key), value);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Filesystem write failed";
    throw new StorageUnavailableError(
      `Unable to save data (${message}). On Vercel, connect Blob storage for persistent invoices.`
    );
  }
}

export async function deleteStorageKey(key: string): Promise<boolean> {
  if (useBlobStorage()) {
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
  if (useBlobStorage()) {
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
