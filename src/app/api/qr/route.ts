import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateShortCode } from "@/lib/qr";

const createQrSchema = z.object({
  type: z.enum(["TABLE", "VENUE"]),
  label: z.string().min(1, "Label is required"),
  venueId: z.string().min(1, "Venue ID is required"),
});

// GET /api/qr - List QR codes for a venue
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { code: "AUTH_REQUIRED", message: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get("venueId");

    if (!venueId) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "venueId is required" },
        { status: 400 }
      );
    }

    // Check access
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

    const qrCodes = await prisma.qrCode.findMany({
      where: { venueId },
      include: {
        staff: {
          select: {
            id: true,
            displayName: true,
            status: true,
          },
        },
        _count: {
          select: { tips: true },
        },
      },
      orderBy: [{ type: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ qrCodes });
  } catch (error) {
    console.error("List QR codes error:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/qr - Create table/venue QR code
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { code: "AUTH_REQUIRED", message: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = createQrSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { type, label, venueId } = parsed.data;

    // Check access and Midtrans connection
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

    // Block QR creation if Midtrans not connected
    if (!venue.midtransConnected) {
      return NextResponse.json(
        { code: "MIDTRANS_REQUIRED", message: "Please connect Midtrans before creating QR codes" },
        { status: 400 }
      );
    }

    const shortCode = generateShortCode();

    const qrCode = await prisma.qrCode.create({
      data: {
        type,
        label,
        shortCode,
        venueId,
      },
    });

    return NextResponse.json({
      message: "QR code created successfully",
      qrCode,
    }, { status: 201 });
  } catch (error) {
    console.error("Create QR code error:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500 }
    );
  }
}
