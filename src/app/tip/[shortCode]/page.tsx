"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useTranslations } from "@/i18n/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuroraBackground } from "@/components/layout/aurora-background";
import { Loader2, User, Users, ChevronRight } from "lucide-react";

interface Staff {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
}

interface QrData {
  id: string;
  type: "PERSONAL" | "TABLE" | "VENUE";
  label: string | null;
  venue: {
    id: string;
    name: string;
    logoUrl: string | null;
    distributionMode: "PERSONAL" | "POOLED";
    allowStaffChoice: boolean;
  };
  staff: Staff | null;
  availableStaff: Staff[];
}

const AMOUNT_PRESETS = [10000, 20000, 50000, 100000];
const PLATFORM_FEE_PERCENT = 5;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatShortAmount(amount: number): string {
  if (amount >= 1000) {
    return `${amount / 1000}k`;
  }
  return amount.toString();
}

export default function TipPage() {
  const params = useParams();
  const shortCode = params.shortCode as string;
  const t = useTranslations('guest.tip');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrData, setQrData] = useState<QrData | null>(null);

  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [coverFee, setCoverFee] = useState(false);
  const [tipTarget, setTipTarget] = useState<"pool" | "staff">("pool");
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchQrData();
  }, [shortCode]);

  async function fetchQrData() {
    try {
      setLoading(true);
      const res = await fetch(`/api/tip/${shortCode}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("This QR code is not valid or has been deactivated.");
        } else {
          setError("Something went wrong. Please try again.");
        }
        return;
      }
      const data = await res.json();
      setQrData(data);

      // Set default tip target based on QR type
      if (data.type === "PERSONAL" && data.staff) {
        setTipTarget("staff");
        setSelectedStaffId(data.staff.id);
      }
    } catch {
      setError("Failed to load. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  const finalAmount = selectedAmount || (customAmount ? parseInt(customAmount) : 0);
  const platformFee = Math.ceil(finalAmount * (PLATFORM_FEE_PERCENT / 100));
  const totalAmount = coverFee ? finalAmount + platformFee : finalAmount;

  const isPersonalQr = qrData?.type === "PERSONAL";
  const showStaffChoice = !isPersonalQr && qrData?.venue.allowStaffChoice;
  const targetStaff = isPersonalQr
    ? qrData?.staff
    : tipTarget === "staff"
    ? qrData?.availableStaff.find((s) => s.id === selectedStaffId)
    : null;

  async function handleSubmit() {
    if (!finalAmount || finalAmount < 1000) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrCodeId: qrData?.id,
          amount: finalAmount,
          guestPaidFee: coverFee,
          staffId: tipTarget === "staff" ? selectedStaffId : null,
          type: tipTarget === "pool" ? "POOL" : "PERSONAL",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create payment");
      }

      const { snapToken, redirectUrl } = await res.json();

      // Redirect to Midtrans Snap or payment page
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else if (snapToken && window.snap) {
        window.snap.pay(snapToken);
      }
    } catch {
      setError("Failed to process payment. Please try again.");
    } finally {
      setSubmitting(false);
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

  if (error || !qrData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <AuroraBackground />
        <Card className="glass p-6 text-center max-w-sm">
          <h1 className="text-xl font-semibold mb-2">Oops!</h1>
          <p className="text-muted-foreground">{error || "QR code not found"}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AuroraBackground />
      
      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {qrData.venue.logoUrl ? (
            <Image
              src={qrData.venue.logoUrl}
              alt={qrData.venue.name}
              width={40}
              height={40}
              className="rounded-lg"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-bold">
                {qrData.venue.name.charAt(0)}
              </span>
            </div>
          )}
          <span className="font-medium">{qrData.venue.name}</span>
        </div>
        <LanguageSwitcher />
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 pb-40">
        {/* Hero Block */}
        <div className="text-center mb-8">
          {isPersonalQr && qrData.staff ? (
            <>
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                {qrData.staff.avatarUrl ? (
                  <Image
                    src={qrData.staff.avatarUrl}
                    alt={qrData.staff.displayName}
                    width={80}
                    height={80}
                    className="object-cover"
                  />
                ) : (
                  <User className="w-10 h-10 text-primary" />
                )}
              </div>
              <h1 className="text-2xl font-bold mb-2">
                {t('title', { name: qrData.staff.displayName })}
              </h1>
            </>
          ) : (
            <>
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                <Users className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-2xl font-bold mb-2">
                {t('titleTeam', { venue: qrData.venue.name })}
              </h1>
            </>
          )}
          <p className="text-muted-foreground">
            {isPersonalQr ? t('subtitle') : t('subtitleTeam')}
          </p>
        </div>

        {/* Staff Selection (for Table/Venue QR with allowStaffChoice) */}
        {showStaffChoice && (
          <Card className="glass p-4 mb-6">
            <Label className="text-sm font-medium mb-3 block">
              {t('whoServed')}
            </Label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-white/10 cursor-pointer hover:bg-white/5 transition-colors">
                <input
                  type="radio"
                  name="tipTarget"
                  checked={tipTarget === "pool"}
                  onChange={() => {
                    setTipTarget("pool");
                    setSelectedStaffId(null);
                  }}
                  className="w-4 h-4 text-primary"
                />
                <div>
                  <div className="font-medium">{t('wholeTeam')}</div>
                  <div className="text-sm text-muted-foreground">
                    {t('wholeTeamDesc')}
                  </div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-xl border border-white/10 cursor-pointer hover:bg-white/5 transition-colors">
                <input
                  type="radio"
                  name="tipTarget"
                  checked={tipTarget === "staff"}
                  onChange={() => setTipTarget("staff")}
                  className="w-4 h-4 text-primary"
                />
                <div>
                  <div className="font-medium">{t('specificStaff')}</div>
                  <div className="text-sm text-muted-foreground">
                    {t('specificStaffDesc')}
                  </div>
                </div>
              </label>
              {tipTarget === "staff" && (
                <Select
                  value={selectedStaffId || ""}
                  onValueChange={setSelectedStaffId}
                >
                  <SelectTrigger className="w-full bg-white/5 border-white/10">
                    <SelectValue placeholder={t('selectStaff')} />
                  </SelectTrigger>
                  <SelectContent>
                    {qrData.availableStaff.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </Card>
        )}

        {/* Amount Selection */}
        <div className="mb-6">
          <Label className="text-sm font-medium mb-3 block">
            {t('selectAmount')}
          </Label>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {AMOUNT_PRESETS.map((amount) => (
              <button
                key={amount}
                onClick={() => {
                  setSelectedAmount(amount);
                  setCustomAmount("");
                }}
                className={`h-14 rounded-xl border text-lg font-semibold transition-all ${
                  selectedAmount === amount
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/50"
                }`}
              >
                {formatShortAmount(amount)}
              </button>
            ))}
          </div>
          <Input
            type="number"
            placeholder={t('otherAmount')}
            value={customAmount}
            onChange={(e) => {
              setCustomAmount(e.target.value);
              setSelectedAmount(null);
            }}
            className="bg-white/5 border-white/10 h-12"
          />
          <p className="text-xs text-muted-foreground mt-2">
            {t('amountHint')}
          </p>
        </div>

        {/* Cover Fee Option */}
        {finalAmount > 0 && (
          <Card className="glass p-4 mb-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={coverFee}
                onCheckedChange={(checked) => setCoverFee(checked as boolean)}
                className="mt-0.5"
              />
              <div>
                <div className="font-medium">{t('coverFee')}</div>
                <div className="text-sm text-muted-foreground">
                  {t('coverFeeDesc', { 
                    amount: formatCurrency(platformFee), 
                    name: targetStaff?.displayName || 'staff' 
                  })}
                </div>
              </div>
            </label>
          </Card>
        )}

        {/* Summary */}
        {finalAmount > 0 && (
          <Card className="glass p-4 mb-6">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tip amount</span>
                <span>{formatCurrency(finalAmount)}</span>
              </div>
              {coverFee && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform fee</span>
                  <span>{formatCurrency(platformFee)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold pt-2 border-t border-white/10">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(totalAmount)}</span>
              </div>
              {targetStaff && (
                <div className="flex justify-between pt-2 border-t border-white/10">
                  <span className="text-muted-foreground">To</span>
                  <span>{targetStaff.displayName}</span>
                </div>
              )}
              {tipTarget === "pool" && !isPersonalQr && (
                <div className="flex justify-between pt-2 border-t border-white/10">
                  <span className="text-muted-foreground">To</span>
                  <span>The Team</span>
                </div>
              )}
            </div>
          </Card>
        )}
      </main>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 glass-heavy safe-area-bottom">
        <Button
          onClick={handleSubmit}
          disabled={!finalAmount || finalAmount < 1000 || submitting || (tipTarget === "staff" && !selectedStaffId && showStaffChoice)}
          className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
          ) : (
            <>
              {t('sendTip')}
              <ChevronRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
        <p className="text-xs text-center text-muted-foreground mt-2">
          {t('securePayment')}
        </p>
        <p className="text-xs text-center text-muted-foreground/50 mt-1">
          {t('poweredBy')}
        </p>
      </div>

    </div>
  );
}

// Declare snap for TypeScript
declare global {
  interface Window {
    snap?: {
      pay: (token: string) => void;
    };
  }
}
