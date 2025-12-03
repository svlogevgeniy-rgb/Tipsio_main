import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/rbac'
import prisma from '@/lib/prisma'

export async function GET() {
  // Check admin role
  const { authorized, error } = await requireAdmin()
  if (!authorized) return error
  
  try {
    const venues = await prisma.venue.findMany({
      include: {
        _count: {
          select: { staff: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    // Calculate total volume for each venue
    const venuesWithVolume = await Promise.all(
      venues.map(async (venue) => {
        const tips = await prisma.tip.aggregate({
          where: { 
            venueId: venue.id,
            status: 'PAID'
          },
          _sum: { amount: true }
        })
        
        const lastTip = await prisma.tip.findFirst({
          where: { venueId: venue.id },
          orderBy: { createdAt: 'desc' }
        })
        
        // Determine Midtrans status
        let midtransStatus: 'LIVE' | 'TEST' | 'NOT_CONNECTED' = 'NOT_CONNECTED'
        if (venue.midtransConnected && venue.midtransMerchantId) {
          midtransStatus = venue.midtransEnvironment === 'production' ? 'LIVE' : 'TEST'
        }
        
        return {
          id: venue.id,
          name: venue.name,
          area: venue.address || 'Unknown',
          midtransStatus,
          status: venue.status,
          totalVolume: tips._sum.amount || 0,
          lastActivity: lastTip?.createdAt || null,
          staffCount: venue._count.staff
        }
      })
    )
    
    return NextResponse.json(venuesWithVolume)
  } catch (error) {
    console.error('Error fetching venues:', error)
    return NextResponse.json(
      { error: 'Failed to fetch venues' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  // Check admin role
  const { authorized, error } = await requireAdmin()
  if (!authorized) return error
  
  try {
    const { venueId, status } = await request.json()
    
    if (!venueId || !status) {
      return NextResponse.json(
        { error: 'venueId and status are required' },
        { status: 400 }
      )
    }
    
    if (!['ACTIVE', 'BLOCKED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be ACTIVE or BLOCKED' },
        { status: 400 }
      )
    }
    
    const venue = await prisma.venue.update({
      where: { id: venueId },
      data: { status }
    })
    
    return NextResponse.json(venue)
  } catch (error) {
    console.error('Error updating venue:', error)
    return NextResponse.json(
      { error: 'Failed to update venue' },
      { status: 500 }
    )
  }
}
