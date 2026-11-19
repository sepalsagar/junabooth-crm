import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "@/lib/auth";

export const authClient = createAuthClient({
  baseURL: typeof window === "undefined"
    ? undefined
    : `${window.location.protocol}//${window.location.host}`,
  plugins: [inferAdditionalFields<typeof auth>()],
});
