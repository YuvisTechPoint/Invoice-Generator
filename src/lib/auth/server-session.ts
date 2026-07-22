import "server-only";

import { isStudioAuthenticated } from "@/lib/auth/studioAuth";

/** Studio operator session for invoice access. */
export async function getSessionUser(): Promise<{
  uid: string;
  email: string;
} | null> {
  if (await isStudioAuthenticated()) {
    return {
      uid: "studio-user",
      email: process.env.STUDIO_EMAIL?.trim() || "studio@localhost",
    };
  }
  return null;
}
