import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { Role } from "@/lib/permissions";

export async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return session;
}

export async function requireRole(roles: Role[]) {
  const session = await requireUser();
  if (!roles.includes(session.user.role as Role)) redirect("/forbidden");
  return session;
}
