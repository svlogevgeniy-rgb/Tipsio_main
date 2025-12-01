import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";

export async function POST(
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
    const { serverKey, clientKey, merchantId } = body;

    if (!serverKey || !clientKey) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Server Key and Client Key are required" },
        { status: 400 }
      );
    }

    // Check venue ownership
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

    // Test Midtrans connection
    const testAuth = Buffer.from(serverKey + ":").toString("base64");
    const testResponse = await fetch(
      "https://api.sandbox.midtrans.com/v2/status",
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${testAuth}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Midtrans returns 401 for invalid keys, 404 for valid keys (no transaction)
    if (testResponse.status === 401) {
      return NextResponse.json(
        { success: false, message: "Invalid Midtrans credentials" },
        { status: 400 }
      );
    }

    // Encrypt and save keys
    const encryptedServerKey = encrypt(serverKey);
    const encryptedClientKey = encrypt(clientKey);

    await prisma.venue.update({
      where: { id: venueId },
      data: {
        midtransServerKey: encryptedServerKey,
        midtransClientKey: encryptedClientKey,
        midtransMerchantId: merchantId || null,
        midtransConnected: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Midtrans connected successfully",
    });
  } catch (error) {
    console.error("Midtrans connection error:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500 }
    );
  }
}
