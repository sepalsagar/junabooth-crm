import { db } from "@/lib/db";
import { seedAuth } from "@/lib/seed-auth";

type SeedPartner = { name: string; email: string; password: string };

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

export function configuredSeedPartners(): SeedPartner[] {
  return [1, 2, 3, 4].map((index) => ({
    name: required(`SEED_PARTNER_${index}_NAME`),
    email: required(`SEED_PARTNER_${index}_EMAIL`).toLowerCase(),
    password: required(`SEED_PARTNER_${index}_PASSWORD`),
  }));
}

/**
 * Uses Better Auth's configured password hasher and adapter rather than
 * constructing credential hashes or issuing raw SQL in seed/reset scripts.
 */
export async function setPasswordForUser(userId: string, password: string) {
  const context = await seedAuth.$context;
  const passwordHash = await context.password.hash(password);
  await context.internalAdapter.updatePassword(userId, passwordHash);
  await context.internalAdapter.deleteUserSessions(userId);
}

export async function ensureSeedPartners() {
  const users = [];
  for (const partner of configuredSeedPartners()) {
    const existing = await db.user.findUnique({ where: { email: partner.email } });
    if (existing) {
      await setPasswordForUser(existing.id, partner.password);
      users.push(await db.user.update({
        where: { id: existing.id },
        data: { name: partner.name, role: "PARTNER" },
      }));
      continue;
    }

    await seedAuth.api.signUpEmail({ body: partner });
    const created = await db.user.findUniqueOrThrow({ where: { email: partner.email } });
    users.push(await db.user.update({
      where: { id: created.id },
      data: { role: "PARTNER" },
    }));
  }
  return users;
}

export async function resetPartnerPasswordFromEnv() {
  const email = required("PARTNER_RESET_EMAIL").toLowerCase();
  const password = required("PARTNER_RESET_PASSWORD");
  const user = await db.user.findUnique({ where: { email } });
  if (!user) throw new Error("Configured reset user was not found.");
  if (user.role !== "PARTNER") throw new Error("Configured reset user is not a partner.");
  await setPasswordForUser(user.id, password);
}
