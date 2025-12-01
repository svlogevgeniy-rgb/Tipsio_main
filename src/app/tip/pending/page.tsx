"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { AuroraBackground } from "@/components/layout/aurora-background";
import { Loader2 } from "lucide-react";

const POLL_INTERVAL = 3000; // 3 seconds
const MAX_POLLS = 60; // 3 minutes max

export default function TipPendingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("order_id");

  const [pollCount, setPollCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    if (!orderId) return;

    try {
      const res = await fetch(`/api/tips/${orderId}`);
      if (!res.ok) {
        throw new Error("Failed to check status");
      }

      const data = await res.json();

      // Redirect based on status
      if (data.status === "success" || data.status === "PAID") {
        router.replace(`/tip/success?order_id=${orderId}`);
        return;
      }

      if (
        data.status === "failed" ||
        data.status === "FAILED" ||
        data.status === "CANCELED" ||
        data.status === "EXPIRED"
      ) {
        router.replace(`/tip/error?order_id=${orderId}`);
        return;
      }

      // Still pending, continue polling
      setPollCount((prev) => prev + 1);
    } catch (err) {
      console.error("Status check error:", err);
      setError("Unable to check payment status");
    }
  }, [orderId, router]);

  useEffect(() => {
    if (!orderId) {
      setError("No order reference found");
      return;
    }

    // Initial check
    checkStatus();

    // Set up polling
    const interval = setInterval(() => {
      if (pollCount >= MAX_POLLS) {
        clearInterval(interval);
        setError("Payment verification timed out. Please check your payment app.");
        return;
      }
      checkStatus();
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [orderId, pollCount, checkStatus]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <AuroraBackground />

      <Card className="glass p-8 text-center max-w-sm w-full">
        {error ? (
          <>
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <span className="text-4xl">⏳</span>
            </div>
            <h1 className="text-2xl font-bold mb-2">Payment Pending</h1>
            <p className="text-muted-foreground mb-4">{error}</p>
            <p className="text-sm text-muted-foreground">
              If you completed the payment, it may take a few minutes to process.
              You can close this page.
            </p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Processing Payment</h1>
            <p className="text-muted-foreground mb-4">
              Please complete the payment in your payment app. We&apos;re waiting
              for confirmation...
            </p>
            <div className="flex justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </>
        )}

        {orderId && (
          <p className="text-xs text-muted-foreground mt-6">
            Reference: {orderId}
          </p>
        )}
      </Card>
    </div>
  );
}
