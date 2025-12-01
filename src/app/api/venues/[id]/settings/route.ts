import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { code: "AUTH_REQUIRED", message: "Authentication required" },
        { status: 401 }
      );
    }

    const { id: venueId } = await params;

    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      select: {
        id: true,
        distributionMode: true,
        allowStaffChoice: true,
        midtransMerchantId: true,
        midtransServerKey: true,
      },
    });

    if (!venue) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Venue not found" },
        { status: 404 }
      );
    }

    if (session.user.role !== "ADMIN" && venue.id !== venueId) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Access denied" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      distributionMode: venue.distributionMode || "PERSONAL",
      allowStaffChoice: venue.allowStaffChoice || false,
      midtransConnected: !!venue.midtransServerKey,
      midtransMerchantId: venue.midtransMerchantId || null,
    });
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { code: "AUTH_REQUIRED", message: "Authentication required" },
        { status: 401 }
      );
    }

    const { id: venueId } = await params;
    const body = await request.json();
    const { distributionMode, allowStaffChoice } = body;

    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
    });

    if (!venue) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Venue not found" },
        { status: 404 }
      );
    }

    if (session.user.role !== "ADMIN" && venue.managerId !== session.user.id) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Access denied" },
        { status: 403 }
      );
    }

    await prisma.venue.update({
      where: { id: venueId },
      data: {
        distributionMode: distributionMode || undefined,
        allowStaffChoice: allowStaffChoice !== undefined ? allowStaffChoice : undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500 }
    );
  }
}
