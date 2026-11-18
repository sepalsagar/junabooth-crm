"use server";

import "server-only";

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { requireRole } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { validateReceiptFile } from "./rules";

const BUCKET = "receipts";

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase receipt storage is not configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function createReceiptUpload(expenseId: string, file: { type: string; size: number }) {
  await requireRole(["PARTNER"]);
  const validation = validateReceiptFile(file);
  if (!validation.ok) return { ok: false as const, error: validation.error };
  const expense = await db.expense.findUnique({ where: { id: expenseId }, select: { id: true } });
  if (!expense) return { ok: false as const, error: "Expense not found" };
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `receipts/${expenseId}/${randomUUID()}.${extension}`;
  const { data, error } = await supabaseAdmin().storage
    .from(BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) return { ok: false as const, error: "Could not create receipt upload URL" };
  return { ok: true as const, uploadUrl: data.signedUrl, path };
}

export async function attachReceipt(expenseId: string, path: string) {
  await requireRole(["PARTNER"]);
  if (!path.startsWith(`receipts/${expenseId}/`)) {
    return { ok: false as const, error: "Invalid receipt path" };
  }
  await db.expense.update({ where: { id: expenseId }, data: { receiptPath: path } });
  return { ok: true as const, path };
}

export async function getReceiptUrl(path: string) {
  await requireRole(["PARTNER"]);
  if (!path.startsWith("receipts/")) return null;
  const { data, error } = await supabaseAdmin().storage
    .from(BUCKET)
    .createSignedUrl(path, 60);
  if (error || !data) return null;
  return data.signedUrl;
}
