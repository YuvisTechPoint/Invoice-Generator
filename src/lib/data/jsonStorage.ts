import "server-only";

import fs from "node:fs";
import path from "node:path";
import { atomicWriteJson, getDataDir, readJsonFile } from "@/lib/data/paths";

export const SETTINGS_STORAGE_KEY = "settings.json";
export const INVOICE_STORAGE_PREFIX = "invoices/";

export function invoiceStorageKey(id: string): string {
  const safe = id.replace(/[^\w.-]+/g, "_");
  return `${INVOICE_STORAGE_PREFIX}${safe}.json`;
}

export function useBlobStorage(): boolean {
  if (process.env.STORAGE_DRIVER === "filesystem") return false;
  if (process.env.STORAGE_DRIVER === "blob") return true;
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

function filesystemPath(key: string): string {
  const root = getDataDir();
  const full = path.join(root, key);
  const dir = path.dirname(full);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return full;
}

export async function readStorageJson<T>(key: string, fallback: T): Promise<T> {
  if (useBlobStorage()) {
    try {
      const { head } = await import("@vercel/blob");
      const meta = await head(key);
      if (!meta?.url) return fallback;
      const response = await fetch(meta.url, { cache: "no-store" });
      if (!response.ok) return fallback;
      return (await response.json()) as T;
    } catch {
      return fallback;
    }
  }

  return readJsonFile<T>(filesystemPath(key), fallback);
}

export async function writeStorageJson(key: string, value: unknown): Promise<void> {
  if (useBlobStorage()) {
    const { put } = await import("@vercel/blob");
    await put(key, JSON.stringify(value, null, 2), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    return;
  }

  atomicWriteJson(filesystemPath(key), value);
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

  const filePath = filesystemPath(key);
  if (!fs.existsSync(filePath)) return false;
  fs.unlinkSync(filePath);
  return true;
}

export async function listStorageKeys(prefix: string): Promise<string[]> {
  if (useBlobStorage()) {
    const { list } = await import("@vercel/blob");
    const keys: string[] = [];
    let cursor: string | undefined;

    do {
      const result = await list({ prefix, cursor, limit: 1000 });
      keys.push(...result.blobs.map((blob) => blob.pathname));
      cursor = result.hasMore ? result.cursor : undefined;
    } while (cursor);

    return keys;
  }

  const dir = filesystemPath(prefix.replace(/\/$/, ""));
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => `${prefix}${file}`);
}
