import "dotenv/config";
import { db } from "@/lib/db";

export async function userDisable(email: string, disabled: boolean = true) {
  const user = await db.user.findUnique({ where: { email } });

  if (!user) {
    throw new Error(`User with email ${email} not found.`);
  }

  await db.user.update({
    where: { id: user.id },
    data: { disabled },
  });

  const status = disabled ? "disabled" : "enabled";
  console.log(`User ${email} has been ${status}.`);
}