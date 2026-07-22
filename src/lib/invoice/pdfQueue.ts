import "server-only";
import { generateInvoicePdfResult } from "@/features/invoice/server/generateInvoicePdf";

type QueueJob = {
  html: string;
  resolve: (value: Awaited<ReturnType<typeof generateInvoicePdfResult>>) => void;
  reject: (reason?: unknown) => void;
};

const queue: QueueJob[] = [];
let running = 0;
const MAX_CONCURRENCY = 1;

async function pump(): Promise<void> {
  if (running >= MAX_CONCURRENCY) return;
  const job = queue.shift();
  if (!job) return;
  running += 1;
  try {
    const result = await generateInvoicePdfResult(job.html);
    job.resolve(result);
  } catch (error) {
    job.reject(error);
  } finally {
    running -= 1;
    void pump();
  }
}

/** Serialize PDF jobs so Chromium isn't spawned unbounded. */
export function enqueueInvoicePdf(
  html: string
): Promise<Awaited<ReturnType<typeof generateInvoicePdfResult>>> {
  return new Promise((resolve, reject) => {
    queue.push({ html, resolve, reject });
    void pump();
  });
}
