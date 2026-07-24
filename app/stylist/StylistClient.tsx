"use client";

import React, { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { WardrobeItem } from "@/types";
import type { OutfitRecommendation as PlannerOutfit, PlannerConfidence, WeatherCondition } from "@/lib/planner";
import {
  Send, Sparkles, User as UserIcon, Bot, ArrowLeft, ThumbsUp, ThumbsDown,
  CloudRain, MapPin, RefreshCw, ShoppingBag, Heart, Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface StylistClientProps {
  user: any;
  wardrobe: WardrobeItem[];
  profile?: any;
}

interface FindOutfitOutput {
  wardrobe_empty: boolean;
  outfit?: PlannerOutfit;
  confidence?: PlannerConfidence;
  weather?: WeatherCondition;
  shopping_tip?: string | null;
}

// Extracts every tool part (v5 `type: 'tool-<name>'` or v4 `toolInvocations`) from a message.
function getToolPartsFromMessage(m: any): any[] {
  const list: any[] = [];
  if (m.toolInvocations && Array.isArray(m.toolInvocations)) {
    list.push(...m.toolInvocations);
  }
  if (m.parts && Array.isArray(m.parts)) {
    for (const p of m.parts) {
      if (!p) continue;
      if (p.toolInvocation) list.push(p.toolInvocation);
      if (p.type && String(p.type).startsWith("tool")) list.push(p);
    }
  }
  return list;
}

function isFindOutfitTool(t: any): boolean {
  if (!t) return false;
  const name = t.toolName || t.name || (t.type ? String(t.type).replace("tool-", "") : "");
  return name === "find_outfit";
}

function getToolCallId(t: any): string | undefined {
  return t.toolCallId || t.id;
}

function getToolInput(t: any): any {
  return t.input || t.args || t.toolInvocation?.input || t.toolInvocation?.args || {};
}

function getToolOutput(t: any): FindOutfitOutput | undefined {
  return t.output || t.result || t.toolInvocation?.output || t.toolInvocation?.result;
}

export default function StylistClient({ user, wardrobe, profile }: StylistClientProps) {
  const router = useRouter();
  const [userInput, setUserInput] = useState("");

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    initialMessages: [
      {
        id: "welcome",
        role: "assistant",
        content: "Hi! I'm AURA, your personal AI stylist. What are we dressing for today?",
        parts: [{ type: "text", text: "Hi! I'm AURA, your personal AI stylist. What are we dressing for today?" }],
      },
    ],
  } as any) as any;

  const isLoading = status === "submitted" || status === "streaming";

  // ---- Outfit state (source of truth for the right panel) ----
  const [activeOutfit, setActiveOutfit] = useState<PlannerOutfit | null>(null);
  const [confidence, setConfidence] = useState<PlannerConfidence | null>(null);
  const [weather, setWeather] = useState<WeatherCondition | null>(null);
  const [shoppingTip, setShoppingTip] = useState<string | null>(null);
  const [occasion, setOccasion] = useState<string>("");
  const [wardrobeEmptyNotice, setWardrobeEmptyNotice] = useState(false);

  const [viewMode, setViewMode] = useState<"grid" | "paperdoll">("paperdoll");
  const [swappingSlot, setSwappingSlot] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [feedbackState, setFeedbackState] = useState<"none" | "liked" | "disliked">("none");
  const [actionError, setActionError] = useState<string | null>(null);

  const processedToolCallIds = useRef<Set<string>>(new Set());

  // Pick up the newest find_outfit tool result, without clobbering local swaps
  // on every re-render (only acts on genuinely new tool call ids).
  useEffect(() => {
    let newestOutput: FindOutfitOutput | undefined;
    let newestInput: any = null;
    const idsSeenThisPass: string[] = [];

    for (const m of messages) {
      for (const t of getToolPartsFromMessage(m)) {
        if (!isFindOutfitTool(t)) continue;
        const id = getToolCallId(t);
        const output = getToolOutput(t);
        if (!id || !output) continue;
        idsSeenThisPass.push(id);
        if (!processedToolCallIds.current.has(id)) {
          newestOutput = output;
          newestInput = getToolInput(t);
        }
      }
    }

    idsSeenThisPass.forEach((id) => processedToolCallIds.current.add(id));

    if (newestOutput) {
      if (newestOutput.wardrobe_empty) {
        setWardrobeEmptyNotice(true);
      } else if (newestOutput.outfit) {
        setWardrobeEmptyNotice(false);
        setActiveOutfit(newestOutput.outfit);
        setConfidence(newestOutput.confidence || null);
        setWeather(newestOutput.weather || null);
        setShoppingTip(newestOutput.shopping_tip || null);
        setOccasion(newestInput?.occasion || "");
        setIsSaved(false);
        setFeedbackState("none");
        setActionError(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const hasOutfit = Boolean(
    activeOutfit && (activeOutfit.tops || activeOutfit.bottoms || activeOutfit.outerwear || activeOutfit.shoes)
  );

  const handleFeedback = async (liked: boolean) => {
    if (!activeOutfit) return;
    const itemIds = [
      activeOutfit.outerwear?.id,
      activeOutfit.tops?.id,
      activeOutfit.bottoms?.id,
      activeOutfit.shoes?.id,
    ].filter(Boolean) as string[];
    if (itemIds.length === 0) return;

    setFeedbackState(liked ? "liked" : "disliked");
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_ids: itemIds, liked }),
      });
    } catch (err) {
      console.error("Failed to send feedback:", err);
    }
  };

  const handleSaveOutfit = async () => {
    if (isSaved || !activeOutfit) return;
    try {
      const response = await fetch("/api/save-outfit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outfit: activeOutfit, occasion: occasion || "Casual" }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Failed to save");
      setIsSaved(true);
    } catch (err: any) {
      setActionError(err.message || "Failed to save outfit.");
    }
  };

  const handleSwapItem = async (slot: string) => {
    if (!activeOutfit) return;
    setSwappingSlot(slot);
    setActionError(null);
    try {
      const response = await fetch("/api/swap-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot, current_outfit: activeOutfit, query: occasion }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Failed to swap item");
      setActiveOutfit(result.outfit);
      setIsSaved(false);
      setFeedbackState("none");
    } catch (err: any) {
      setActionError(err.message || "Failed to swap item.");
    } finally {
      setSwappingSlot(null);
    }
  };

  const getWeatherBackground = () => {
    if (!weather?.condition) return "bg-gradient-to-br from-slate-50 to-slate-100";
    const cond = weather.condition.toLowerCase();
    if (cond.includes("rain") || cond.includes("storm")) return "bg-gradient-to-br from-blue-900 via-slate-700 to-blue-800";
    if (cond.includes("cloud")) return "bg-gradient-to-br from-slate-400 via-gray-300 to-slate-500";
    if (cond.includes("sun") || cond.includes("clear")) return "bg-gradient-to-br from-amber-300 via-orange-200 to-yellow-300";
    return "bg-gradient-to-br from-slate-50 to-slate-100";
  };

  return (
    <div className="flex h-screen bg-[#F8F9FB] font-sans">
      {/* LEFT PANEL: Chat Interface */}
      <div className="w-1/2 flex flex-col border-r border-slate-200 bg-white relative z-10 shadow-xl">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/")} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 tracking-tight">AURA Stylist</h1>
              <p className="text-xs text-indigo-600 font-medium flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                Online & ready
              </p>
            </div>
          </div>

          {profile && (
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {profile.season && (
                <span className="px-2.5 py-1 bg-amber-50 text-amber-800 rounded-full text-[11px] font-semibold border border-amber-200 shrink-0">
                  🎨 {profile.season} Palette
                </span>
              )}
              {profile.body_archetype && (
                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-800 rounded-full text-[11px] font-semibold border border-indigo-200 shrink-0">
                  👤 {profile.body_archetype}
                </span>
              )}
              {profile.face_shape && (
                <span className="px-2.5 py-1 bg-purple-50 text-purple-800 rounded-full text-[11px] font-semibold border border-purple-200 shrink-0">
                  📐 {profile.face_shape}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((m: any) => {
            if (m.role === "system") return null;

            const textParts = m.parts?.filter((p: any) => p.type === "text") || [];
            let textContent = (m as any).content || textParts.map((p: any) => p.text).join("");

            const hasToolCall = getToolPartsFromMessage(m).some(isFindOutfitTool);

            if ((!textContent || textContent.trim() === "") && hasToolCall) {
              textContent = "✨ I've curated a custom outfit tailored to your style profile and request! Check out the styling panel on the right.";
            }

            if (
              textContent?.includes("No function call is") ||
              textContent?.includes("No function call needed") ||
              textContent?.includes("No tool call")
            ) {
              textContent = "Hello! I'm AURA, your personal AI fashion stylist. What outfit or occasion can I help you style today?";
            }

            if (!textContent || textContent.trim() === "") return null;

            const isUser = m.role === "user";

            return (
              <div key={m.id} className={`flex gap-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? "bg-slate-900" : "bg-indigo-100"}`}>
                  {isUser ? <UserIcon className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-indigo-600" />}
                </div>
                <div
                  className={`max-w-[80%] rounded-2xl p-4 ${
                    isUser
                      ? "bg-slate-900 text-white rounded-tr-sm shadow-md"
                      : "bg-slate-100 text-slate-800 rounded-tl-sm border border-slate-200"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{textContent}</p>
                </div>
              </div>
            );
          })}

          {(isLoading || (messages.length > 0 && messages[messages.length - 1].role === "user")) && (
            <div className="flex gap-4 items-center animate-in fade-in duration-300">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center shrink-0 shadow-md">
                <Sparkles className="w-4 h-4 text-white animate-spin" style={{ animationDuration: "3s" }} />
              </div>
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-950 rounded-2xl rounded-tl-sm p-4 border border-indigo-100 shadow-sm flex items-center gap-3">
                <div className="flex gap-1.5 items-center">
                  <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce"></div>
                  <div className="w-2.5 h-2.5 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-2.5 h-2.5 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
                <span className="text-xs font-semibold tracking-wide text-indigo-800">
                  AURA is checking your closet, style profile & the weather...
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="flex gap-4 items-center animate-in fade-in duration-300">
              <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-rose-600" />
              </div>
              <div className="bg-rose-50 text-rose-800 rounded-2xl rounded-tl-sm p-4 border border-rose-200 text-sm">
                ⚠️ Connection interrupted. Please try sending your message again.
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-slate-100">
          <form
            suppressHydrationWarning
            onSubmit={(e) => {
              e.preventDefault();
              if (!userInput.trim()) return;
              sendMessage({ text: userInput });
              setUserInput("");
            }}
            className="relative flex items-center"
          >
            <input
              suppressHydrationWarning
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Ask me what to wear..."
              className="w-full bg-slate-50 border border-slate-200 rounded-full py-4 pl-6 pr-14 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-inner text-slate-700"
              disabled={isLoading}
            />
            <button
              type="submit"
              suppressHydrationWarning
              disabled={isLoading || !userInput.trim()}
              className="absolute right-2 p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <p className="text-center text-xs text-slate-400 mt-3">AURA uses advanced AI and can make mistakes.</p>
        </div>
      </div>

      {/* RIGHT PANEL: Outfit Viewer */}
      <div className="w-1/2 flex flex-col bg-[#F8F9FB] relative overflow-y-auto p-8">
        {wardrobeEmptyNotice && !hasOutfit && (
          <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-2xl p-4">
            Your digital closet is empty — upload a few clothing items in{" "}
            <button onClick={() => router.push("/closet")} className="underline font-semibold">
              My Closet
            </button>{" "}
            so AURA can start recommending real outfits.
          </div>
        )}

        {!hasOutfit ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
            <div className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-full flex items-center justify-center mb-6">
              <Sparkles className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-600 mb-2">Your Look Awaits</h2>
            <p className="text-slate-500 max-w-sm">
              Tell me where you're going or what mood you're in, and I'll generate a real outfit from your closet right here.
            </p>
          </div>
        ) : (
          <div className="w-full flex flex-col gap-6 animate-in fade-in zoom-in duration-500">
            {/* Header row */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Your Generated Look</h1>
                {occasion && (
                  <p className="text-slate-500 mt-1 text-sm">
                    Curated for: <span className="font-medium text-indigo-600">"{occasion}"</span>
                  </p>
                )}
              </div>
              <button
                onClick={() => setViewMode(viewMode === "grid" ? "paperdoll" : "grid")}
                className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 hover:text-indigo-600 hover:border-indigo-300 transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {viewMode === "grid" ? "Paper Doll View" : "Grid View"}
              </button>
            </div>

            {/* Weather + confidence row */}
            <div className="grid grid-cols-2 gap-4">
              {weather && (
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conditions</span>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="w-4 h-4 text-indigo-500" />
                      <span className="font-semibold text-slate-900 text-sm">{weather.city}</span>
                    </div>
                    <div className="text-xl font-bold text-slate-800 mt-1">
                      {weather.temp}°C <span className="text-sm font-normal text-slate-500">{weather.condition}</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 shrink-0">
                    <CloudRain className="w-5 h-5" />
                  </div>
                </div>
              )}
              {confidence && (
                <div className="bg-slate-900 rounded-2xl p-4 flex flex-col justify-between text-slate-300">
                  <span className="text-[11px] uppercase tracking-widest font-bold opacity-60">Confidence</span>
                  <span className="text-2xl font-bold text-white mt-1">{confidence.percentage}%</span>
                </div>
              )}
            </div>

            {shoppingTip && (
              <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 to-indigo-700 p-5 rounded-2xl text-white shadow-lg">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2 text-indigo-100">
                    <ShoppingBag className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Stylist Tip</span>
                  </div>
                  <p className="font-medium leading-snug text-sm">{shoppingTip}</p>
                </div>
              </div>
            )}

            {actionError && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                {actionError}
              </div>
            )}

            {/* Outfit visual */}
            {viewMode === "paperdoll" ? (
              <div className={`relative rounded-3xl overflow-hidden ${getWeatherBackground()} transition-all duration-700`}>
                <div className="flex items-center justify-center min-h-[480px] p-8">
                  <div className="relative flex flex-col items-center" style={{ width: "280px" }}>
                    <div className="relative w-full flex justify-center z-10" style={{ height: "220px" }}>
                      {activeOutfit?.outerwear && (
                        <img src={activeOutfit.outerwear.image_url} alt="Outerwear" className="absolute inset-0 w-full h-full object-contain scale-110 drop-shadow-xl z-20" />
                      )}
                      {activeOutfit?.tops && (
                        <img src={activeOutfit.tops.image_url} alt="Top" className="absolute inset-0 w-full h-full object-contain drop-shadow-md z-10" />
                      )}
                    </div>
                    <div className="relative w-full flex justify-center z-0" style={{ height: "220px", marginTop: "-10px" }}>
                      {activeOutfit?.bottoms && (
                        <img src={activeOutfit.bottoms.image_url} alt="Bottoms" className="absolute inset-0 w-full h-full object-contain drop-shadow-md" />
                      )}
                    </div>
                    <div className="relative w-full flex justify-center z-20" style={{ height: "120px", marginTop: "-15px" }}>
                      {activeOutfit?.shoes && (
                        <img src={activeOutfit.shoes.image_url} alt="Footwear" className="absolute inset-0 w-full h-full object-contain drop-shadow-md" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {activeOutfit?.outerwear && (
                  <ItemCard item={activeOutfit.outerwear} label="Outerwear" onSwap={handleSwapItem} slotKey="outerwear" isSwapping={swappingSlot === "outerwear"} />
                )}
                {activeOutfit?.tops && (
                  <ItemCard item={activeOutfit.tops} label="Top" onSwap={handleSwapItem} slotKey="tops" isSwapping={swappingSlot === "tops"} />
                )}
                {activeOutfit?.bottoms && (
                  <ItemCard item={activeOutfit.bottoms} label="Bottoms" onSwap={handleSwapItem} slotKey="bottoms" isSwapping={swappingSlot === "bottoms"} />
                )}
                {activeOutfit?.shoes && (
                  <ItemCard item={activeOutfit.shoes} label="Footwear" onSwap={handleSwapItem} slotKey="shoes" isSwapping={swappingSlot === "shoes"} />
                )}
              </div>
            )}

            {/* Action row */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleFeedback(true)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-colors ${
                    feedbackState === "liked"
                      ? "bg-emerald-600 text-white shadow-md"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  {feedbackState === "liked" ? "Liked!" : "Like"}
                </button>
                <button
                  onClick={() => handleFeedback(false)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-colors ${
                    feedbackState === "disliked"
                      ? "bg-rose-600 text-white shadow-md"
                      : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                  }`}
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                  {feedbackState === "disliked" ? "Disliked!" : "Dislike"}
                </button>
              </div>

              <button
                onClick={handleSaveOutfit}
                disabled={isSaved}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all ${
                  isSaved
                    ? "bg-green-500 text-white shadow-md"
                    : "bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600"
                }`}
              >
                <Heart className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
                {isSaved ? "Saved!" : "Save Look"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const ItemCard = ({ item, label, onSwap, slotKey, isSwapping }: any) => {
  return (
    <div className="relative group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 aspect-square">
      <div className="absolute top-3 left-3 z-10">
        <span className="px-2.5 py-1 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-wider border border-slate-100">
          {label}
        </span>
      </div>

      <button
        onClick={() => onSwap(slotKey)}
        disabled={isSwapping}
        className="absolute top-3 right-3 z-10 p-2 bg-white/90 backdrop-blur-md rounded-full text-slate-600 hover:text-indigo-600 hover:bg-white transition-all border border-slate-100 hover:border-indigo-300 disabled:opacity-50"
      >
        {isSwapping ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
      </button>

      <div className="absolute inset-0 flex items-center justify-center p-6">
        <img
          src={item.image_url}
          alt={label}
          className={`w-full h-full object-contain drop-shadow-lg group-hover:scale-110 transition-transform duration-500 ${isSwapping ? "opacity-50" : ""}`}
        />
      </div>

      <div className="absolute inset-x-3 bottom-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
        <div className="bg-white/95 backdrop-blur-xl p-3 rounded-xl shadow-lg border border-slate-100 space-y-1.5">
          <h4 className="font-bold text-slate-900 text-sm truncate">{item.meta?.sub_category || label}</h4>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.meta?.hex_color || "#000" }}></span>
            {item.meta?.color} • {item.meta?.formality}
          </div>
        </div>
      </div>
    </div>
  );
};