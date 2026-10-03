import "server-only";

type PdfEngine = "playwright" | "puppeteer" | "chromium";

export type GenerateInvoicePdfResult =
  | { ok: true; buffer: Buffer; engine: PdfEngine }
  | { ok: false; reason: string };

const PDF_LAUNCH_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--font-render-hinting=none",
] as const;

function prepareHtmlForPdf(html: string): string {
  // Force a clean white print surface for reliable A4 export.
  const pdfCss = `<style>
html, body { background: #fff !important; }
body { padding: 0 !important; margin: 0 !important; }
.no-print, .invoice__toolbar, .invoice__pdf-fallback { display: none !important; }
.invoice__sheet {
  margin: 0 !important;
  max-width: none !important;
  box-shadow: none !important;
  border: 0 !important;
}
</style>`;
  if (html.includes("</head>")) {
    return html.replace("</head>", `${pdfCss}</head>`);
  }
  return `${pdfCss}${html}`;
}

async function renderWithVercelChromium(html: string): Promise<Buffer | null> {
  if (!process.env.VERCEL) return null;

  try {
    const chromium = await import("@sparticuz/chromium");
    const puppeteer = await import("puppeteer-core");

    const browser = await puppeteer.default.launch({
      args: chromium.default.args,
      defaultViewport: { width: 1280, height: 720 },
      executablePath: await chromium.default.executablePath(),
      headless: true,
    });

    try {
      const page = await browser.newPage();
      await page.setContent(prepareHtmlForPdf(html), {
        waitUntil: "load",
        timeout: 60_000,
      });
      await page.emulateMediaType("print");
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: "8mm", right: "9mm", bottom: "8mm", left: "9mm" },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.warn(
      "[invoice-pdf] Vercel Chromium unavailable:",
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

async function renderWithPuppeteer(html: string): Promise<Buffer | null> {
  if (process.env.VERCEL) return null;

  try {
    const puppeteerMod = (await import("puppeteer")) as unknown as {
      default?: {
        launch: (options: Record<string, unknown>) => Promise<{
          newPage: () => Promise<{
            setContent: (
              content: string,
              options?: Record<string, unknown>
            ) => Promise<void>;
            emulateMediaType: (type: string) => Promise<void>;
            pdf: (options: Record<string, unknown>) => Promise<Uint8Array>;
          }>;
          close: () => Promise<void>;
        }>;
      };
      launch?: (options: Record<string, unknown>) => Promise<{
        newPage: () => Promise<{
          setContent: (
            content: string,
            options?: Record<string, unknown>
          ) => Promise<void>;
          emulateMediaType: (type: string) => Promise<void>;
          pdf: (options: Record<string, unknown>) => Promise<Uint8Array>;
        }>;
        close: () => Promise<void>;
      }>;
    };

    const launch = puppeteerMod.default?.launch ?? puppeteerMod.launch;
    if (!launch) {
      throw new Error("Puppeteer launch() not found");
    }

    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
    const browser = await launch({
      args: [...PDF_LAUNCH_ARGS],
      headless: true,
      ...(executablePath ? { executablePath } : {}),
    });

    try {
      const page = await browser.newPage();
      await page.setContent(prepareHtmlForPdf(html), {
        waitUntil: "load",
        timeout: 60_000,
      });
      await page.emulateMediaType("print");
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: "8mm", right: "9mm", bottom: "8mm", left: "9mm" },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.warn(
      "[invoice-pdf] Puppeteer unavailable:",
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

async function renderWithPlaywright(html: string): Promise<Buffer | null> {
  try {
    const playwright = (await import(
      /* webpackIgnore: true */ "playwright" as string
    )) as {
      chromium: {
        launch: (options?: {
          headless?: boolean;
          args?: string[];
        }) => Promise<{
          newPage: () => Promise<{
            setContent: (
              content: string,
              options?: Record<string, unknown>
            ) => Promise<void>;
            emulateMedia: (options: { media: string }) => Promise<void>;
            pdf: (options?: Record<string, unknown>) => Promise<Uint8Array>;
          }>;
          close: () => Promise<void>;
        }>;
      };
    };

    const browser = await playwright.chromium.launch({
      headless: true,
      args: [...PDF_LAUNCH_ARGS],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(prepareHtmlForPdf(html), {
        waitUntil: "load",
        timeout: 60_000,
      });
      await page.emulateMedia({ media: "print" });
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: "8mm", right: "9mm", bottom: "8mm", left: "9mm" },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.warn(
      "[invoice-pdf] Playwright unavailable:",
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

/** Prefer Vercel Chromium, then local Puppeteer, then Playwright. */
export async function generateInvoicePdfResult(
  html: string
): Promise<GenerateInvoicePdfResult> {
  const vercelPdf = await renderWithVercelChromium(html);
  if (vercelPdf && vercelPdf.length > 0) {
    return { ok: true, buffer: vercelPdf, engine: "chromium" };
  }

  const puppeteerPdf = await renderWithPuppeteer(html);
  if (puppeteerPdf && puppeteerPdf.length > 0) {
    return { ok: true, buffer: puppeteerPdf, engine: "puppeteer" };
  }

  const playwrightPdf = await renderWithPlaywright(html);
  if (playwrightPdf && playwrightPdf.length > 0) {
    return { ok: true, buffer: playwrightPdf, engine: "playwright" };
  }

  return {
    ok: false,
    reason:
      "PDF engine failed. Confirm Puppeteer is installed (`npm install puppeteer`) and retry.",
  };
}

/** @deprecated Prefer generateInvoicePdfResult for diagnostics. */
export async function generateInvoicePdf(html: string): Promise<Buffer | null> {
  const result = await generateInvoicePdfResult(html);
  return result.ok ? result.buffer : null;
}
