import "dotenv/config";
import { db } from "../src/lib/db";
import { configuredSeedPartners } from "../src/lib/seed-partners";

const maskEmail = (email: string) => {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 1)}***@${domain}`;
};

async function main() {
  const configured = new Set(configuredSeedPartners().map((partner) => partner.email));
  const unmatched = await db.user.findMany({ where: { email: { notIn: [...configured] } }, select: { id: true, email: true } });
  for (const user of unmatched) {
    await db.user.update({ where: { id: user.id }, data: { disabled: true } });
    await db.session.deleteMany({ where: { userId: user.id } });
  }
  console.log(`DISABLED=${unmatched.length}`);
  for (const user of unmatched) console.log(maskEmail(user.email));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unable to disable unmatched users.");
  process.exitCode = 1;
});
