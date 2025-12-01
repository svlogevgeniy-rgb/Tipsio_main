"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Loader2, 
  TrendingUp, 
  Users, 
  Banknote,
  AlertCircle,
} from "lucide-react";

interface DashboardData {
  venue: {
    id: string;
    name: string;
  };
  metrics: {
    totalTips: number;
    transactionCount: number;
    averageTip: number;
    activeStaff: number;
  };
  topStaff: Array<{
    id: string;
    displayName: string;
    totalTips: number;
    tipsCount: number;
  }>;
  hasPendingPayouts: boolean;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function VenueDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState("week");
  const t = useTranslations('venue.dashboard');
  const tc = useTranslations('common');

  useEffect(() => {
    fetchDashboard();
  }, [period]);

  async function fetchDashboard() {
    try {
      setLoading(true);
      const res = await fetch(`/api/venues/dashboard?period=${period}`);
      if (res.status === 401) {
        router.push("/venue/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to load dashboard");
      const result = await res.json();
      setData(result);
    } catch {
      setError("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] p-4">
        <Card className="glass p-6 text-center">
          <p className="text-muted-foreground">{error || tc('error')}</p>
          <Button onClick={() => fetchDashboard()} className="mt-4">
            {tc('retry')}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold">{t('title', { venue: data.venue.name })}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Period Selector */}
      <Select value={period} onValueChange={setPeriod}>
        <SelectTrigger className="w-40 bg-white/5 border-white/10">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="week">{t('thisWeek')}</SelectItem>
          <SelectItem value="month">{t('thisMonth')}</SelectItem>
        </SelectContent>
      </Select>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Banknote className="h-4 w-4" />
            <span className="text-xs">{t('totalTips')}</span>
          </div>
          <div className="text-xl font-bold">{formatCurrency(data.metrics.totalTips)}</div>
        </Card>
        
        <Card className="glass p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs">{t('transactions')}</span>
          </div>
          <div className="text-xl font-bold">{data.metrics.transactionCount}</div>
        </Card>
        
        <Card className="glass p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Banknote className="h-4 w-4" />
            <span className="text-xs">{t('averageTip')}</span>
          </div>
          <div className="text-xl font-bold">{formatCurrency(data.metrics.averageTip)}</div>
        </Card>
        
        <Card className="glass p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="h-4 w-4" />
            <span className="text-xs">{t('activeStaff')}</span>
          </div>
          <div className="text-xl font-bold">{data.metrics.activeStaff}</div>
        </Card>
      </div>

      {/* Pending Payouts Alert */}
      {data.hasPendingPayouts && (
        <Card className="glass p-4 border-yellow-500/30 bg-yellow-500/10">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium">{t('pendingPayouts')}</div>
              <div className="text-sm text-muted-foreground">
                {t('pendingPayoutsDesc')}
              </div>
            </div>
            <Button 
              size="sm"
              onClick={() => router.push("/venue/payouts")}
            >
              {t('goToPayouts')}
            </Button>
          </div>
        </Card>
      )}

      {/* Top Staff */}
      <Card className="glass p-4">
        <h2 className="font-semibold mb-4">{t('topPerformers')}</h2>
        {data.topStaff.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No tips yet this period
          </p>
        ) : (
          <div className="space-y-3">
            {data.topStaff.map((staff, index) => (
              <div
                key={staff.id}
                className="flex items-center gap-3 p-3 bg-white/5 rounded-xl"
              >
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{staff.displayName}</div>
                  <div className="text-sm text-muted-foreground">
                    {staff.tipsCount} {t('tips')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-primary">
                    {formatCurrency(staff.totalTips)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
