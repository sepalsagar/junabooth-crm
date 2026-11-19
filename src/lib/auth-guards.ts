import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Role } from "@/lib/permissions";

export async function requireUser() {
  const session = await getActiveSession(await headers());
  if (!session) redirect("/login");
  return session;
}

export async function getActiveSession(requestHeaders: Headers) {
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) return null;
  const sessionUser = session.user as typeof session.user & { disabled?: boolean };
  if (typeof sessionUser.disabled === "boolean") return sessionUser.disabled ? null : session;
  const user = await db.user?.findUnique?.({ where: { id: session.user.id }, select: { disabled: true } });
  return user?.disabled ? null : session;
}

export async function requireRole(roles: Role[]) {
  const session = await requireUser();
  if (!roles.includes(session.user.role as Role)) redirect("/forbidden");
  return session;
}
