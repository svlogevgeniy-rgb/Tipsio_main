import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Mock data for development
function generateMockHistory(periodFilter: string) {
  const periods = [];
  const now = new Date();
  
  let monthsBack = 3;
  if (periodFilter === "1month") monthsBack = 1;
  if (periodFilter === "6months") monthsBack = 6;

  for (let week = 0; week < monthsBack * 4; week++) {
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() - week * 7);
    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() - 6);

    const tipsByDay = [];
    for (let day = 0; day < 7; day++) {
      const date = new Date(periodStart);
      date.setDate(date.getDate() + day);
      const tipsCount = Math.floor(Math.random() * 5) + 1;
      tipsByDay.push({
        date: date.toISOString(),
        tipsCount,
        amount: tipsCount * (Math.floor(Math.random() * 30) + 20) * 1000,
      });
    }

    const totalAmount = tipsByDay.reduce((sum, d) => sum + d.amount, 0);

    periods.push({
      id: `period-${week}`,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      totalAmount,
      status: week > 0 ? "PAID" : "PENDING",
      paidAt: week > 0 
        ? new Date(periodEnd.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString()
        : null,
      tipsByDay,
    });
  }

  return { periods };
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const periodFilter = searchParams.get("period") || "3months";

    // For development, return mock data
    if (!session) {
      return NextResponse.json(generateMockHistory(periodFilter));
    }

    // In production, fetch real data
    try {
      const { prisma } = await import("@/lib/prisma");

      const staff = await prisma.staff.findFirst({
        where: { userId: session.user.id },
      });

      if (!staff) {
        return NextResponse.json(
          { error: "Staff profile not found" },
          { status: 404 }
        );
      }

      // Calculate date range
      const now = new Date();
      let monthsBack = 3;
      if (periodFilter === "1month") monthsBack = 1;
      if (periodFilter === "6months") monthsBack = 6;
      
      const startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - monthsBack);

      // Get payouts with allocations
      const payouts = await prisma.payout.findMany({
        where: {
          venueId: staff.venueId,
          periodStart: { gte: startDate },
          allocations: {
            some: { staffId: staff.id },
          },
        },
        include: {
          allocations: {
            where: { staffId: staff.id },
            orderBy: { date: "asc" },
          },
        },
        orderBy: { periodEnd: "desc" },
      });

      // Group allocations by day for each payout
      const periods = payouts.map((payout) => {
        const tipsByDay: Record<string, { date: string; tipsCount: number; amount: number }> = {};
        
        for (const allocation of payout.allocations) {
          const dateKey = allocation.date.toISOString().split("T")[0];
          if (!tipsByDay[dateKey]) {
            tipsByDay[dateKey] = {
              date: allocation.date.toISOString(),
              tipsCount: 0,
              amount: 0,
            };
          }
          tipsByDay[dateKey].tipsCount += 1;
          tipsByDay[dateKey].amount += allocation.amount;
        }

        const staffTotal = payout.allocations.reduce((sum, a) => sum + a.amount, 0);

        return {
          id: payout.id,
          periodStart: payout.periodStart.toISOString(),
          periodEnd: payout.periodEnd.toISOString(),
          totalAmount: staffTotal,
          status: payout.status,
          paidAt: payout.paidAt?.toISOString() || null,
          tipsByDay: Object.values(tipsByDay).sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          ),
        };
      });

      return NextResponse.json({ periods });
    } catch {
      // Database not available, return mock data
      return NextResponse.json(generateMockHistory(periodFilter));
    }
  } catch (error) {
    console.error("History error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
