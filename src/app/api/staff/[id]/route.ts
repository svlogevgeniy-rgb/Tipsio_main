import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

const updateStaffSchema = z.object({
  displayName: z.string().min(1).optional(),
  fullName: z.string().optional(),
  role: z.enum(["WAITER", "BARTENDER", "BARISTA", "HOSTESS", "OTHER"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  participatesInPool: z.boolean().optional(),
  avatarUrl: z.string().url().optional(),
});

// GET /api/staff/[id] - Get staff details
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

    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            managerId: true,
          },
        },
        qrCode: true,
        user: {
          select: {
            email: true,
            phone: true,
          },
        },
        _count: {
          select: {
            tips: true,
            allocations: true,
          },
        },
      },
    });

    if (!staff) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Staff not found" },
        { status: 404 }
      );
    }

    // Check access
    if (session.user.role !== "ADMIN" && staff.venue.managerId !== session.user.id) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Access denied" },
        { status: 403 }
      );
    }

    return NextResponse.json({ staff });
  } catch (error) {
    console.error("Get staff error:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/staff/[id] - Update staff
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

    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        venue: {
          select: { managerId: true },
        },
        qrCode: true,
      },
    });

    if (!staff) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Staff not found" },
        { status: 404 }
      );
    }

    if (session.user.role !== "ADMIN" && staff.venue.managerId !== session.user.id) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Access denied" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = updateStaffSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // If deactivating staff, also deactivate their QR code
    const updateData = { ...parsed.data };
    
    if (parsed.data.status === "INACTIVE" && staff.qrCode) {
      await prisma.qrCode.update({
        where: { id: staff.qrCode.id },
        data: { status: "INACTIVE" },
      });
    } else if (parsed.data.status === "ACTIVE" && staff.qrCode) {
      await prisma.qrCode.update({
        where: { id: staff.qrCode.id },
        data: { status: "ACTIVE" },
      });
    }

    const updatedStaff = await prisma.staff.update({
      where: { id },
      data: updateData,
      include: {
        qrCode: true,
      },
    });

    return NextResponse.json({ staff: updatedStaff });
  } catch (error) {
    console.error("Update staff error:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/staff/[id] - Delete staff (soft delete by setting INACTIVE)
export async function DELETE(
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

    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        venue: {
          select: { managerId: true },
        },
        qrCode: true,
        _count: {
          select: { tips: true },
        },
      },
    });

    if (!staff) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Staff not found" },
        { status: 404 }
      );
    }

    if (session.user.role !== "ADMIN" && staff.venue.managerId !== session.user.id) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Access denied" },
        { status: 403 }
      );
    }

    // If staff has tips, soft delete (set INACTIVE)
    if (staff._count.tips > 0) {
      await prisma.$transaction([
        prisma.staff.update({
          where: { id },
          data: { status: "INACTIVE" },
        }),
        ...(staff.qrCode ? [
          prisma.qrCode.update({
            where: { id: staff.qrCode.id },
            data: { status: "INACTIVE" },
          }),
        ] : []),
      ]);

      return NextResponse.json({
        message: "Staff deactivated (has tip history)",
        softDeleted: true,
      });
    }

    // If no tips, hard delete
    await prisma.$transaction([
      ...(staff.qrCode ? [
        prisma.qrCode.delete({ where: { id: staff.qrCode.id } }),
      ] : []),
      prisma.staff.delete({ where: { id } }),
    ]);

    return NextResponse.json({
      message: "Staff deleted successfully",
      softDeleted: false,
    });
  } catch (error) {
    console.error("Delete staff error:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500 }
    );
  }
}
