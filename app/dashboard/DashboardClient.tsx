"use client";

import React from "react";
import { WardrobeItem } from "@/types";
import {
  Sparkles,
  Shirt,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Palette,
  User,
  ShieldCheck,
  ArrowRight,
  Plus,
  Compass,
  MessageSquare,
  Zap,
} from "lucide-react";
import Link from "next/link";

interface DashboardClientProps {
  user: any;
  profile: any;
  wardrobe: WardrobeItem[];
  subscription: any;
  savedOutfits: any[];
  feedbackList: any[];
}

export default function DashboardClient({
  user,
  profile,
  wardrobe,
  subscription,
  savedOutfits,
  feedbackList,
}: DashboardClientProps) {
  // Category counts
  const topsCount = wardrobe.filter((i) => i.meta?.category?.toLowerCase() === "tops").length;
  const bottomsCount = wardrobe.filter((i) => i.meta?.category?.toLowerCase() === "bottoms").length;
  const outerwearCount = wardrobe.filter((i) => i.meta?.category?.toLowerCase() === "outerwear").length;
  const footwearCount = wardrobe.filter((i) => i.meta?.category?.toLowerCase() === "footwear").length;

  const likedCount = feedbackList.filter((f) => f.liked).length;
  const dislikedCount = feedbackList.filter((f) => !f.liked).length;

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-slate-900 font-sans pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white py-10 px-6 sm:px-10 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-semibold border border-indigo-400/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Personal Fashion Intelligence
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Welcome back, {user.email?.split("@")[0] || "Stylist"}!
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Signed in as <span className="text-slate-200 font-medium">{user.email}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/stylist"
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-xs font-bold transition-all shadow-md hover:shadow-indigo-500/20"
            >
              <MessageSquare className="w-4 h-4" /> AURA Stylist AI
            </Link>
            <Link
              href="/closet"
              className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-bold transition-all backdrop-blur-md border border-white/10"
            >
              <Shirt className="w-4 h-4" /> My Closet ({wardrobe.length})
            </Link>
            <Link
              href="/onboarding"
              className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-bold transition-all backdrop-blur-md border border-white/10"
            >
              <Palette className="w-4 h-4" /> Style Analysis
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto px-6 sm:px-10 mt-8 space-y-8">
        {/* Top 3 Metric Highlight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Card 1: Wardrobe Items */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <Shirt className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Digital Closet</p>
              <h2 className="text-2xl font-bold text-slate-900 mt-0.5">{wardrobe.length} Items</h2>
              <p className="text-[11px] text-slate-500 font-medium">Uploaded & tagged</p>
            </div>
          </div>

          {/* Card 2: Saved Outfits */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center shrink-0">
              <Heart className="w-6 h-6 text-pink-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Saved Looks</p>
              <h2 className="text-2xl font-bold text-slate-900 mt-0.5">{savedOutfits.length} Outfits</h2>
              <p className="text-[11px] text-slate-500 font-medium">In your wardrobe collection</p>
            </div>
          </div>

          {/* Card 3: Feedback Memory */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <ThumbsUp className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Feedback Memory</p>
              <h2 className="text-2xl font-bold text-slate-900 mt-0.5">{feedbackList.length} Rated</h2>
              <p className="text-[11px] text-slate-500 font-medium">
                {likedCount} liked • {dislikedCount} disliked
              </p>
            </div>
          </div>

          {/* Card 4: Subscription */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Subscription</p>
              <h2 className="text-2xl font-bold text-slate-900 mt-0.5 capitalize">
                {subscription?.status || "Free"} Plan
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                {subscription?.analyses_count || 0} AI analyses used
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Style Profile Intelligence Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Style Profile Overview */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Palette className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Your Style Profile Analysis</h2>
                  <p className="text-xs text-slate-500">AI-computed color season & body archetype guidelines</p>
                </div>
              </div>
              <Link
                href="/onboarding"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                Retake Analysis <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {!profile ? (
              <div className="bg-slate-50 rounded-2xl p-8 text-center border border-dashed border-slate-200">
                <Palette className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-700">No Style Profile Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  Upload your photo in Onboarding to get AI analysis for your color season, body archetype, and fit guidance.
                </p>
                <Link
                  href="/onboarding"
                  className="px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-full inline-block shadow-md"
                >
                  Start Style Analysis
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-amber-50/80 border border-amber-200/80 p-4 rounded-2xl">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Color Season</p>
                    <p className="text-base font-extrabold text-amber-950 mt-1">{profile.season || "Autumn"}</p>
                  </div>
                  <div className="bg-indigo-50/80 border border-indigo-200/80 p-4 rounded-2xl">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-800">Body Archetype</p>
                    <p className="text-base font-extrabold text-indigo-950 mt-1">{profile.body_archetype || "Trapezoid"}</p>
                  </div>
                  <div className="bg-purple-50/80 border border-purple-200/80 p-4 rounded-2xl">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-purple-800">Face Shape</p>
                    <p className="text-base font-extrabold text-purple-950 mt-1">{profile.face_shape || "Oval"}</p>
                  </div>
                </div>

                {/* Hero Colors */}
                {profile.hero_colors && profile.hero_colors.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                      Your Hero Colors (Best Complementary Tones)
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {profile.hero_colors.map((c: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full">
                          <span
                            className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs"
                            style={{ backgroundColor: c.hex || "#6366F1" }}
                          />
                          <span className="text-xs font-semibold text-slate-700">{c.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fit Guidance */}
                {profile.fit_guidance && (
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Fit Guidance</h3>
                    <p className="text-sm text-slate-700 leading-relaxed font-medium">{profile.fit_guidance}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Closet Distribution */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center">
                    <Shirt className="w-5 h-5 text-pink-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Closet Breakdown</h2>
                    <p className="text-xs text-slate-500">Categories distribution</p>
                  </div>
                </div>
                <Link
                  href="/closet"
                  className="text-xs font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1"
                >
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Category Pills */}
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-2">👕 Tops</span>
                  <span className="text-xs font-extrabold bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                    {topsCount} items
                  </span>
                </div>
                <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-2">👖 Bottoms</span>
                  <span className="text-xs font-extrabold bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                    {bottomsCount} items
                  </span>
                </div>
                <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-2">🧥 Outerwear</span>
                  <span className="text-xs font-extrabold bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                    {outerwearCount} items
                  </span>
                </div>
                <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-2">👞 Footwear</span>
                  <span className="text-xs font-extrabold bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                    {footwearCount} items
                  </span>
                </div>
              </div>
            </div>

            {/* Upload New Item CTA */}
            <Link
              href="/closet"
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-md mt-6"
            >
              <Plus className="w-4 h-4" /> Add Clothes to Closet
            </Link>
          </div>
        </div>

        {/* Section 3: Recent Clothes & Feedback Links */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Closet Items Preview */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-bold text-slate-900">Recent Closet Additions</h3>
              <Link href="/closet" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
                Manage Closet →
              </Link>
            </div>

            {wardrobe.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No clothing items uploaded yet.</p>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {wardrobe.slice(0, 4).map((item) => (
                  <div key={item.id} className="group relative rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-50 p-2 flex items-center justify-center">
                    <img src={item.image_url} alt={item.meta?.sub_category} className="w-full h-full object-contain" />
                    <span className="absolute bottom-1 left-1 right-1 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-semibold py-0.5 px-1 rounded text-center truncate">
                      {item.meta?.sub_category}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Feedback & Preference History Preview */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900">Feedback & Preference Memory</h3>
                <Link href="/feedback-history" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
                  View History →
                </Link>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                AURA remembers outfits you rate. Disliking an item type prevents it from appearing in future recommendations.
              </p>

              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    👍
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{likedCount} Liked</p>
                    <p className="text-[10px] text-slate-400">Favored styles</p>
                  </div>
                </div>

                <div className="w-px h-8 bg-slate-200" />

                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                    👎
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{dislikedCount} Disliked</p>
                    <p className="text-[10px] text-slate-400">Avoided styles</p>
                  </div>
                </div>
              </div>
            </div>

            <Link
              href="/feedback-history"
              className="w-full py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 border border-indigo-200 mt-6"
            >
              Manage Feedback History
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
