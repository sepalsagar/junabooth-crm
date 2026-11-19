"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guards";
import { seedAuth } from "@/lib/seed-auth";
import { setPasswordForUser } from "@/lib/seed-partners";

const roleSchema = z.enum(["PARTNER", "SALES", "OPERATOR"]);
const result = (error: string) => ({ ok: false as const, error });

async function audit(actorId: string, action: string, entity: string, entityId: string, metadata?: Record<string, unknown>) {
  await db.auditLog.create({ data: { actorId, action, entity, entityId, metadata: metadata as Prisma.InputJsonValue | undefined } });
}

async function partnerSession() { return requireRole(["PARTNER"]); }

export async function createSettingsUser(input: unknown) {
  const session = await partnerSession();
  const parsed = z.object({ name: z.string().trim().min(2), email: z.string().email(), password: z.string().min(8), role: roleSchema }).safeParse(input);
  if (!parsed.success) return result("Enter a valid name, email, role, and password (minimum 8 characters).");
  const email = parsed.data.email.toLowerCase();
  if (await db.user.findUnique({ where: { email } })) return result("A user with that email already exists.");
  try {
    await seedAuth.api.signUpEmail({ body: { name: parsed.data.name, email, password: parsed.data.password } });
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    await db.user.update({ where: { id: user.id }, data: { role: parsed.data.role } });
    await audit(session.user.id, "CREATE", "User", user.id, { role: parsed.data.role });
    revalidatePath("/settings/users");
    return { ok: true as const };
  } catch { return result("Could not create this user."); }
}

export async function updateSettingsUser(input: unknown) {
  const session = await partnerSession();
  const parsed = z.object({ userId: z.string().min(1), role: roleSchema, disabled: z.boolean() }).safeParse(input);
  if (!parsed.success) return result("Invalid user update.");
  const target = await db.user.findUnique({ where: { id: parsed.data.userId } });
  if (!target) return result("User not found.");
  if (target.id === session.user.id && (parsed.data.disabled || parsed.data.role !== "PARTNER")) return result("You cannot disable or demote yourself.");
  if (target.role === "PARTNER" && !target.disabled && (parsed.data.disabled || parsed.data.role !== "PARTNER")) {
    const activePartners = await db.user.count({ where: { role: "PARTNER", disabled: false } });
    if (activePartners <= 1) return result("The last active partner cannot be disabled or demoted.");
  }
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: target.id }, data: { role: parsed.data.role, disabled: parsed.data.disabled } });
    if (parsed.data.disabled) await tx.session.deleteMany({ where: { userId: target.id } });
    await tx.auditLog.create({ data: { actorId: session.user.id, action: "UPDATE", entity: "User", entityId: target.id, metadata: { role: parsed.data.role, disabled: parsed.data.disabled } } });
  });
  revalidatePath("/settings/users");
  revalidatePath("/leads");
  revalidatePath("/partners");
  return { ok: true as const };
}

export async function resetSettingsUserPassword(input: unknown) {
  const session = await partnerSession();
  const parsed = z.object({ userId: z.string().min(1), password: z.string().min(8) }).safeParse(input);
  if (!parsed.success) return result("Password must be at least 8 characters.");
  const target = await db.user.findUnique({ where: { id: parsed.data.userId }, select: { id: true, disabled: true } });
  if (!target) return result("User not found.");
  await setPasswordForUser(target.id, parsed.data.password);
  await audit(session.user.id, "RESET_PASSWORD", "User", target.id);
  return { ok: true as const };
}

export async function savePackage(input: unknown) {
  const session = await partnerSession();
  const parsed = z.object({ id: z.string().optional(), name: z.string().trim().min(1), hours: z.coerce.number().int().min(0), price: z.coerce.number().int().min(0), active: z.boolean() }).safeParse(input);
  if (!parsed.success) return result("Package name, hours, and whole-rupee price are required.");
  const data = { name: parsed.data.name, hours: parsed.data.hours, price: parsed.data.price, active: parsed.data.active };
  const packageRow = parsed.data.id ? await db.package.update({ where: { id: parsed.data.id }, data }) : await db.package.create({ data });
  await audit(session.user.id, parsed.data.id ? "UPDATE" : "CREATE", "Package", packageRow.id, data);
  revalidatePath("/settings/packages"); revalidatePath("/bookings");
  return { ok: true as const };
}

export async function saveRegion(input: unknown) {
  const session = await partnerSession();
  const parsed = z.object({ id: z.string().optional(), name: z.string().trim().min(2), active: z.boolean() }).safeParse(input);
  if (!parsed.success) return result("Region name is required.");
  const data = { name: parsed.data.name, active: parsed.data.active };
  const region = parsed.data.id ? await db.region.update({ where: { id: parsed.data.id }, data }) : await db.region.create({ data });
  await audit(session.user.id, parsed.data.id ? "UPDATE" : "CREATE", "Region", region.id, data);
  revalidatePath("/settings/regions");
  return { ok: true as const };
}
