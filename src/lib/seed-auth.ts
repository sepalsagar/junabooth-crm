import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { db } from "@/lib/db";

// This instance is imported only by local CLI/seed scripts. The browser route
// always uses src/lib/auth.ts, where public sign-up remains disabled.
export const seedAuth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, disableSignUp: false },
});
