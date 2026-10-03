import "server-only";
import path from "node:path";
import fs from "node:fs";

function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL?.trim());
}

export function getDataDir(): string {
  const configured = process.env.DATA_DIR?.trim();
  let root: string;

  if (configured) {
    root = path.isAbsolute(configured)
      ? configured
      : path.join(process.cwd(), configured);
  } else if (isVercelRuntime()) {
    // Vercel serverless filesystem is read-only except /tmp.
    root = "/tmp/invoice-generator/data";
  } else {
    root = path.join(process.cwd(), "data");
  }

  try {
    if (!fs.existsSync(root)) {
      fs.mkdirSync(root, { recursive: true });
    }
  } catch (error) {
    console.warn(
      "[storage] Unable to create data directory:",
      error instanceof Error ? error.message : error
    );
  }

  return root;
}

export function getInvoicesDir(): string {
  const dir = path.join(getDataDir(), "invoices");
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (error) {
    console.warn(
      "[storage] Unable to create invoices directory:",
      error instanceof Error ? error.message : error
    );
  }
  return dir;
}

export function getSettingsPath(): string {
  return path.join(getDataDir(), "settings.json");
}

export function atomicWriteJson(filePath: string, value: unknown): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(tmp, filePath);
}

export function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
