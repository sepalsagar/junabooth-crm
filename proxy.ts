import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const hasSession = request.cookies.getAll().some(({ name }) => name.includes("better-auth.session_token"));
  if (!hasSession) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|login|forbidden|robots.txt|_next|favicon.ico).*)"],
};
