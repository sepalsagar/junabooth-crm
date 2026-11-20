import "dotenv/config";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import crypto from "node:crypto";

export async function userResetPassword(email: string, newPassword: string) {
  const user = await db.user.findUnique({ where: { email } });

  if (!user) {
    throw new Error(`User with email ${email} not found.`);
  }

  if (user.disabled) {
    throw new Error(`Cannot reset password for disabled user ${email}.`);
  }

  const context = await auth.$context;
  const passwordHash = await context.password.hash(newPassword);

  await context.internalAdapter.updatePassword(user.id, passwordHash);
  await context.internalAdapter.deleteUserSessions(user.id);

  console.log(`Password reset for: ${email}`);
}