import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { db } from "@/lib/db";

const trustedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  process.env.BETTER_AUTH_URL,
  ...((process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "").split(",")),
].map((origin) => origin?.trim()).filter((origin): origin is string => Boolean(origin));

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins,
  emailAndPassword: { enabled: true, disableSignUp: true },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 5,
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
