"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useTranslations } from "@/i18n/client";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  venueName: z.string().min(2, "Venue name must be at least 2 characters"),
  venueType: z.enum(["RESTAURANT", "CAFE", "BAR", "COFFEE_SHOP", "OTHER"]),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations('venue.register');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("[Register] Submitting registration:", { 
        email: data.email, 
        venueName: data.venueName,
        venueType: data.venueType 
      });

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      console.log("[Register] Response status:", response.status);

      const result = await response.json();
      console.log("[Register] Response data:", result);

      if (!response.ok) {
        const errorMessage = result.message || "Registration failed";
        console.error("[Register] Registration failed:", errorMessage);
        setError(errorMessage);
        return;
      }

      console.log("[Register] Registration successful, redirecting...");
      router.push("/venue/login?registered=true");
    } catch (err: any) {
      console.error("[Register] Error during registration:", err);
      setError("Something went wrong. Please try again.");
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="venueName">{t('venueName')}</Label>
              <Input
                id="venueName"
                placeholder={t('venueNamePlaceholder')}
                {...register("venueName")}
                className="h-12"
              />
              {errors.venueName && (
                <p className="text-sm text-destructive">{errors.venueName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="venueType">{t('venueType')}</Label>
              <Select 
                onValueChange={(value) => {
                  setValue("venueType", value as RegisterForm["venueType"], { 
                    shouldValidate: true 
                  });
                }}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder={t('selectType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RESTAURANT">{t('restaurant')}</SelectItem>
                  <SelectItem value="CAFE">{t('cafe')}</SelectItem>
                  <SelectItem value="BAR">{t('bar')}</SelectItem>
                  <SelectItem value="COFFEE_SHOP">{t('coffeeShop')}</SelectItem>
                  <SelectItem value="OTHER">{t('other')}</SelectItem>
                </SelectContent>
              </Select>
              {errors.venueType && (
                <p className="text-sm text-destructive">{errors.venueType.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register("email")}
                className="h-12"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register("password")}
                className="h-12"
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 text-lg font-heading font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500"
            >
              {isLoading ? t('creating') : t('createAccount')}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {t('haveAccount')}{" "}
              <Link href="/venue/login" className="text-primary hover:underline">
                {t('signIn')}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
