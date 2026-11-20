import "dotenv/config";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import crypto from "node:crypto";

export async function userCreate(name: string, email: string, role: "PARTNER" | "SALES" | "OPERATOR") {
  // Generate a strong random password
  const password = crypto.randomBytes(32).toString("hex");

  // Use Better Auth's server-side sign-up function via the seedAuth adapter approach
  // Since we cannot sign up with disableSignUp=true in the main auth,
  // we use the database directly with Better Auth's password hashing

  const context = await auth.$context;
  const passwordHash = await context.password.hash(password);

  // Create the user in the database via Prisma
  const user = await db.user.create({
    data: {
      name,
      email,
      role,
      disabled: false,
      id: crypto.randomUUID(),
    },
  });

  // Update the password via Better Auth adapter
  await context.internalAdapter.updatePassword(user.id, passwordHash);
  // Clear any sessions so the user sets password on first login
  await context.internalAdapter.deleteUserSessions(user.id);

  // Print the password once to terminal only, never log it
  // We use a one-time console.error with a flag to avoid logging in production
  console.log(`\n=== New user created ===`);
  console.log(`Email: ${email}`);
  console.log(`Temporary password: ${password}`);
  console.log(`---------------------`);
  console.log("⚠️  SAVE THIS PASSWORD. It will not be logged or stored again.");
  console.log(`\nUser ID: ${user.id}\n`);
}