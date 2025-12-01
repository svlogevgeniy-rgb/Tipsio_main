"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AuroraBackground } from "@/components/layout/aurora-background";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useTranslations } from "@/i18n/client";
import { CheckCircle2, Loader2 } from "lucide-react";

interface TipDetails {
  amount: number;
  staffName: string | null;
  venueName: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function TipSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const t = useTranslations('guest.success');
  
  const [loading, setLoading] = useState(true);
  const [tipDetails, setTipDetails] = useState<TipDetails | null>(null);

  useEffect(() => {
    if (orderId) {
      fetchTipDetails();
    } else {
      setLoading(false);
    }
  }, [orderId]);

  async function fetchTipDetails() {
    try {
      const res = await fetch(`/api/tips/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setTipDetails(data);
      }
    } catch (error) {
      console.error("Failed to fetch tip details:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AuroraBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <AuroraBackground />
      
      {/* Language Switcher */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>
      
      <Card className="glass p-8 text-center max-w-sm w-full">
        {/* Success Animation */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
          <CheckCircle2 className="w-12 h-12 text-green-500" />
        </div>

        {/* Content */}
        <h1 className="text-2xl font-bold mb-2">{t('title')}</h1>
        <p className="text-muted-foreground mb-6">
          {t('subtitle')}
        </p>

        {/* Details */}
        {tipDetails && (
          <div className="bg-white/5 rounded-xl p-4 mb-6 text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('amount')}</span>
              <span className="font-semibold">{formatCurrency(tipDetails.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('to')}</span>
              <span>{tipDetails.staffName || t('theTeam')}</span>
            </div>
          </div>
        )}

        <p className="text-sm text-muted-foreground mb-6">
          {t('message')}
        </p>

        {/* Close Button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => window.close()}
        >
          {t('close')}
        </Button>
      </Card>
    </div>
  );
}
