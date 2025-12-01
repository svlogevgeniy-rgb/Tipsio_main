import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

const PLATFORM_FEE_PERCENT = 5;

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    // Check admin access
    if (!session?.user) {
      return NextResponse.json(
        { code: "AUTH_REQUIRED", message: "Authentication required" },
        { status: 401 }
      );
    }

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "ADMIN") {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!start || !end) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "start and end dates required" },
        { status: 400 }
      );
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    // Get all paid tips in the period grouped by venue
    const tips = await prisma.tip.findMany({
      where: {
        status: "PAID",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        venue: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Group by venue
    const venueStats: Record<
      string,
      {
        venueId: string;
        venueName: string;
        totalTips: number;
        transactionCount: number;
      }
    > = {};

    for (const tip of tips) {
      if (!venueStats[tip.venueId]) {
        venueStats[tip.venueId] = {
          venueId: tip.venueId,
          venueName: tip.venue.name,
          totalTips: 0,
          transactionCount: 0,
        };
      }
      venueStats[tip.venueId].totalTips += tip.netAmount;
      venueStats[tip.venueId].transactionCount += 1;
    }

    const venues = Object.values(venueStats)
      .map((v) => ({
        ...v,
        platformFee: Math.ceil(v.totalTips * (PLATFORM_FEE_PERCENT / 100)),
      }))
      .sort((a, b) => b.totalTips - a.totalTips);

    const totalTips = venues.reduce((sum, v) => sum + v.totalTips, 0);
    const totalPlatformFee = venues.reduce((sum, v) => sum + v.platformFee, 0);
    const totalTransactions = venues.reduce(
      (sum, v) => sum + v.transactionCount,
      0
    );

    return NextResponse.json({
      period: `${start}_${end}`,
      totalTips,
      totalPlatformFee,
      totalTransactions,
      venues,
    });
  } catch (error) {
    console.error("Admin commissions error:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500 }
    );
  }
}
