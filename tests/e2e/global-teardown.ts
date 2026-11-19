import "dotenv/config";
import { db } from "@/lib/db";
export default async function globalTeardown() {
  if (process.env.E2E !== "1") throw new Error("Refusing teardown without E2E=1");
  const users = await db.user.findMany({ where: { email: { endsWith: "@e2e.invalid" } }, select: { id: true } });
  for (const user of users) { await db.session.deleteMany({ where: { userId: user.id } }); await db.account.deleteMany({ where: { userId: user.id } }); }
  const result = await db.user.deleteMany({ where: { email: { endsWith: "@e2e.invalid" } } });
  console.log(`E2E cleanup users=${result.count} sessions=removed`);
}
