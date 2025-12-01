import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { buildTipUrl, generateQrPng, generateQrSvg } from "@/lib/qr";

// GET /api/qr/[id] - Get QR code details
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
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format"); // png, svg, or null for JSON

    const qrCode = await prisma.qrCode.findUnique({
      where: { id },
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            managerId: true,
          },
        },
        staff: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });

    if (!qrCode) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "QR code not found" },
        { status: 404 }
      );
    }

    // Check access
    if (session.user.role !== "ADMIN" && qrCode.venue.managerId !== session.user.id) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Access denied" },
        { status: 403 }
      );
    }

    const tipUrl = buildTipUrl(qrCode.shortCode);

    // Return image if format specified
    if (format === "png") {
      const pngBuffer = await generateQrPng(tipUrl);
      return new NextResponse(new Uint8Array(pngBuffer), {
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `attachment; filename="${qrCode.label || qrCode.shortCode}.png"`,
        },
      });
    }

    if (format === "svg") {
      const svg = await generateQrSvg(tipUrl);
      return new NextResponse(svg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Content-Disposition": `attachment; filename="${qrCode.label || qrCode.shortCode}.svg"`,
        },
      });
    }

    // Return JSON with QR details
    return NextResponse.json({
      qrCode: {
        ...qrCode,
        tipUrl,
      },
    });
  } catch (error) {
    console.error("Get QR code error:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/qr/[id] - Delete QR code
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

    const qrCode = await prisma.qrCode.findUnique({
      where: { id },
      include: {
        venue: {
          select: { managerId: true },
        },
        _count: {
          select: { tips: true },
        },
      },
    });

    if (!qrCode) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "QR code not found" },
        { status: 404 }
      );
    }

    // Check access
    if (session.user.role !== "ADMIN" && qrCode.venue.managerId !== session.user.id) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Access denied" },
        { status: 403 }
      );
    }

    // Cannot delete personal QR codes (they're tied to staff)
    if (qrCode.type === "PERSONAL") {
      return NextResponse.json(
        { code: "CANNOT_DELETE", message: "Personal QR codes cannot be deleted directly. Deactivate the staff member instead." },
        { status: 400 }
      );
    }

    // If has tips, soft delete (set INACTIVE)
    if (qrCode._count.tips > 0) {
      await prisma.qrCode.update({
        where: { id },
        data: { status: "INACTIVE" },
      });

      return NextResponse.json({
        message: "QR code deactivated (has tip history)",
        softDeleted: true,
      });
    }

    // Hard delete if no tips
    await prisma.qrCode.delete({ where: { id } });

    return NextResponse.json({
      message: "QR code deleted successfully",
      softDeleted: false,
    });
  } catch (error) {
    console.error("Delete QR code error:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500 }
    );
  }
}
