"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const steps = ["Profile", "Payments", "Distribution", "Done"];

const midtransSchema = z.object({
  merchantId: z.string().min(1, "Merchant ID is required"),
  serverKey: z.string().min(1, "Server Key is required"),
  clientKey: z.string().min(1, "Client Key is required"),
});

type MidtransForm = z.infer<typeof midtransSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [distributionMode, setDistributionMode] = useState<"PERSONAL" | "POOLED">("PERSONAL");

  const midtransForm = useForm<MidtransForm>({
    resolver: zodResolver(midtransSchema),
  });

  const handleMidtransSubmit = async (data: MidtransForm) => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Get venue ID from session
      const response = await fetch("/api/venues/current/midtrans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, environment: "sandbox" }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Failed to connect Midtrans");
        return;
      }

      setCurrentStep(2);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDistributionSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Update venue distribution mode
      setCurrentStep(3);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Your venue profile has been created. Let&apos;s set up payments next.
            </p>
            <Button
              onClick={() => setCurrentStep(1)}
              className="w-full h-14 text-lg font-heading font-bold bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              Continue to Payments
            </Button>
          </div>
        );

      case 1:
        return (
          <form onSubmit={midtransForm.handleSubmit(handleMidtransSubmit)} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tipsio doesn&apos;t hold your money. All tips go directly to your Midtrans merchant account.
            </p>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="merchantId">Merchant ID</Label>
              <Input
                id="merchantId"
                placeholder="G123456789"
                {...midtransForm.register("merchantId")}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientKey">Client Key</Label>
              <Input
                id="clientKey"
                placeholder="SB-Mid-client-..."
                {...midtransForm.register("clientKey")}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="serverKey">Server Key</Label>
              <Input
                id="serverKey"
                type="password"
                placeholder="SB-Mid-server-..."
                {...midtransForm.register("serverKey")}
                className="h-12"
              />
            </div>

            <a
              href="https://dashboard.midtrans.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline block"
            >
              Where to find these keys in Midtrans dashboard?
            </a>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 text-lg font-heading font-bold bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              {isLoading ? "Testing connection..." : "Test Connection"}
            </Button>
          </form>
        );

      case 2:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose a model that fits your team culture. You can change this later.
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setDistributionMode("PERSONAL")}
                className={`w-full p-4 rounded-xl border text-left transition-colors ${
                  distributionMode === "PERSONAL"
                    ? "border-primary bg-primary/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className="font-heading font-semibold">Personal tipping</div>
                <div className="text-sm text-muted-foreground">
                  Each staff member keeps tips from their personal QR codes.
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
                <div className="font-heading font-semibold">Pooled tipping (shared)</div>
                <div className="text-sm text-muted-foreground">
                  All tips go into a shared pool and are split equally among active staff.
                </div>
              </button>
            </div>

            <Button
              onClick={handleDistributionSubmit}
              disabled={isLoading}
              className="w-full h-14 text-lg font-heading font-bold bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              Continue
            </Button>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4 text-center">
            <div className="text-6xl">🎉</div>
            <h3 className="text-xl font-heading font-bold">You&apos;re ready to receive digital tips!</h3>
            <p className="text-muted-foreground">
              Once guests start scanning and paying tips, you&apos;ll see all data in your dashboard.
            </p>
            <Button
              onClick={() => router.push("/venue/dashboard")}
              className="w-full h-14 text-lg font-heading font-bold bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              Go to Dashboard
            </Button>
          </div>
        );
    }
  };

  return (
    <main className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      <div className="fixed inset-0 -z-10 overflow-hidden bg-background">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[100px]" />
      </div>

      <Card className="glass w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center gap-2 mb-4">
            {steps.map((step, index) => (
              <div
                key={step}
                className={`h-2 w-12 rounded-full transition-colors ${
                  index <= currentStep ? "bg-primary" : "bg-white/10"
                }`}
              />
            ))}
          </div>
          <CardTitle className="text-2xl font-heading text-gradient">
            {steps[currentStep]}
          </CardTitle>
          <CardDescription>
            Step {currentStep + 1} of {steps.length}
          </CardDescription>
        </CardHeader>
        <CardContent>{renderStep()}</CardContent>
      </Card>
    </main>
  );
}
