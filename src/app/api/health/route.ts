import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const checks: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL_SET: !!process.env.DATABASE_URL,
      NEXTAUTH_SECRET_SET: !!process.env.NEXTAUTH_SECRET,
    },
    prisma: {
      connected: false,
      error: null,
    },
    database: {
      userCount: null,
      venueCount: null,
      error: null,
    },
  };

  // Test Prisma connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.prisma.connected = true;
  } catch (error: any) {
    checks.prisma.error = error.message;
  }

  // Test database queries
  try {
    checks.database.userCount = await prisma.user.count();
    checks.database.venueCount = await prisma.venue.count();
  } catch (error: any) {
    checks.database.error = error.message;
  }

  const allHealthy =
    checks.prisma.connected &&
    checks.database.userCount !== null &&
    checks.database.venueCount !== null;

  return NextResponse.json(checks, {
    status: allHealthy ? 200 : 500,
  });
}
