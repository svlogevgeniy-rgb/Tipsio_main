import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

interface AccessCheckResult {
  authorized: boolean;
  userId?: string;
  venueId?: string;
  staffId?: string;
  role?: string;
  error?: NextResponse;
}

/**
 * Check if user has access to a specific venue
 */
export async function checkVenueAccess(
  venueId: string
): Promise<AccessCheckResult> {
  const session = await auth();

  if (!session?.user) {
    return {
      authorized: false,
      error: NextResponse.json(
        { code: "AUTH_REQUIRED", message: "Authentication required" },
        { status: 401 }
      ),
    };
  }

  const userRole = (session.user as { role?: string }).role;
  const userId = session.user.id;

  // Admin has access to everything
  if (userRole === "ADMIN") {
    return {
      authorized: true,
      userId,
      venueId,
      role: userRole,
    };
  }

  // Manager must own the venue
  if (userRole === "MANAGER") {
    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      select: { managerId: true },
    });

    if (!venue) {
      return {
        authorized: false,
        error: NextResponse.json(
          { code: "NOT_FOUND", message: "Venue not found" },
          { status: 404 }
        ),
      };
    }

    if (venue.managerId !== userId) {
      return {
        authorized: false,
        error: NextResponse.json(
          { code: "FORBIDDEN", message: "Access denied" },
          { status: 403 }
        ),
      };
    }

    return {
      authorized: true,
      userId,
      venueId,
      role: userRole,
    };
  }

  // Staff must belong to the venue
  if (userRole === "STAFF") {
    const staff = await prisma.staff.findFirst({
      where: {
        userId,
        venueId,
      },
    });

    if (!staff) {
      return {
        authorized: false,
        error: NextResponse.json(
          { code: "FORBIDDEN", message: "Access denied" },
          { status: 403 }
        ),
      };
    }

    return {
      authorized: true,
      userId,
      venueId,
      staffId: staff.id,
      role: userRole,
    };
  }

  return {
    authorized: false,
    error: NextResponse.json(
      { code: "FORBIDDEN", message: "Access denied" },
      { status: 403 }
    ),
  };
}

/**
 * Get the venue ID for the current manager
 */
export async function getManagerVenue(): Promise<{
  venueId: string | null;
  userId: string | null;
  error?: NextResponse;
}> {
  const session = await auth();

  if (!session?.user) {
    return {
      venueId: null,
      userId: null,
      error: NextResponse.json(
        { code: "AUTH_REQUIRED", message: "Authentication required" },
        { status: 401 }
      ),
    };
  }

  const userRole = (session.user as { role?: string }).role;
  const userId = session.user.id;

  if (userRole !== "MANAGER" && userRole !== "ADMIN") {
    return {
      venueId: null,
      userId,
      error: NextResponse.json(
        { code: "FORBIDDEN", message: "Manager access required" },
        { status: 403 }
      ),
    };
  }

  const venue = await prisma.venue.findFirst({
    where: { managerId: userId },
    select: { id: true },
  });

  return {
    venueId: venue?.id || null,
    userId,
  };
}

/**
 * Get the staff profile for the current user
 */
export async function getStaffProfile(): Promise<{
  staff: { id: string; venueId: string; displayName: string } | null;
  userId: string | null;
  error?: NextResponse;
}> {
  const session = await auth();

  if (!session?.user) {
    return {
      staff: null,
      userId: null,
      error: NextResponse.json(
        { code: "AUTH_REQUIRED", message: "Authentication required" },
        { status: 401 }
      ),
    };
  }

  const userId = session.user.id;

  const staff = await prisma.staff.findFirst({
    where: { userId },
    select: { id: true, venueId: true, displayName: true },
  });

  if (!staff) {
    return {
      staff: null,
      userId,
      error: NextResponse.json(
        { code: "NOT_FOUND", message: "Staff profile not found" },
        { status: 404 }
      ),
    };
  }

  return {
    staff,
    userId,
  };
}
