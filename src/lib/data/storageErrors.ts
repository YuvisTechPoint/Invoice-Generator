export class StorageUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageUnavailableError";
  }
}

export const STORAGE_SETUP_MESSAGE =
  "Connect persistent storage on Vercel: Storage → Create Blob (or Neon Postgres) → connect to this project → Redeploy.";
