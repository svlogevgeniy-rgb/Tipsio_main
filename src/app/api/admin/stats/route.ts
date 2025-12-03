import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/rbac'
import prisma from '@/lib/prisma'

export async function GET() {
  // Check admin role
  const { authorized, error } = await requireAdmin()
  if (!authorized) return error
  
  try {
    // Get total venues
    const totalVenues = await prisma.venue.count()
    
    // Get active venues
    const activeVenues = await prisma.venue.count({
      where: { status: 'ACTIVE' }
    })
    
    // Get total transactions (all time)
    const totalTransactions = await prisma.tip.count()
    
    // Get total volume (all time, only PAID)
    const totalVolumeResult = await prisma.tip.aggregate({
      where: { status: 'PAID' },
      _sum: { amount: true }
    })
    const totalVolume = totalVolumeResult._sum.amount || 0
    
    // Get today's transactions
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const todayTransactions = await prisma.tip.count({
      where: {
        createdAt: { gte: today }
      }
    })
    
    // Get failed transactions today
    const failedToday = await prisma.tip.count({
      where: {
        createdAt: { gte: today },
        status: 'FAILED'
      }
    })
    
    return NextResponse.json({
      totalVenues,
      activeVenues,
      totalTransactions,
      totalVolume,
      todayTransactions,
      failedToday
    })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
