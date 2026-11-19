import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const handler = toNextJsHandler(auth);

async function rejectDisabledSignIn(request: Request) {
  if (request.method !== "POST" || !request.url.endsWith("/sign-in/email")) return null;
  const body = await request.clone().json().catch(() => null) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.toLowerCase() : null;
  if (!email) return null;
  const user = await db.user.findUnique({ where: { email }, select: { disabled: true } });
  if (!user?.disabled) return null;
  return Response.json({ message: "Invalid email or password", code: "INVALID_EMAIL_OR_PASSWORD" }, { status: 401 });
}

export const GET = handler.GET;
export async function POST(request: Request) {
  return (await rejectDisabledSignIn(request)) ?? handler.POST(request);
}
