"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AuroraBackground } from "@/components/layout/aurora-background";
import { XCircle, RefreshCw, ArrowLeft } from "lucide-react";

export default function TipErrorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("order_id");

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <AuroraBackground />
      
      <Card className="glass p-8 text-center max-w-sm w-full">
        {/* Error Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-destructive/20 flex items-center justify-center">
          <XCircle className="w-12 h-12 text-destructive" />
        </div>

        {/* Content */}
        <h1 className="text-2xl font-bold mb-2">Payment didn&apos;t go through</h1>
        <p className="text-muted-foreground mb-6">
          Something went wrong and your tip was not completed. This can happen due to network or bank issues.
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600"
            onClick={() => router.back()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try again
          </Button>
          
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to amount selection
          </Button>
        </div>

        {orderId && (
          <p className="text-xs text-muted-foreground mt-6">
            Reference: {orderId}
          </p>
        )}
      </Card>
    </div>
  );
}
