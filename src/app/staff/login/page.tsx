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
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useTranslations } from "@/i18n/client";

const contactSchema = z.object({
  contact: z.string().min(1, "Phone or email is required"),
});

const otpSchema = z.object({
  code: z.string().length(6, "Code must be 6 digits"),
});

type ContactForm = z.infer<typeof contactSchema>;
type OtpForm = z.infer<typeof otpSchema>;

export default function StaffLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"contact" | "otp">("contact");
  const [contact, setContact] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations('staff.login');

  const contactForm = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
  });

  const otpForm = useForm<OtpForm>({
    resolver: zodResolver(otpSchema),
  });

  const isEmail = (value: string) => value.includes("@");

  const onSendOtp = async (data: ContactForm) => {
    setIsLoading(true);
    setError(null);

    try {
      const payload = isEmail(data.contact)
        ? { email: data.contact }
        : { phone: data.contact };

      const response = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Failed to send code");
        return;
      }

      setContact(data.contact);
      setStep("otp");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const onVerifyOtp = async (data: OtpForm) => {
    setIsLoading(true);
    setError(null);

    try {
      const payload = isEmail(contact)
        ? { email: contact, code: data.code }
        : { phone: contact, code: data.code };

      const response = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Invalid code");
        return;
      }

      router.push("/staff/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const payload = isEmail(contact)
        ? { email: contact }
        : { phone: contact };

      await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setError(null);
    } catch {
      setError("Failed to resend code");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Aurora Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden bg-background">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[100px]" />
      </div>

      {/* Language Switcher */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>

      <Card className="glass w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-heading text-gradient">
            {t('title')}
          </CardTitle>
          <CardDescription>
            {t('subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "contact" ? (
            <form onSubmit={contactForm.handleSubmit(onSendOtp)} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="contact">{t('phoneOrEmail')}</Label>
                <Input
                  id="contact"
                  placeholder={t('placeholder')}
                  {...contactForm.register("contact")}
                  className="h-12"
                />
                {contactForm.formState.errors.contact && (
                  <p className="text-sm text-destructive">
                    {contactForm.formState.errors.contact.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 text-lg font-heading font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500"
              >
                {isLoading ? "..." : t('getCode')}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                {t('codeHint')}
              </p>
            </form>
          ) : (
            <form onSubmit={otpForm.handleSubmit(onVerifyOtp)} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              <p className="text-sm text-muted-foreground text-center">
                {t('enterCode', { contact })}
              </p>

              <div className="space-y-2">
                <Input
                  id="code"
                  placeholder="000000"
                  maxLength={6}
                  {...otpForm.register("code")}
                  className="h-14 text-center text-2xl tracking-widest font-mono"
                />
                {otpForm.formState.errors.code && (
                  <p className="text-sm text-destructive text-center">
                    {otpForm.formState.errors.code.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 text-lg font-heading font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500"
              >
                {isLoading ? "..." : t('login')}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                {t('resend').split('?')[0]}?{" "}
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-primary hover:underline"
                  disabled={isLoading}
                >
                  {t('resend').split('?')[1]?.trim() || 'Resend'}
                </button>
              </p>

              <button
                type="button"
                onClick={() => {
                  setStep("contact");
                  setError(null);
                }}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                ← {t('phoneOrEmail')}
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
