import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/rbac'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  // Check admin role
  const { authorized, error } = await requireAdmin()
  if (!authorized) return error
  
  try {
    const { searchParams } = new URL(request.url)
    const midtransStatus = searchParams.get('midtransStatus')
    const tipsioStatus = searchParams.get('tipsioStatus')
    const venueId = searchParams.get('venueId')
    const limit = parseInt(searchParams.get('limit') || '100')
    
    const where: Record<string, unknown> = {}
    
    if (tipsioStatus && tipsioStatus !== 'all') {
      where.status = tipsioStatus
    }
    
    if (venueId) {
      where.venueId = venueId
    }
    
    const tips = await prisma.tip.findMany({
      where,
      include: {
        venue: { select: { name: true } },
        staff: { select: { displayName: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
    
    // Get webhook logs for midtrans status
    const transactions = await Promise.all(
      tips.map(async (tip) => {
        // WebhookLog doesn't have orderId, so we'll use tip status directly
        const webhookLog = await prisma.webhookLog.findFirst({
          where: { 
            payload: {
              path: ['order_id'],
              equals: tip.midtransOrderId
            }
          },
          orderBy: { createdAt: 'desc' }
        })
        
        // Parse midtrans status from webhook payload
        let midtransStatusValue = 'pending'
        if (webhookLog?.payload) {
          try {
            const payload = typeof webhookLog.payload === 'string' 
              ? JSON.parse(webhookLog.payload) 
              : webhookLog.payload
            midtransStatusValue = payload.transaction_status || 'pending'
          } catch {
            // Ignore parse errors
          }
        }
        
        // Filter by midtrans status if specified
        if (midtransStatus && midtransStatus !== 'all' && midtransStatusValue !== midtransStatus) {
          return null
        }
        
        return {
          id: tip.id,
          orderId: tip.midtransOrderId,
          venue: tip.venue.name,
          amount: tip.amount,
          midtransStatus: midtransStatusValue,
          tipsioStatus: tip.status,
          paymentMethod: tip.midtransPaymentType || 'Unknown',
          staffName: tip.staff?.displayName || null,
          createdAt: tip.createdAt.toISOString(),
          errorMessage: tip.status === 'FAILED' ? 'Payment failed' : undefined
        }
      })
    )
    
    // Filter out nulls (from midtrans status filter)
    const filteredTransactions = transactions.filter(t => t !== null)
    
    return NextResponse.json(filteredTransactions)
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}
