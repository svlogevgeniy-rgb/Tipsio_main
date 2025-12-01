import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

const distributionSchema = z.object({
  distributionMode: z.enum(["PERSONAL", "POOLED"]),
  allowStaffChoice: z.boolean(),
});

// GET /api/venues/[id]/distribution - Get distribution settings
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

    const { id } = await params;

    const venue = await prisma.venue.findUnique({
      where: { id },
      select: {
        id: true,
        distributionMode: true,
        allowStaffChoice: true,
        staff: {
          where: { status: "ACTIVE" },
          select: {
            id: true,
            displayName: true,
            role: true,
            participatesInPool: true,
          },
        },
      },
    });

    if (!venue) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Venue not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      distributionMode: venue.distributionMode,
      allowStaffChoice: venue.allowStaffChoice,
      poolParticipants: venue.staff.filter(s => s.participatesInPool),
    });
  } catch (error) {
    console.error("Get distribution error:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/venues/[id]/distribution - Update distribution settings
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

    const { id } = await params;

    const venue = await prisma.venue.findUnique({
      where: { id },
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

    const body = await request.json();
    const parsed = distributionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const updatedVenue = await prisma.venue.update({
      where: { id },
      data: {
        distributionMode: parsed.data.distributionMode,
        allowStaffChoice: parsed.data.allowStaffChoice,
      },
      select: {
        id: true,
        distributionMode: true,
        allowStaffChoice: true,
      },
    });

    return NextResponse.json({
      message: "Distribution settings updated",
      ...updatedVenue,
    });
  } catch (error) {
    console.error("Update distribution error:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500 }
    );
  }
}
