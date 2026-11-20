import { NextResponse } from "next/server";
import { db } from "@/lib/db";  
export const dynamic = "force-dynamic";

export async function GET() {
  // Health check endpoint
  // Runs real SELECT 1 through Prisma to verify database connectivity
  // Unauthenticated - no auth required
  // Returns {"status":"ok"} if DB is healthy, 503 {"status":"error"} if DB is down
  try {
    // Run SELECT 1 through Prisma to verify database connectivity
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    // Never leak secrets or env values in error messages
    return NextResponse.json(
      { status: "error" },
      { status: 503 }
    );
  }
}