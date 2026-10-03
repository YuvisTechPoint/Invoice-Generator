import { NextResponse } from "next/server";
import { guardStudioApi } from "@/lib/api/guards";
import {
  getStudioSettings,
  saveStudioSettings,
  type StudioSettings,
} from "@/lib/data/settingsStore";

export async function GET(request: Request) {
  const blocked = await guardStudioApi(request, { rateLimit: "studioApi" });
  if (blocked) return blocked;

  return NextResponse.json({ settings: await getStudioSettings() });
}

export async function PUT(request: Request) {
  const blocked = await guardStudioApi(request, { rateLimit: "studioApi" });
  if (blocked) return blocked;

  try {
    const body = (await request.json()) as {
      invoicePrefix?: string;
      sellerDefaults?: Partial<StudioSettings["sellerDefaults"]>;
    };

    const patch: Partial<StudioSettings> = {};
    if (typeof body.invoicePrefix === "string") {
      patch.invoicePrefix = body.invoicePrefix.trim() || "INV";
    }
    if (body.sellerDefaults && typeof body.sellerDefaults === "object") {
      const current = await getStudioSettings();
      patch.sellerDefaults = {
        ...current.sellerDefaults,
        ...body.sellerDefaults,
      };
    }

    const settings = await saveStudioSettings(patch);
    return NextResponse.json({ settings });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unable to save settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
