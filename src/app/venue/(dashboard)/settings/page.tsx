"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";

type DistributionMode = "PERSONAL" | "POOLED";

export default function VenueSettingsPage() {
  const [venueId, setVenueId] = useState<string | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);

  // Distribution settings
  const [distributionMode, setDistributionMode] =
    useState<DistributionMode>("PERSONAL");
  const [allowStaffChoice, setAllowStaffChoice] = useState(false);

  // Midtrans settings
  const [midtransServerKey, setMidtransServerKey] = useState("");
  const [midtransClientKey, setMidtransClientKey] = useState("");
  const [midtransMerchantId, setMidtransMerchantId] = useState("");
  const [midtransConnected, setMidtransConnected] = useState(false);
  const [showServerKey, setShowServerKey] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const dashRes = await fetch("/api/venues/dashboard?period=week");
        if (!dashRes.ok) throw new Error("Failed to load venue");
        const dashData = await dashRes.json();

        if (dashData.venue?.id) {
          setVenueId(dashData.venue.id);

          // Fetch venue settings
          const settingsRes = await fetch(
            `/api/venues/${dashData.venue.id}/settings`
          );
          if (settingsRes.ok) {
            const settings = await settingsRes.json();
            setDistributionMode(settings.distributionMode || "PERSONAL");
            setAllowStaffChoice(settings.allowStaffChoice || false);
            setMidtransConnected(settings.midtransConnected || false);
            if (settings.midtransMerchantId) {
              setMidtransMerchantId(settings.midtransMerchantId);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setIsPageLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSaveDistribution = async () => {
    if (!venueId) return;
    setIsLoading(true);
    setSaved(false);
    setError(null);

    try {
      const response = await fetch(`/api/venues/${venueId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ distributionMode, allowStaffChoice }),
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError("Failed to save settings");
      }
    } catch {
      setError("Failed to save settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestMidtrans = async () => {
    if (!venueId || !midtransServerKey || !midtransClientKey) {
      setError("Please fill in all Midtrans credentials");
      return;
    }

    setIsTesting(true);
    setError(null);

    try {
      const response = await fetch(`/api/venues/${venueId}/midtrans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverKey: midtransServerKey,
          clientKey: midtransClientKey,
          merchantId: midtransMerchantId,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setMidtransConnected(true);
        setMidtransServerKey("");
        setMidtransClientKey("");
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(result.message || "Failed to connect Midtrans");
      }
    } catch {
      setError("Failed to test Midtrans connection");
    } finally {
      setIsTesting(false);
    }
  };

  if (isPageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-heading font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure your venue and payment settings
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Midtrans Integration */}
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-heading">
                Payment Integration (Midtrans)
              </CardTitle>
              <CardDescription>
                Connect your Midtrans account to receive payments
              </CardDescription>
            </div>
            {midtransConnected && (
              <span className="flex items-center gap-1 text-sm text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                Connected
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {midtransConnected ? (
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
              <p className="text-sm text-green-400">
                ✓ Midtrans is connected
                {midtransMerchantId && ` (Merchant ID: ${midtransMerchantId})`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Your venue can now accept digital tips via GoPay, OVO, cards,
                and QRIS.
              </p>
            </div>
          ) : (
            <>
              <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-sm text-yellow-400 font-medium">
                  ⚠️ Midtrans not connected
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  You need to connect Midtrans to start receiving tips. Get your
                  API keys from{" "}
                  <a
                    href="https://dashboard.midtrans.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Midtrans Dashboard
                  </a>
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="merchantId">Merchant ID</Label>
                  <Input
                    id="merchantId"
                    placeholder="G123456789"
                    value={midtransMerchantId}
                    onChange={(e) => setMidtransMerchantId(e.target.value)}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serverKey">Server Key</Label>
                  <div className="relative">
                    <Input
                      id="serverKey"
                      type={showServerKey ? "text" : "password"}
                      placeholder="SB-Mid-server-..."
                      value={midtransServerKey}
                      onChange={(e) => setMidtransServerKey(e.target.value)}
                      className="h-12 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowServerKey(!showServerKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showServerKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientKey">Client Key</Label>
                  <Input
                    id="clientKey"
                    placeholder="SB-Mid-client-..."
                    value={midtransClientKey}
                    onChange={(e) => setMidtransClientKey(e.target.value)}
                    className="h-12"
                  />
                </div>

                <Button
                  onClick={handleTestMidtrans}
                  disabled={
                    isTesting || !midtransServerKey || !midtransClientKey
                  }
                  className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-600"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Testing connection...
                    </>
                  ) : (
                    "Connect Midtrans"
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>


      {/* Tip Distribution */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="font-heading">Tip Distribution Model</CardTitle>
          <CardDescription>
            Choose how tips from table/venue QR codes are distributed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <button
            type="button"
            onClick={() => setDistributionMode("PERSONAL")}
            className={`w-full p-4 rounded-xl border text-left transition-colors ${
              distributionMode === "PERSONAL"
                ? "border-primary bg-primary/10"
                : "border-white/10 bg-white/5 hover:bg-white/10"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">👤</span>
              <div>
                <div className="font-heading font-semibold">
                  Personal Tipping
                </div>
                <div className="text-sm text-muted-foreground">
                  Each staff member keeps tips from their personal QR codes.
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setDistributionMode("POOLED")}
            className={`w-full p-4 rounded-xl border text-left transition-colors ${
              distributionMode === "POOLED"
                ? "border-primary bg-primary/10"
                : "border-white/10 bg-white/5 hover:bg-white/10"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">👥</span>
              <div>
                <div className="font-heading font-semibold">
                  Pooled Tipping (Shared)
                </div>
                <div className="text-sm text-muted-foreground">
                  All tips go into a shared pool and are split equally.
                </div>
              </div>
            </div>
          </button>
        </CardContent>
      </Card>

      {/* Guest Options */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="font-heading">Guest Options</CardTitle>
          <CardDescription>
            Control what guests can do when tipping via table QR
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="allowStaffChoice" className="font-medium">
                Allow staff selection
              </Label>
              <p className="text-sm text-muted-foreground">
                Let guests choose a specific staff member when using table QR
              </p>
            </div>
            <Switch
              id="allowStaffChoice"
              checked={allowStaffChoice}
              onCheckedChange={setAllowStaffChoice}
            />
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleSaveDistribution}
        disabled={isLoading}
        className="w-full h-14 text-lg font-heading font-bold bg-gradient-to-r from-cyan-500 to-blue-600"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Saving...
          </>
        ) : saved ? (
          "✓ Saved!"
        ) : (
          "Save Settings"
        )}
      </Button>
    </div>
  );
}
