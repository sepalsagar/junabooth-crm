import { db } from "@/lib/db";
import type { PrismaClient } from "@/generated/prisma/client";

type CodePrefix = "ENQ" | "JB";
type DbClient = Pick<PrismaClient, "counter">;

export async function nextCode(prefix: CodePrefix, client: DbClient = db) {
  const counter = await client.counter.upsert({
    where: { name: prefix },
    create: { name: prefix, value: 1 },
    update: { value: { increment: 1 } },
  });

  return `${prefix}-${String(counter.value).padStart(3, "0")}`;
}
