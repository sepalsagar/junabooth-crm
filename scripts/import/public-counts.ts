import "dotenv/config";
import { Client } from "pg";

async function main() {
  const url = process.env.DIRECT_URL;
  if (!url) throw new Error("DIRECT_URL is required.");
  const client = new Client({ connectionString: url });
  await client.connect();
  const { rows } = await client.query<{ tablename: string }>("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
  const counts: Record<string, number> = {};
  for (const { tablename } of rows) {
    const safe = `"${tablename.replaceAll('"', '""')}"`;
    const result = await client.query<{ count: string }>(`SELECT count(*)::text AS count FROM public.${safe}`);
    counts[tablename] = Number(result.rows[0].count);
  }
  await client.end();
  console.log(JSON.stringify(counts));
}
main();
