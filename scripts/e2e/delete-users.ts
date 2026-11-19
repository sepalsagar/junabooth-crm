import "dotenv/config";
import { db } from "@/lib/db";

export function isE2eEmail(email: string) {
  return email.toLowerCase().endsWith("@e2e.invalid");
}

export async function deleteE2eUsers(client = db, enabled = process.env.E2E === "1") {
  if (!enabled) throw new Error("E2E=1 is required");
  const users = await client.user.findMany({
    where: { email: { endsWith: "@e2e.invalid" } },
    select: { id: true, email: true },
  });
  const removable = users.filter((user) => isE2eEmail(user.email));
  for (const user of removable) {
    await client.session.deleteMany({ where: { userId: user.id } });
    await client.account.deleteMany({ where: { userId: user.id } });
  }
  const deleted = await client.user.deleteMany({
    where: {
      id: { in: removable.map((user) => user.id) },
      email: { endsWith: "@e2e.invalid" },
    },
  });
  return deleted.count;
}

if (process.env.E2E === "1") {
  deleteE2eUsers()
    .then((count) => console.log(`E2E users deleted=${count} sessions=removed`))
    .catch(() => {
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
}
