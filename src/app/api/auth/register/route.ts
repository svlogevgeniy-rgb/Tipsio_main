import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  venueName: z.string().min(2, "Venue name must be at least 2 characters"),
  venueType: z.enum(["RESTAURANT", "CAFE", "BAR", "COFFEE_SHOP", "OTHER"]),
});

export async function POST(request: NextRequest) {
  try {
    console.log("[Registration] Starting registration process");
    
    const body = await request.json();
    console.log("[Registration] Request body received:", { 
      email: body.email, 
      venueName: body.venueName,
      venueType: body.venueType 
    });
    
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      console.log("[Registration] Validation failed:", parsed.error.issues);
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password, venueName, venueType } = parsed.data;

    // Check if user already exists
    console.log("[Registration] Checking if user exists:", email);
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log("[Registration] User already exists:", email);
      return NextResponse.json(
        { code: "USER_EXISTS", message: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    console.log("[Registration] Hashing password");
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user and venue in transaction
    console.log("[Registration] Creating user and venue in transaction");
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: "MANAGER",
        },
      });
      console.log("[Registration] User created:", user.id);

      const venue = await tx.venue.create({
        data: {
          name: venueName,
          type: venueType,
          managerId: user.id,
          status: "DRAFT",
        },
      });
      console.log("[Registration] Venue created:", venue.id);

      return { user, venue };
    });

    console.log("[Registration] Registration successful");
    return NextResponse.json(
      {
        message: "Registration successful",
        userId: result.user.id,
        venueId: result.venue.id,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Registration] Error:", error);
    console.error("[Registration] Error stack:", error.stack);
    console.error("[Registration] Error message:", error.message);
    
    return NextResponse.json(
      { 
        code: "INTERNAL_ERROR", 
        message: "Internal server error",
        details: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
