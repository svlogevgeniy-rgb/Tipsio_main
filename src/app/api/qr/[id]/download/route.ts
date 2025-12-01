import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import QRCode from "qrcode";

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
    const format = searchParams.get("format") || "png";

    const qrCode = await prisma.qrCode.findUnique({
      where: { id },
      include: {
        venue: {
          select: { managerId: true },
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
    if (
      session.user.role !== "ADMIN" &&
      qrCode.venue.managerId !== session.user.id
    ) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Access denied" },
        { status: 403 }
      );
    }

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3001";
    const tipUrl = `${baseUrl}/tip/${qrCode.shortCode}`;

    if (format === "svg") {
      const svg = await QRCode.toString(tipUrl, {
        type: "svg",
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });

      return new NextResponse(svg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Content-Disposition": `attachment; filename="qr-${qrCode.shortCode}.svg"`,
        },
      });
    }

    // PNG format
    const pngBuffer = await QRCode.toBuffer(tipUrl, {
      type: "png",
      width: 400,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    return new NextResponse(new Uint8Array(pngBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="qr-${qrCode.shortCode}.png"`,
      },
    });
  } catch (error) {
    console.error("QR download error:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500 }
    );
  }
}
