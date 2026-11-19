import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { db } from "@/lib/db";

const configuredBaseURL = process.env.BETTER_AUTH_URL;
const baseURL = configuredBaseURL && !configuredBaseURL.includes("localhost") && !configuredBaseURL.includes("127.0.0.1")
  ? configuredBaseURL
  : process.env.URL ?? process.env.NEXT_PUBLIC_APP_URL ?? configuredBaseURL;
const trustedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  baseURL,
  ...((process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "").split(",")),
].map((origin) => origin?.trim()).filter((origin): origin is string => Boolean(origin));

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  baseURL,
  trustedOrigins,
  emailAndPassword: { enabled: true, disableSignUp: true },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    // ❌ DO NOT enable sessionCache by default.
    // If enabled, Better Auth caches session in-memory per-request,
    // which means role changes and disabled-user status would not
    // take effect until the cache TTL expires (typically 5-15 min).
    // Disabled users and role changes must take effect immediately,
    // so we keep the cache disabled and let each request hit the DB.
    // trade-off: slightly more DB queries per request, but immediate
    // consistency for role/disabled status.
    // cache: {
    //   ttl: 1000 * 60 * 5,
    // },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 5,
    // Use DATABASE-backed rate limiting (not memory) per Better Auth docs.
    // The prisma adapter shares the same connection as the user session,
    // so rate data persists across restarts and is consistent.
    adapter: prismaAdapter(db, { provider: "postgresql" }),
  },
  user: {
    additionalFields: {
      role: {
        type: ["PARTNER", "SALES", "OPERATOR"],
        defaultValue: "PARTNER",
        input: false,
      },
      disabled: {
        type: "boolean",
        defaultValue: false,
        input: false,
      },
    },
  },
});
