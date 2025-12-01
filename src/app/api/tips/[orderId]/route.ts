import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    const tip = await prisma.tip.findUnique({
      where: { midtransOrderId: orderId },
      include: {
        venue: {
          select: {
            name: true,
          },
        },
        staff: {
          select: {
            displayName: true,
          },
        },
      },
    });

    if (!tip) {
      return NextResponse.json(
        { error: "Tip not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      amount: tip.amount,
      staffName: tip.staff?.displayName || null,
      venueName: tip.venue.name,
      status: tip.status,
      type: tip.type,
    });
  } catch (error) {
    console.error("Error fetching tip:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
