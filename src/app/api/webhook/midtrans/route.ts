import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDecryptedCredentials, verifyWebhookSignature } from "@/lib/midtrans";

interface MidtransNotification {
  transaction_time: string;
  transaction_status: string;
  transaction_id: string;
  status_message: string;
  status_code: string;
  signature_key: string;
  payment_type: string;
  order_id: string;
  merchant_id: string;
  gross_amount: string;
  fraud_status?: string;
  currency: string;
}

type TransactionStatus = "PENDING" | "PAID" | "FAILED" | "CANCELED" | "EXPIRED";

function mapMidtransStatus(
  transactionStatus: string,
  fraudStatus?: string
): TransactionStatus {
  switch (transactionStatus) {
    case "capture":
      // For credit card, check fraud status
      return fraudStatus === "accept" ? "PAID" : "PENDING";
    case "settlement":
      return "PAID";
    case "pending":
      return "PENDING";
    case "deny":
    case "cancel":
      return "CANCELED";
    case "expire":
      return "EXPIRED";
    case "failure":
      return "FAILED";
    default:
      return "PENDING";
  }
}

export async function POST(request: NextRequest) {
  let payload: MidtransNotification;
  
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  // Log webhook for debugging
  const webhookLog = await prisma.webhookLog.create({
    data: {
      provider: "midtrans",
      payload: payload as object,
      processed: false,
    },
  });

  try {
    const { order_id, transaction_status, fraud_status, signature_key, status_code, gross_amount, payment_type, transaction_id, transaction_time } = payload;

    // Find the tip by order ID
    const tip = await prisma.tip.findUnique({
      where: { midtransOrderId: order_id },
      include: {
        venue: true,
      },
    });

    if (!tip) {
      await prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: {
          processed: true,
          error: "Tip not found for order_id",
        },
      });
      return NextResponse.json({ status: "ok", message: "Order not found" });
    }

    // Verify signature
    const credentials = getDecryptedCredentials(tip.venue);
    if (credentials) {
      const isValid = verifyWebhookSignature(
        order_id,
        status_code,
        gross_amount,
        credentials.serverKey,
        signature_key
      );

      if (!isValid) {
        await prisma.webhookLog.update({
          where: { id: webhookLog.id },
          data: {
            processed: true,
            error: "Invalid signature",
          },
        });
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 403 }
        );
      }
    }

    // Map status
    const newStatus = mapMidtransStatus(transaction_status, fraud_status);

    // Idempotency check - don't process if already in final state
    const finalStates: TransactionStatus[] = ["PAID", "FAILED", "CANCELED", "EXPIRED"];
    if (finalStates.includes(tip.status as TransactionStatus)) {
      await prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: { processed: true },
      });
      return NextResponse.json({ status: "ok", message: "Already processed" });
    }

    // Update tip status
    await prisma.tip.update({
      where: { id: tip.id },
      data: {
        status: newStatus,
        midtransPaymentType: payment_type,
        midtransTransactionId: transaction_id,
        midtransTransactionTime: transaction_time ? new Date(transaction_time) : null,
      },
    });

    // If payment successful, create tip allocations
    if (newStatus === "PAID") {
      await allocateTip(tip.id);
    }

    // Mark webhook as processed
    await prisma.webhookLog.update({
      where: { id: webhookLog.id },
      data: { processed: true },
    });

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Webhook processing error:", error);
    
    await prisma.webhookLog.update({
      where: { id: webhookLog.id },
      data: {
        processed: true,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    return NextResponse.json(
      { error: "Processing failed" },
      { status: 500 }
    );
  }
}

/**
 * Allocate tip to staff based on venue distribution rules
 */
async function allocateTip(tipId: string) {
  const tip = await prisma.tip.findUnique({
    where: { id: tipId },
    include: {
      venue: true,
      staff: true,
    },
  });

  if (!tip) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (tip.type === "PERSONAL" && tip.staffId) {
    // Personal tip - allocate to specific staff
    await prisma.tipAllocation.create({
      data: {
        tipId: tip.id,
        staffId: tip.staffId,
        amount: tip.netAmount,
        date: today,
      },
    });
  } else {
    // Pool tip - distribute among active staff
    const activeStaff = await prisma.staff.findMany({
      where: {
        venueId: tip.venueId,
        status: "ACTIVE",
        participatesInPool: true,
      },
    });

    if (activeStaff.length === 0) return;

    // Split equally
    const shareAmount = Math.floor(tip.netAmount / activeStaff.length);
    const remainder = tip.netAmount - shareAmount * activeStaff.length;

    // Create allocations
    const allocations = activeStaff.map((staff, index) => ({
      tipId: tip.id,
      staffId: staff.id,
      // First staff gets the remainder (if any)
      amount: index === 0 ? shareAmount + remainder : shareAmount,
      date: today,
    }));

    await prisma.tipAllocation.createMany({
      data: allocations,
    });
  }
}
