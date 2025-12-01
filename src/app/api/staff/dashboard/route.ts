import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Mock data for development
const MOCK_DASHBOARD = {
  staff: {
    id: "staff-001",
    displayName: "Agung",
  },
  currentPeriod: {
    amount: 450000,
    tipsCount: 12,
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  today: {
    amount: 75000,
    tipsCount: 3,
  },
  recentPayouts: [
    {
      id: "payout-001",
      periodStart: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      periodEnd: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 1200000,
      status: "PAID" as const,
      paidAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "payout-002",
      periodStart: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
      periodEnd: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 950000,
      status: "PAID" as const,
      paidAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

export async function GET() {
  try {
    const session = await auth();

    // For development, return mock data
    if (!session) {
      // Return mock data for testing without auth
      return NextResponse.json(MOCK_DASHBOARD);
    }

    // In production, fetch real data from database
    try {
      const { prisma } = await import("@/lib/prisma");

      const staff = await prisma.staff.findFirst({
        where: { userId: session.user.id },
        include: {
          allocations: {
            where: {
              payout: null, // Not yet paid out
            },
            orderBy: { date: "desc" },
          },
        },
      });

      if (!staff) {
        return NextResponse.json(
          { error: "Staff profile not found" },
          { status: 404 }
        );
      }

      // Calculate current period totals
      const currentPeriodAmount = staff.allocations.reduce(
        (sum, a) => sum + a.amount,
        0
      );
      const currentPeriodStart = staff.allocations.length > 0
        ? staff.allocations[staff.allocations.length - 1].date
        : new Date();

      // Calculate today's totals
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayAllocations = staff.allocations.filter(
        (a) => new Date(a.date) >= today
      );
      const todayAmount = todayAllocations.reduce((sum, a) => sum + a.amount, 0);

      // Get recent payouts
      const recentPayouts = await prisma.payout.findMany({
        where: {
          allocations: {
            some: { staffId: staff.id },
          },
        },
        orderBy: { periodEnd: "desc" },
        take: 5,
      });

      return NextResponse.json({
        staff: {
          id: staff.id,
          displayName: staff.displayName,
        },
        currentPeriod: {
          amount: currentPeriodAmount,
          tipsCount: staff.allocations.length,
          startDate: currentPeriodStart.toISOString(),
        },
        today: {
          amount: todayAmount,
          tipsCount: todayAllocations.length,
        },
        recentPayouts: recentPayouts.map((p) => ({
          id: p.id,
          periodStart: p.periodStart.toISOString(),
          periodEnd: p.periodEnd.toISOString(),
          amount: p.totalAmount,
          status: p.status,
          paidAt: p.paidAt?.toISOString() || null,
        })),
      });
    } catch {
      // Database not available, return mock data
      return NextResponse.json(MOCK_DASHBOARD);
    }
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
