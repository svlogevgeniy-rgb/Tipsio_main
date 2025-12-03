'use client';

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "@/i18n/client";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Building2,
  UserCheck,
  CreditCard,
  Smartphone,
  LayoutDashboard,
  Receipt,
} from "lucide-react";

function BrandLogo({ textClassName = "text-xl sm:text-2xl" }: { textClassName?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-white">
      <Image
        src="/logo.svg"
        alt="Tipsio logo"
        width={28}
        height={28}
        className="h-6 w-6 sm:h-7 sm:w-7"
        priority
      />
      <span className={`${textClassName} font-heading font-bold leading-none`}>Tipsio</span>
    </span>
  );
}

// Hero Animation - показывает поток чаевых
function TipFlowAnimation() {
  const [step, setStep] = useState(0);
  const tips = [
    { amount: "50k", emoji: "💳" },
    { amount: "20k", emoji: "💰" },
    { amount: "100k", emoji: "🎉" }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % 3);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Phone mockup */}
      <div className="relative mx-auto w-64 h-[420px] bg-gradient-to-b from-gray-800 to-gray-900 rounded-[2.5rem] p-2 shadow-2xl">
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-6 bg-black rounded-full" />
        <div className="w-full h-full bg-white rounded-[2rem] overflow-hidden relative">
          {/* Screen content */}
          <div className="p-4 pt-8 h-full flex flex-col">
            <div className="text-center mb-4">
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-2xl">👨‍🍳</span>
              </div>
              <p className="text-sm font-medium text-gray-900">Made Wayan</p>
              <p className="text-xs text-gray-500">Beach Club Canggu</p>
            </div>
            
            {/* Amount buttons */}
            <div className="grid grid-cols-4 gap-1.5 mb-4">
              {["10k", "20k", "50k", "100k"].map((amt) => (
                <motion.div
                  key={amt}
                  animate={{ 
                    scale: tips[step].amount === amt ? 1.1 : 1,
                    backgroundColor: tips[step].amount === amt ? "rgb(30 95 75)" : "rgb(243 244 246)"
                  }}
                  className="h-10 rounded-lg flex items-center justify-center text-sm font-medium"
                  style={{ color: tips[step].amount === amt ? "white" : "rgb(17 24 39)" }}
                >
                  {amt}
                </motion.div>
              ))}
            </div>

            {/* Animated tip flow */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 flex flex-col items-center justify-center"
              >
                <div className="text-4xl mb-2">{tips[step].emoji}</div>
                <div className="text-2xl font-bold text-primary">IDR {tips[step].amount}</div>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2 }}
                  className="h-1 bg-primary rounded-full mt-3 max-w-[120px]"
                />
              </motion.div>
            </AnimatePresence>

            {/* Mini dashboard preview */}
            <div className="mt-auto p-3 rounded-xl bg-gray-100">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Today&apos;s tips</span>
                <span className="font-bold text-primary">IDR 350k</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// FAQ Accordion
