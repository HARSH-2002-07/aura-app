"use client";

import React, { useState } from "react";
import { 
  Sparkles, Loader2, Heart, LogOut, CloudRain, ShoppingBag, 
  ArrowRight, Shirt, Zap, MapPin, ThumbsUp, ThumbsDown, History, RefreshCw 
} from "lucide-react";
import { useRouter } from "next/navigation";
import { WardrobeItem } from "@/types";
import { PlannerResult } from "@/lib/planner";
import { createClient } from "@/lib/supabase/client";

interface OutfitRecommendationProps {
  user: {
    id: string;
    email?: string;
    full_name?: string;
  };
}

export default function OutfitRecommendation({ user }: OutfitRecommendationProps) {
  const router = useRouter();
  const supabase = createClient();
  
  const [hasOutfit, setHasOutfit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [currentOutfit, setCurrentOutfit] = useState<PlannerResult["outfit"] | null>(null);
  const [scenario, setScenario] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [savedOutfitId, setSavedOutfitId] = useState<string | null>(null);
  const [shoppingTip, setShoppingTip] = useState<string | null>(null);
  const [weather, setWeather] = useState<PlannerResult["weather"] | null>(null);
  const [confidence, setConfidence] = useState<PlannerResult["confidence"] | null>(null);
  
  const [viewMode, setViewMode] = useState<"grid" | "paperdoll">("grid");
  const [swappingSlot, setSwappingSlot] = useState<string | null>(null);
  const [userFeedback, setUserFeedback] = useState<"like" | "dislike" | null>(null);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleRecommend = async () => {
    if (!scenario.trim()) return;
    setLoading(true);
    setError(null);
    setUserFeedback(null);
    setIsSaved(false);
    setSavedOutfitId(null);
    
    try {
      const response = await fetch("/api/recommend-outfit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: scenario })
      });

      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Failed to generate");

      setCurrentOutfit(result.outfit);
      setShoppingTip(result.shopping_tip);
      setWeather(result.weather);
      setConfidence(result.confidence);
      setHasOutfit(true);
    } catch (error: any) {
      console.error("Error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOutfit = async () => {
    if (isSaved || !currentOutfit) return; // Prevent double saving for now
    setLoading(true);
    try {
      const response = await fetch("/api/save-outfit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outfit: currentOutfit,
          occasion: scenario,
        })
      });

      const result = await response.json();
      if (!response.ok || !result.success) throw new Error("Failed to save");

      setIsSaved(true);
      setSavedOutfitId(result.data[0].id);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSwapItem = async (slot: string) => {
    setSwappingSlot(slot);
    try {
      const response = await fetch("/api/swap-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot: slot,
          current_outfit: currentOutfit,
          query: scenario
        })
      });

      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Failed to swap item");

      setCurrentOutfit(result.outfit);
    } catch (error: any) {
      console.error("Error swapping item:", error);
      setError(error.message);
    } finally {
      setSwappingSlot(null);
    }
  };

  // Weather Gradient logic
  const getWeatherBackground = () => {
    if (!weather?.condition) return "bg-gradient-to-br from-slate-50 to-slate-100";
    const cond = weather.condition.toLowerCase();
    if (cond.includes("rain") || cond.includes("storm")) return "bg-gradient-to-br from-blue-900 via-slate-700 to-blue-800";
    if (cond.includes("cloud")) return "bg-gradient-to-br from-slate-400 via-gray-300 to-slate-500";
    if (cond.includes("sun") || cond.includes("clear")) return "bg-gradient-to-br from-amber-300 via-orange-200 to-yellow-300";
    return "bg-gradient-to-br from-slate-50 to-slate-100";
  };

  return (
    <div className="flex h-screen bg-[#F8F9FB] overflow-hidden font-sans text-slate-800">
      {/* SIDEBAR */}
      <aside className="w-[400px] bg-white border-r border-slate-200 flex flex-col z-20 shadow-xl relative">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">A</div>
            <span className="font-bold text-xl tracking-tight text-slate-900">AURA<span className="text-indigo-600">Planner</span></span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Curate your look</h2>
              <p className="text-slate-500 text-sm">Where are you headed today?</p>
            </div>
            
            <div className="relative group">
              <textarea
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                placeholder="e.g. A rooftop dinner date in Tokyo..."
                className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-slate-700 placeholder:text-slate-400"
              />
              <div className="absolute bottom-3 right-3">
                <Sparkles className={`w-5 h-5 ${scenario ? "text-indigo-500" : "text-slate-300"}`} />
              </div>
            </div>

            <button
              onClick={handleRecommend}
              disabled={loading || !scenario.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-4 rounded-xl font-semibold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Zap className="w-5 h-5 fill-current" />
                  <span>Generate Outfit</span>
                </>
              )}
            </button>
            
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex gap-2">
                <span className="font-bold">Error:</span> {error}
              </div>
            )}
          </div>

          {hasOutfit && !loading && (
            <div className="space-y-4 animate-in slide-in-from-left-4 duration-500">
              {weather && (
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conditions</span>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="w-4 h-4 text-indigo-500" />
                      <span className="font-semibold text-slate-900">{weather.city}</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-800 mt-1">
                      {weather.temp}°C <span className="text-base font-normal text-slate-500">{weather.condition}</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
                    <CloudRain className="w-6 h-6" />
                  </div>
                </div>
              )}

              {shoppingTip && (
                <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 to-indigo-700 p-5 rounded-2xl text-white shadow-lg">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl"></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2 text-indigo-100">
                      <ShoppingBag className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Stylist Tip</span>
                    </div>
                    <p className="font-medium leading-snug">{shoppingTip}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">
                {user.email?.[0].toUpperCase() || "U"}
              </div>
              <div className="text-sm">
                <p className="font-semibold text-slate-900 truncate max-w-[120px]">
                  {user.full_name || "User"}
                </p>
                <button onClick={handleSignOut} className="text-slate-500 hover:text-red-600 text-xs flex items-center gap-1 transition-colors">
                  <LogOut className="w-3 h-3" /> Sign Out
                </button>
              </div>
            </div>
            <button onClick={() => router.push("/closet")} className="p-2 hover:bg-white rounded-lg text-slate-500 hover:text-indigo-600 transition-colors">
              <Shirt className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CANVAS */}
      <main className="flex-1 relative overflow-y-auto bg-slate-50/50 p-8 lg:p-12 flex flex-col">
        {!hasOutfit ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
              <Sparkles className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-semibold text-slate-700">No outfit generated yet</h3>
            <p className="text-slate-500 max-w-xs mt-2">Use the sidebar to describe your occasion and get AI recommendations.</p>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto w-full animate-in fade-in zoom-in duration-500">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Your Generated Look</h1>
                <p className="text-slate-500 mt-1">Curated for: <span className="font-medium text-indigo-600">"{scenario}"</span></p>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setViewMode(viewMode === "grid" ? "paperdoll" : "grid")} 
                  className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:text-indigo-600 hover:border-indigo-300 transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {viewMode === "grid" ? "Paper Doll View" : "Grid View"}
                </button>
                
                <button 
                  onClick={handleSaveOutfit}
                  className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all ${
                    isSaved 
                      ? "bg-green-500 text-white shadow-lg shadow-green-200" 
                      : "bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-md"
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isSaved ? "fill-current" : ""}`} />
                  {isSaved ? "Saved!" : "Save Look"}
                </button>
              </div>
            </div>

            {viewMode === "paperdoll" ? (
              <div className={`relative min-h-[700px] rounded-3xl overflow-hidden ${getWeatherBackground()} transition-all duration-700`}>
                <div className="flex items-center justify-center min-h-[700px] p-8">
                  <div className="relative flex flex-col items-center" style={{ width: "320px" }}>
                    {/* Tops & Outerwear */}
                    <div className="relative w-full flex justify-center z-10" style={{ height: "280px" }}>
                      {currentOutfit?.outerwear && (
                        <img src={currentOutfit.outerwear.image_url} alt="Outerwear" className="absolute inset-0 w-full h-full object-contain scale-110 drop-shadow-xl z-20" />
                      )}
                      {currentOutfit?.tops && (
                        <img src={currentOutfit.tops.image_url} alt="Top" className="absolute inset-0 w-full h-full object-contain drop-shadow-md z-10" />
                      )}
                    </div>
                    {/* Bottoms */}
                    <div className="relative w-full flex justify-center z-0" style={{ height: "280px", marginTop: "-10px" }}>
                      {currentOutfit?.bottoms && (
                        <img src={currentOutfit.bottoms.image_url} alt="Bottoms" className="absolute inset-0 w-full h-full object-contain drop-shadow-md" />
                      )}
                    </div>
                    {/* Shoes */}
                    <div className="relative w-full flex justify-center z-20" style={{ height: "140px", marginTop: "-20px" }}>
                      {currentOutfit?.shoes && (
                        <img src={currentOutfit.shoes.image_url} alt="Footwear" className="absolute inset-0 w-full h-full object-contain drop-shadow-md" />
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-xl p-6 rounded-2xl shadow-lg border border-slate-100 z-50">
                  <p className="text-xs uppercase tracking-widest font-bold mb-1 text-slate-500">Confidence</p>
                  <p className="text-4xl font-bold text-indigo-600">{confidence?.percentage || 0}%</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 min-h-[600px]">
                <div className="lg:col-span-1 flex flex-col gap-6 h-full min-h-[600px]">
                  {currentOutfit?.outerwear && (
                    <ItemCard item={currentOutfit.outerwear} label="Outerwear" onSwap={handleSwapItem} slotKey="outerwear" isSwapping={swappingSlot === "outerwear"} />
                  )}
                  {currentOutfit?.tops && (
                    <ItemCard item={currentOutfit.tops} label="Top" onSwap={handleSwapItem} slotKey="tops" isSwapping={swappingSlot === "tops"} />
                  )}
                </div>

                <div className="lg:col-span-2 h-full min-h-[600px]">
                  {currentOutfit?.bottoms && (
                    <ItemCard item={currentOutfit.bottoms} label="Bottoms" onSwap={handleSwapItem} slotKey="bottoms" isSwapping={swappingSlot === "bottoms"} isHero={true} />
                  )}
                </div>

                <div className="lg:col-span-1 flex flex-col gap-6 h-full min-h-[600px]">
                  {currentOutfit?.shoes && (
                    <ItemCard item={currentOutfit.shoes} label="Footwear" onSwap={handleSwapItem} slotKey="shoes" isSwapping={swappingSlot === "shoes"} />
                  )}
                  <div className="flex-1 bg-slate-900 rounded-3xl p-6 flex flex-col justify-between text-slate-300">
                    <Sparkles className="w-8 h-8 text-yellow-400" />
                    <div>
                      <p className="text-xs uppercase tracking-widest font-bold mb-1 opacity-50">Confidence Score</p>
                      <p className="text-3xl font-bold text-white">{confidence?.percentage || 0}%</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

const ItemCard = ({ item, label, isHero, onSwap, slotKey, isSwapping }: any) => {
  return (
    <div className={`relative group bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 flex-1 ${isHero ? "h-full" : ""}`}>
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <span className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-xs font-bold text-slate-500 uppercase tracking-wider border border-slate-100">
          {label}
        </span>
      </div>

      <button
        onClick={() => onSwap(slotKey)}
        disabled={isSwapping}
        className="absolute top-4 right-4 z-10 p-2 bg-white/90 backdrop-blur-md rounded-full text-slate-600 hover:text-indigo-600 hover:bg-white transition-all border border-slate-100 hover:border-indigo-300 disabled:opacity-50"
      >
        <RefreshCw className={`w-4 h-4 ${isSwapping ? "animate-spin" : ""}`} />
      </button>

      <div className="absolute inset-0 flex items-center justify-center p-6">
        <img 
          src={item.image_url} 
          alt={label} 
          className={`w-full h-full object-contain drop-shadow-lg group-hover:scale-110 transition-transform duration-500 ${isSwapping ? "opacity-50" : ""}`}
        />
      </div>

      <div className="absolute inset-x-4 bottom-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
        <div className="bg-white/95 backdrop-blur-xl p-4 rounded-2xl shadow-lg border border-slate-100 space-y-2">
          <h4 className="font-bold text-slate-900 truncate">{item.meta?.sub_category || label}</h4>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.meta?.hex_color || "#000" }}></span>
            {item.meta?.color} • {item.meta?.formality}
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium">{item.meta?.style}</span>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">{item.meta?.fabric}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
