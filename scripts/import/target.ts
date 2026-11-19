import crypto from "node:crypto";

export type ImportTarget = { host: string; database: string; schema: string };

export function targetFromUrl(url: string): ImportTarget {
  const parsed = new URL(url);
  return { host: parsed.host, database: parsed.pathname.replace(/^\//, ""), schema: parsed.searchParams.get("schema") ?? "public" };
}

export function targetFingerprint(target: ImportTarget) {
  return crypto.createHash("sha256").update(`${target.host}/${target.database}/${target.schema}`).digest("hex").slice(0, 8);
}

export function assertCommitTarget(target: ImportTarget, confirmation: string | undefined, allowPublic: boolean) {
  if (target.schema === "public" && !allowPublic) throw new Error("Import commit refused: target schema is public; pass --allow-public explicitly.");
  if (!confirmation || confirmation !== targetFingerprint(target)) throw new Error("Import commit refused: IMPORT_TARGET_CONFIRM does not match host/database/schema fingerprint.");
}
