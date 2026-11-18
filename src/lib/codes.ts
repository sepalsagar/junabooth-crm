import { db } from "@/lib/db";

type CodePrefix = "ENQ" | "JB";

export async function nextCode(prefix: CodePrefix) {
  const counter = await db.counter.upsert({
    where: { name: prefix },
    create: { name: prefix, value: 1 },
    update: { value: { increment: 1 } },
  });

  return `${prefix}-${String(counter.value).padStart(3, "0")}`;
}