function FAQItem({ question, answer, isOpen, onToggle }: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <span className="font-medium text-sm md:text-base">{question}</span>
        {isOpen ? <ChevronUp className="h-5 w-5 flex-shrink-0" /> : <ChevronDown className="h-5 w-5 flex-shrink-0" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-5 pb-4 text-sm text-muted-foreground">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Home() {
  const t = useTranslations('landing');
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Simple Background */}
      <div className="fixed inset-0 -z-10 bg-background" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-primary border-b border-white/10">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 text-white">
              <BrandLogo />
            </Link>
            <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] bg-white/20 text-white rounded-full">
              {t('betaBadge')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link href="/venue/login" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="text-white/80 hover:text-white text-sm">
                {t('footer.venueLogin')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section - Mobile First */}
      <section className="pt-20 pb-8 md:pt-24 md:pb-16 px-4">
        <div className="container mx-auto max-w-5xl">
          {/* Mobile beta badge */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="sm:hidden text-center mb-4"
          >
            <span className="inline-block px-3 py-1 text-xs bg-primary/20 text-primary rounded-full">
              {t('betaBadge')}
            </span>
          </motion.div>

          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
            {/* Text content */}
            <div className="flex-1 text-center lg:text-left">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-heading font-bold mb-4 leading-tight"
              >
                {t('hero.title')}
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-sm md:text-base text-muted-foreground mb-6 leading-relaxed"
              >
                {t('hero.subtitle')}
              </motion.p>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-4"
              >
                <Link href="/venue/register">
                  <Button size="lg" className="w-full sm:w-auto h-12 px-6 text-base font-heading font-bold bg-white text-primary hover:bg-white/90 hover:scale-105 transition-transform rounded-full">
                    {t('hero.primaryCta')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="w-full sm:w-auto h-12 px-6 text-base font-heading bg-black text-white border-black hover:bg-black/80 rounded-full"
                  onClick={() => scrollToSection('how-it-works')}
                >
                  {t('hero.secondaryCta')}
                </Button>
              </motion.div>

              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-xs text-muted-foreground"
              >
                {t('hero.miniTrust')}
              </motion.p>
            </div>

            {/* Phone animation - hidden on very small screens */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex-shrink-0 hidden sm:block"
            >
              <TipFlowAnimation />
            </motion.div>
          </div>
        </div>
      </section>

      {/* For Whom Section */}
      <section className="py-12 md:py-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.h2 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-heading font-bold text-center mb-8"
          >
            {t('forWhom.title')}
          </motion.h2>

          <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-3 md:gap-4">
            {/* Owners */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Card className="glass h-full hover:border-primary/30 transition-colors">
                <CardContent className="p-5">
                  <Building2 className="h-8 w-8 text-primary mb-3" />
                  <h3 className="text-lg font-heading font-semibold mb-3">{t('forWhom.owners.title')}</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{t('forWhom.owners.point1')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{t('forWhom.owners.point2')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{t('forWhom.owners.point3')}</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            {/* Staff */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <Card className="glass h-full hover:border-primary/30 transition-colors">
                <CardContent className="p-5">
                  <UserCheck className="h-8 w-8 text-primary mb-3" />
                  <h3 className="text-lg font-heading font-semibold mb-3">{t('forWhom.staff.title')}</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{t('forWhom.staff.point1')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{t('forWhom.staff.point2')}</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            {/* Guests */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <Card className="glass h-full hover:border-primary/30 transition-colors">
                <CardContent className="p-5">
                  <CreditCard className="h-8 w-8 text-primary mb-3" />
                  <h3 className="text-lg font-heading font-semibold mb-3">{t('forWhom.guests.title')}</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{t('forWhom.guests.point1')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{t('forWhom.guests.point2')}</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-12 md:py-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <motion.h2 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-heading font-bold text-center mb-8"
          >
            {t('howItWorks.title')}
          </motion.h2>

          <div className="space-y-6">
            {[
              { key: 'step1', num: '1' },
              { key: 'step2', num: '2' },
              { key: 'step3', num: '3' }
            ].map((step, index) => (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex gap-4"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                  {step.num}
                </div>
                <div className="flex-1">
                  <h3 className="font-heading font-semibold mb-1">{t(`howItWorks.${step.key}.title`)}</h3>
                  <p className="text-sm text-muted-foreground">{t(`howItWorks.${step.key}.description`)}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-8 text-center"
          >
            <div className="inline-block px-4 py-2 bg-white/5 rounded-full text-xs text-muted-foreground">
              {t('howItWorks.flowText')}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why Bali Section */}
      <section className="py-12 md:py-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <motion.h2 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-heading font-bold text-center mb-8"
          >
            {t('whyBali.title')}
          </motion.h2>

          <div className="grid sm:grid-cols-2 gap-4">
            {['point1', 'point2', 'point3', 'point4'].map((point, index) => (
              <motion.div
                key={point}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">{t(`whyBali.${point}`)}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Product Peek Section */}
      <section className="py-12 md:py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.h2 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-heading font-bold text-center mb-8"
          >
            {t('productPeek.title')}
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { key: 'guestScreen', icon: Smartphone },
              { key: 'dashboard', icon: LayoutDashboard },
              { key: 'payouts', icon: Receipt }
            ].map((item, index) => (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="glass h-full hover:border-primary/30 transition-all hover:scale-[1.02]">
                  <CardContent className="p-5 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <item.icon className="h-8 w-8 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">{t(`productPeek.${item.key}`)}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Where We Are Section */}
      <section className="py-12 md:py-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="glass rounded-2xl p-6 md:p-8"
          >
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-center mb-4">
              {t('whereWeAre.title')}
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-6 max-w-xl mx-auto">
              {t('whereWeAre.description')}
            </p>
            <div className="space-y-3">
              {['point1', 'point2', 'point3'].map((point, index) => (
                <motion.div
                  key={point}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{t(`whereWeAre.${point}`)}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 md:py-16 px-4">
        <div className="container mx-auto max-w-2xl">
          <motion.h2 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-heading font-bold text-center mb-8"
          >
            {t('faq.title')}
          </motion.h2>

          <div className="space-y-3">
            {['q1', 'q2', 'q3', 'q4', 'q5'].map((q, index) => (
              <motion.div
                key={q}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                <FAQItem
                  question={t(`faq.${q}.question`)}
                  answer={t(`faq.${q}.answer`)}
                  isOpen={openFAQ === index}
                  onToggle={() => setOpenFAQ(openFAQ === index ? null : index)}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 md:py-20 px-4">
        <div className="container mx-auto max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-3xl font-heading font-bold mb-3">
              {t('finalCta.title')}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {t('finalCta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/venue/register">
                <Button size="lg" className="w-full sm:w-auto h-12 px-6 text-base font-heading font-bold bg-white text-primary hover:bg-white/90 hover:scale-105 transition-transform rounded-full">
                  {t('finalCta.primaryCta')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="https://wa.me/message/your-whatsapp" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-6 text-base font-heading bg-black text-white border-black hover:bg-black/80 rounded-full">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  {t('finalCta.secondaryCta')}
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/10">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <BrandLogo textClassName="text-xl md:text-2xl" />
            <div className="flex gap-6 text-sm text-white/70">
              <Link href="/staff/login" className="hover:text-white transition-colors">
                {t('footer.staffLogin')}
              </Link>
              <Link href="/venue/login" className="hover:text-white transition-colors">
                {t('footer.venueLogin')}
              </Link>
            </div>
            <p className="text-sm text-white/70">
              © 2025 Tipsio. Bali, Indonesia
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
