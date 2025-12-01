import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { Session } from 'next-auth'

export type Role = 'ADMIN' | 'MANAGER' | 'STAFF'

interface AuthResult {
  authorized: boolean
  session: Session | null
  error?: NextResponse
}

/**
 * Check if the current user has one of the required roles
 * @param allowedRoles - Array of roles that are allowed to access the resource
 * @returns AuthResult with session if authorized, or error response if not
 */
export async function checkRole(allowedRoles: Role[]): Promise<AuthResult> {
  const session = await auth()
  
  if (!session?.user) {
    return {
      authorized: false,
      session: null,
      error: NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }
  }
  
  const userRole = (session.user as { role?: string }).role as Role | undefined
  
  if (!userRole || !allowedRoles.includes(userRole)) {
    return {
      authorized: false,
      session,
      error: NextResponse.json(
        { error: 'Forbidden', message: 'Insufficient permissions' },
        { status: 403 }
      )
    }
  }
  
  return {
    authorized: true,
    session
  }
}

/**
 * Require ADMIN role
 */
export async function requireAdmin(): Promise<AuthResult> {
  return checkRole(['ADMIN'])
}

/**
 * Require MANAGER or ADMIN role
 */
export async function requireManager(): Promise<AuthResult> {
  return checkRole(['MANAGER', 'ADMIN'])
}

/**
 * Require STAFF, MANAGER, or ADMIN role
 */
export async function requireStaff(): Promise<AuthResult> {
  return checkRole(['STAFF', 'MANAGER', 'ADMIN'])
}

/**
 * Get the current user's venue ID from session
 * Only works for MANAGER role
 */
export async function getVenueFromSession(): Promise<string | null> {
  const session = await auth()
  
  if (!session?.user) {
    return null
  }
  
  // For managers, venueId should be stored in the session
  // This would be set during login/registration
  return (session.user as { venueId?: string }).venueId || null
}

/**
 * Get the current user's staff ID from session
 * Only works for STAFF role
 */
export async function getStaffFromSession(): Promise<string | null> {
  const session = await auth()
  
  if (!session?.user) {
    return null
  }
  
  // For staff, staffId should be stored in the session
  return (session.user as { staffId?: string }).staffId || null
}
