"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Loader2, 
  AlertTriangle,
  Check,
  Clock
} from "lucide-react";

interface StaffPayout {
  staffId: string;
  displayName: string;
  role: string;
  tipsCount: number;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  status: "PENDING" | "PAID";
}

interface PayoutPeriod {
  id: string;
  periodStart: string;
  periodEnd: string;
  totalGross: number;
  totalFee: number;
  totalNet: number;
  status: "PENDING" | "PAID";
  staffPayouts: StaffPayout[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${startDate.toLocaleDateString("en-US", options)} – ${endDate.toLocaleDateString("en-US", options)}`;
}

// Generate available periods (last 4 weeks)
function getAvailablePeriods() {
  const periods = [];
  const now = new Date();
  
  for (let i = 0; i < 4; i++) {
    const end = new Date(now);
    end.setDate(end.getDate() - i * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    
    periods.push({
      value: `${start.toISOString().split("T")[0]}_${end.toISOString().split("T")[0]}`,
      label: formatDateRange(start.toISOString(), end.toISOString()),
    });
  }
  
  return periods;
}

export default function VenuePayoutsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PayoutPeriod | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(getAvailablePeriods()[0].value);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [markingAllPaid, setMarkingAllPaid] = useState(false);

  const availablePeriods = getAvailablePeriods();

  useEffect(() => {
    fetchPayouts();
  }, [selectedPeriod]);

  async function fetchPayouts() {
    try {
      setLoading(true);
      const [start, end] = selectedPeriod.split("_");
      const res = await fetch(`/api/payouts?start=${start}&end=${end}`);
      if (res.status === 401) {
        router.push("/venue/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to load payouts");
      const data = await res.json();
      setData(data);
    } catch {
      setError("Failed to load payouts");
    } finally {
      setLoading(false);
    }
  }

  async function markAsPaid(staffId?: string) {
    try {
      if (staffId) {
        setMarkingPaid(staffId);
      } else {
        setMarkingAllPaid(true);
      }

      const [start, end] = selectedPeriod.split("_");
      const res = await fetch("/api/payouts/mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodStart: start,
          periodEnd: end,
          staffId,
        }),
      });

      if (!res.ok) throw new Error("Failed to mark as paid");
      
      await fetchPayouts();
    } catch {
      setError("Failed to mark as paid");
    } finally {
      setMarkingPaid(null);
      setMarkingAllPaid(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold">Staff Payouts</h1>
        <p className="text-muted-foreground">
          Review and mark payouts as completed.
        </p>
      </div>

      <div className="space-y-4">
        {/* Period Selector */}
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-full bg-white/5 border-white/10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availablePeriods.map((period) => (
              <SelectItem key={period.value} value={period.value}>
                {period.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {error ? (
          <Card className="glass p-6 text-center">
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => fetchPayouts()} className="mt-4">
              Try again
            </Button>
          </Card>
        ) : data ? (
          <>
            {/* Summary */}
            <Card className="glass p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground">Total tips (gross)</span>
                <span className="text-lg">{formatCurrency(data.totalGross)}</span>
              </div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Platform fee (5%)</span>
                <span className="text-yellow-400">-{formatCurrency(data.totalFee)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <span className="font-medium">Net to staff</span>
                <span className="text-2xl font-bold text-primary">{formatCurrency(data.totalNet)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Platform fee is calculated per period and billed separately.
              </p>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
                {data.status === "PAID" ? (
                  <span className="text-sm text-green-400 flex items-center gap-1">
                    <Check className="h-4 w-4" /> All paid
                  </span>
                ) : (
                  <span className="text-sm text-yellow-400 flex items-center gap-1">
                    <Clock className="h-4 w-4" /> Pending manual payout
                  </span>
                )}
              </div>
            </Card>

            {/* Warning */}
            <Card className="glass p-4 border-yellow-500/30 bg-yellow-500/5">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-500">
                    Tipsio does not transfer money to staff bank accounts.
                  </p>
                  <p className="text-muted-foreground mt-1">
                    Please make cash or bank transfers to your staff first, then mark payouts as &quot;Paid&quot; here so their dashboards are updated.
                  </p>
                </div>
              </div>
            </Card>

            {/* Staff Payouts Table */}
            <Card className="glass overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <div className="grid grid-cols-12 text-sm text-muted-foreground">
                  <div className="col-span-5">Staff</div>
                  <div className="col-span-3 text-right">Amount</div>
                  <div className="col-span-4 text-right">Status</div>
                </div>
              </div>
              
              <div className="divide-y divide-white/5">
                {data.staffPayouts.map((staff) => (
                  <div key={staff.staffId} className="p-4">
                    <div className="grid grid-cols-12 items-center">
                      <div className="col-span-5">
                        <div className="font-medium">{staff.displayName}</div>
                        <div className="text-xs text-muted-foreground">
                          {staff.role} · {staff.tipsCount} tips
                        </div>
                      </div>
                      <div className="col-span-3 text-right">
                        <div className="font-semibold">{formatCurrency(staff.netAmount)}</div>
                      </div>
                      <div className="col-span-4 text-right">
                        {staff.status === "PAID" ? (
                          <span className="text-sm text-green-400">Paid ✅</span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markAsPaid(staff.staffId)}
                            disabled={markingPaid === staff.staffId}
                          >
                            {markingPaid === staff.staffId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Mark paid"
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Bulk Action */}
            {data.status !== "PAID" && (
              <Button
                className="w-full"
                onClick={() => markAsPaid()}
                disabled={markingAllPaid}
              >
                {markingAllPaid ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Mark all as paid
              </Button>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
