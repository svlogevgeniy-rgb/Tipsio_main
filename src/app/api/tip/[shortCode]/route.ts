import { NextRequest, NextResponse } from "next/server";

// Mock data for development/testing when DB is not available
const MOCK_DATA: Record<string, object> = {
  agung001: {
    id: "qr-001",
    type: "PERSONAL",
    label: "Agung's QR",
    venue: {
      id: "venue-001",
      name: "Cafe Organic Canggu",
      logoUrl: null,
      distributionMode: "PERSONAL",
      allowStaffChoice: false,
    },
    staff: {
      id: "staff-001",
      displayName: "Agung",
      avatarUrl: null,
      role: "WAITER",
    },
    availableStaff: [],
  },
  table01: {
    id: "qr-002",
    type: "TABLE",
    label: "Table 1",
    venue: {
      id: "venue-001",
      name: "Cafe Organic Canggu",
      logoUrl: null,
      distributionMode: "POOLED",
      allowStaffChoice: true,
    },
    staff: null,
    availableStaff: [
      { id: "staff-001", displayName: "Agung", avatarUrl: null, role: "WAITER" },
      { id: "staff-002", displayName: "Wayan", avatarUrl: null, role: "BARISTA" },
      { id: "staff-003", displayName: "Ketut", avatarUrl: null, role: "BARTENDER" },
    ],
  },
  organic: {
    id: "qr-003",
    type: "VENUE",
    label: "Main Entrance",
    venue: {
      id: "venue-001",
      name: "Cafe Organic Canggu",
      logoUrl: null,
      distributionMode: "POOLED",
      allowStaffChoice: false,
    },
    staff: null,
    availableStaff: [],
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  try {
    const { shortCode } = await params;

    // Try mock data first (for development without DB)
    if (MOCK_DATA[shortCode]) {
      return NextResponse.json(MOCK_DATA[shortCode]);
    }

    // Try database
    try {
      const { prisma } = await import("@/lib/prisma");
      
      const qrCode = await prisma.qrCode.findUnique({
        where: { shortCode },
        include: {
          venue: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              distributionMode: true,
              allowStaffChoice: true,
              midtransConnected: true,
              status: true,
            },
          },
          staff: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              role: true,
            },
          },
        },
      });

      if (!qrCode) {
        return NextResponse.json(
          { error: "QR code not found" },
          { status: 404 }
        );
      }

      if (qrCode.status !== "ACTIVE") {
        return NextResponse.json(
          { error: "This QR code has been deactivated" },
          { status: 404 }
        );
      }

      if (qrCode.venue.status !== "ACTIVE") {
        return NextResponse.json(
          { error: "This venue is not accepting tips at the moment" },
          { status: 404 }
        );
      }

      if (!qrCode.venue.midtransConnected) {
        return NextResponse.json(
          { error: "Payment is not configured for this venue" },
          { status: 404 }
        );
      }

      let availableStaff: Array<{
        id: string;
        displayName: string;
        avatarUrl: string | null;
        role: string;
      }> = [];

      if (qrCode.type !== "PERSONAL" && qrCode.venue.allowStaffChoice) {
        const staff = await prisma.staff.findMany({
          where: {
            venueId: qrCode.venue.id,
            status: "ACTIVE",
            participatesInPool: true,
          },
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            role: true,
          },
          orderBy: {
            displayName: "asc",
          },
        });
        availableStaff = staff;
      }

      return NextResponse.json({
        id: qrCode.id,
        type: qrCode.type,
        label: qrCode.label,
        venue: {
          id: qrCode.venue.id,
          name: qrCode.venue.name,
          logoUrl: qrCode.venue.logoUrl,
          distributionMode: qrCode.venue.distributionMode,
          allowStaffChoice: qrCode.venue.allowStaffChoice,
        },
        staff: qrCode.staff,
        availableStaff,
      });
    } catch {
      // Database not available, return 404 for unknown codes
      return NextResponse.json(
        { error: "QR code not found" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error fetching QR data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
