import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyOtp } from "@/lib/otp";
import { SignJWT } from "jose";

const verifyOtpSchema = z.object({
  code: z.string().length(6, "OTP must be 6 digits"),
  phone: z.string().optional(),
  email: z.string().email().optional(),
}).refine((data) => data.phone || data.email, {
  message: "Phone or email is required",
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = verifyOtpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { code, phone, email } = parsed.data;

    // Verify OTP
    const result = await verifyOtp({ code, phone, email });

    if (!result.valid) {
      const errorCode = result.error?.includes("expired") ? "OTP_EXPIRED" : "OTP_INVALID";
      return NextResponse.json(
        { code: errorCode, message: result.error },
        { status: 400 }
      );
    }

    // Find staff user
    const staff = await prisma.staff.findFirst({
      where: {
        user: {
          OR: [
            ...(phone ? [{ phone }] : []),
            ...(email ? [{ email }] : []),
          ],
        },
      },
      include: { user: true, venue: true },
    });

    if (!staff || !staff.user) {
      return NextResponse.json(
        { code: "STAFF_NOT_FOUND", message: "Staff account not found" },
        { status: 404 }
      );
    }

    // Create JWT token for staff session
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const token = await new SignJWT({
      id: staff.user.id,
      staffId: staff.id,
      venueId: staff.venueId,
      role: "STAFF",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);

    const response = NextResponse.json({
      message: "Login successful",
      staff: {
        id: staff.id,
        displayName: staff.displayName,
        role: staff.role,
        venueId: staff.venueId,
        venueName: staff.venue.name,
      },
    });

    // Set cookie
    response.cookies.set("staff-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to verify OTP" },
      { status: 500 }
    );
  }
}
