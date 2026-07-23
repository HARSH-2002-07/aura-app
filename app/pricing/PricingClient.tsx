"use client";

import React, { useState } from "react";
import { Check, Sparkles, Zap, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface PricingClientProps {
  user: any;
  subscription: any;
}

export default function PricingClient({ user, subscription }: PricingClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isPro = subscription?.status === "active";

  const handleCheckout = async () => {
    if (!user) {
      router.push("/auth/login");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to start checkout session.");
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePortal = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Portal error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-slate-900 font-sans pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-slate-900 to-indigo-950 text-white py-16 px-6 text-center shadow-lg">
        <span className="px-3.5 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-semibold border border-indigo-400/30 inline-flex items-center gap-1.5 mb-4">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Upgrade Your Wardrobe Intelligence
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
          Flexible Plans for Every Style
        </h1>
        <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto mt-3">
          Unlock unlimited AI outfit generations, background removal, and hyper-personalized stylist recommendations.
        </p>
      </div>

      {/* Pricing Cards Container */}
      <div className="max-w-5xl mx-auto px-6 -mt-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* Free Tier Card */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Starter</span>
                {!isPro && (
                  <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[11px] font-bold">
                    Current Plan
                  </span>
                )}
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900">$0</h2>
              <p className="text-xs text-slate-500 mt-1 mb-6">Forever Free</p>

              <div className="space-y-3 border-t border-slate-100 pt-6">
                <div className="flex items-center gap-3 text-xs text-slate-700 font-medium">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  Up to 10 Wardrobe Items
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-700 font-medium">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  3 AI Style Analyses / Month
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-700 font-medium">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  Local Background Removal
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 line-through">
                  Personalized Style Memory Scoring
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 line-through">
                  Unlimited AURA Stylist Chat
                </div>
              </div>
            </div>

            <Link
              href="/dashboard"
              className="w-full py-3 mt-8 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors text-center block"
            >
              Go to Dashboard
            </Link>
          </div>

          {/* Pro Plan Card */}
          <div className="bg-white rounded-3xl p-8 border-2 border-indigo-600 shadow-xl relative flex flex-col justify-between overflow-hidden">
            {/* Top Banner */}
            <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-extrabold uppercase px-4 py-1 rounded-bl-xl tracking-wider">
              Most Popular
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 fill-indigo-600" /> AURA Pro
                </span>
                {isPro && (
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[11px] font-bold">
                    Active Subscription
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <h2 className="text-4xl font-extrabold text-slate-900">$19</h2>
                <span className="text-slate-500 text-xs font-semibold">/ month</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 mb-6">Unlimited Style Intelligence</p>

              <div className="space-y-3 border-t border-slate-100 pt-6">
                <div className="flex items-center gap-3 text-xs text-slate-800 font-bold">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                  Unlimited Digital Closet Storage
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-800 font-bold">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                  Unlimited AURA Stylist AI Chat
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-800 font-bold">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                  Personalized Style Memory Bias Engine
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-800 font-bold">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                  Priority NVIDIA Llama 70B AI Processing
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-800 font-bold">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                  Weather & Occasion Adaptation
                </div>
              </div>
            </div>

            {isPro ? (
              <button
                onClick={handlePortal}
                disabled={loading}
                className="w-full py-3.5 mt-8 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Manage Subscription"}
              </button>
            ) : (
              <button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full py-3.5 mt-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Upgrade to AURA Pro <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
