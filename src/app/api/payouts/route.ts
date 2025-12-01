import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const PLATFORM_FEE_PERCENT = 5;

// Mock data for development
function generateMockPayouts(start: string, end: string) {
  const staffPayouts = [
    { staffId: "staff-001", displayName: "Agung", role: "Waiter", tipsCount: 24, grossAmount: 850000 },
    { staffId: "staff-002", displayName: "Wayan", role: "Barista", tipsCount: 21, grossAmount: 720000 },
    { staffId: "staff-003", displayName: "Ketut", role: "Bartender", tipsCount: 19, grossAmount: 680000 },
    { staffId: "staff-004", displayName: "Made", role: "Waiter", tipsCount: 15, grossAmount: 520000 },
  ].map((s) => ({
    ...s,
    platformFee: Math.ceil(s.grossAmount * (PLATFORM_FEE_PERCENT / 100)),
    netAmount: s.grossAmount - Math.ceil(s.grossAmount * (PLATFORM_FEE_PERCENT / 100)),
    status: "PENDING" as const,
  }));

  const totalGross = staffPayouts.reduce((sum, s) => sum + s.grossAmount, 0);
  const totalFee = staffPayouts.reduce((sum, s) => sum + s.platformFee, 0);
  const totalNet = staffPayouts.reduce((sum, s) => sum + s.netAmount, 0);

  return {
    id: `payout-${start}-${end}`,
    periodStart: start,
    periodEnd: end,
    totalGross,
    totalFee,
    totalNet,
    status: "PENDING" as const,
    staffPayouts,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!start || !end) {
      return NextResponse.json(
        { error: "start and end dates required" },
        { status: 400 }
      );
    }

    // For development, return mock data
    if (!session) {
      return NextResponse.json(generateMockPayouts(start, end));
    }

    // In production, fetch real data
    try {
      const { prisma } = await import("@/lib/prisma");

      const venue = await prisma.venue.findFirst({
        where: { managerId: session.user.id },
      });

      if (!venue) {
        return NextResponse.json(
          { error: "Venue not found" },
          { status: 404 }
        );
      }

      const startDate = new Date(start);
      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);

      // Get or create payout for this period
      let payout = await prisma.payout.findFirst({
        where: {
          venueId: venue.id,
          periodStart: startDate,
          periodEnd: endDate,
        },
        include: {
          allocations: {
            include: {
              staff: true,
              tip: true,
            },
          },
        },
      });

      if (!payout) {
        // Calculate allocations for this period
        const allocations = await prisma.tipAllocation.findMany({
          where: {
            staff: { venueId: venue.id },
            date: { gte: startDate, lte: endDate },
            payoutId: null,
          },
          include: {
            staff: true,
            tip: true,
          },
        });

        // Group by staff
        const staffTotals: Record<string, {
          staffId: string;
          displayName: string;
          role: string;
          tipsCount: number;
          grossAmount: number;
        }> = {};

        for (const allocation of allocations) {
          if (!staffTotals[allocation.staffId]) {
            staffTotals[allocation.staffId] = {
              staffId: allocation.staffId,
              displayName: allocation.staff.displayName,
              role: allocation.staff.role,
              tipsCount: 0,
              grossAmount: 0,
            };
          }
          staffTotals[allocation.staffId].tipsCount += 1;
          staffTotals[allocation.staffId].grossAmount += allocation.amount;
        }

        const staffPayouts = Object.values(staffTotals).map((s) => ({
          ...s,
          platformFee: Math.ceil(s.grossAmount * (PLATFORM_FEE_PERCENT / 100)),
          netAmount: s.grossAmount - Math.ceil(s.grossAmount * (PLATFORM_FEE_PERCENT / 100)),
          status: "PENDING" as const,
        }));

        const totalGross = staffPayouts.reduce((sum, s) => sum + s.grossAmount, 0);
        const totalFee = staffPayouts.reduce((sum, s) => sum + s.platformFee, 0);
        const totalNet = staffPayouts.reduce((sum, s) => sum + s.netAmount, 0);

        return NextResponse.json({
          id: null,
          periodStart: start,
          periodEnd: end,
          totalGross,
          totalFee,
          totalNet,
          status: "PENDING",
          staffPayouts,
        });
      }

      // Group existing payout allocations by staff
      const staffTotals: Record<string, {
        staffId: string;
        displayName: string;
        role: string;
        tipsCount: number;
        grossAmount: number;
      }> = {};

      for (const allocation of payout.allocations) {
        if (!staffTotals[allocation.staffId]) {
          staffTotals[allocation.staffId] = {
            staffId: allocation.staffId,
            displayName: allocation.staff.displayName,
            role: allocation.staff.role,
            tipsCount: 0,
            grossAmount: 0,
          };
        }
        staffTotals[allocation.staffId].tipsCount += 1;
        staffTotals[allocation.staffId].grossAmount += allocation.amount;
      }

      const staffPayouts = Object.values(staffTotals).map((s) => ({
        ...s,
        platformFee: Math.ceil(s.grossAmount * (PLATFORM_FEE_PERCENT / 100)),
        netAmount: s.grossAmount - Math.ceil(s.grossAmount * (PLATFORM_FEE_PERCENT / 100)),
        status: payout!.status,
      }));

      return NextResponse.json({
        id: payout.id,
        periodStart: payout.periodStart.toISOString(),
        periodEnd: payout.periodEnd.toISOString(),
        totalGross: payout.totalAmount,
        totalFee: Math.ceil(payout.totalAmount * (PLATFORM_FEE_PERCENT / 100)),
        totalNet: payout.totalAmount - Math.ceil(payout.totalAmount * (PLATFORM_FEE_PERCENT / 100)),
        status: payout.status,
        staffPayouts,
      });
    } catch {
      // Database not available, return mock data
      return NextResponse.json(generateMockPayouts(start, end));
    }
  } catch (error) {
    console.error("Payouts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
