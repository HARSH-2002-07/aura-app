"use client";

import React, { useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { WardrobeItem } from "@/types";
import { Send, Sparkles, User as UserIcon, Bot, ArrowLeft, ThumbsUp, ThumbsDown } from "lucide-react";
import { useRouter } from "next/navigation";

interface StylistClientProps {
  user: any;
  wardrobe: WardrobeItem[];
  profile?: any;
}

export default function StylistClient({ user, wardrobe, profile }: StylistClientProps) {
  const router = useRouter();
  const [userInput, setUserInput] = React.useState("");
  const [feedbackState, setFeedbackState] = React.useState<"none" | "liked" | "disliked">("none");
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
  const isThinking = isLoading || status === "submitted" || status === "streaming";

  const handleSendFeedback = async (liked: boolean) => {
    if (!generatedOutfit) return;
    const itemIds = [
      generatedOutfit.outerwear?.id,
      generatedOutfit.tops?.id,
      generatedOutfit.bottoms?.id,
      generatedOutfit.shoes?.id,
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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Extract all tool calls from any message (V4 & V5 AI SDK formats)
  const getToolCallsFromMessage = (m: any) => {
    const list: any[] = [];
    if (m.toolInvocations && Array.isArray(m.toolInvocations)) {
      list.push(...m.toolInvocations);
    }
    if (m.parts && Array.isArray(m.parts)) {
      for (const p of m.parts) {
        if (!p) continue;
        if (p.toolInvocation) list.push(p.toolInvocation);
        if (p.toolCall) list.push(p.toolCall);
        if (p.toolName || (p.type && String(p.type).startsWith("tool"))) {
          list.push(p);
        }
      }
    }
    return list;
  };

  const isOutfitTool = (t: any) => {
    if (!t) return false;
    const name = t.toolName || t.name || (t.type && String(t.type).replace("tool-", ""));
    return name === "generate_outfit" || String(t.type).includes("generate_outfit") || t.toolInvocation?.toolName === "generate_outfit";
  };

  // Find the latest generate_outfit tool call to display on the right
  const latestOutfitCall = [...messages]
    .reverse()
    .flatMap(getToolCallsFromMessage)
    .find(isOutfitTool);

  let generatedOutfit: {
    tops?: WardrobeItem;
    bottoms?: WardrobeItem;
    outerwear?: WardrobeItem;
    shoes?: WardrobeItem;
    reasoning?: string;
  } | null = null;

  const extractId = (val: any) => {
    if (!val) return undefined;
    if (typeof val === "string") return val;
    if (typeof val === "object") return val.id || val.item_id || val.tops_id || val.bottoms_id || val.footwear_id;
    return String(val);
  };

  const findItem = (rawId: any, categoryFilter?: string) => {
    const id = extractId(rawId);
    if (!id) return undefined;
    const target = String(id).trim().toLowerCase();

    // 1. Exact ID match
    let match = wardrobe.find((item) => String(item.id).trim().toLowerCase() === target);
    if (match) return match;

    // 2. Partial/Truncated ID match
    match = wardrobe.find((item) => {
      const itemId = String(item.id).trim().toLowerCase();
      return (target.length >= 4 && itemId.includes(target)) || (itemId.length >= 4 && target.includes(itemId));
    });
    if (match) return match;

    // 3. Sub-category, Color, Title, or Category keyword match
    match = wardrobe.find((item) => {
      const subCat = String(item.meta?.sub_category || "").toLowerCase();
      const color = String(item.meta?.color || "").toLowerCase();
      const cat = String(item.meta?.category || "").toLowerCase();
      
      return (
        (target.length >= 3 && (subCat.includes(target) || target.includes(subCat))) ||
        (target.length >= 3 && (color.includes(target) || target.includes(color))) ||
        (target.length >= 3 && (cat.includes(target) || target.includes(cat)))
      );
    });
    if (match) return match;

    // 4. Category fallback
    if (categoryFilter) {
      match = wardrobe.find((item) => String(item.meta?.category || "").toLowerCase() === categoryFilter.toLowerCase());
    }

    return match;
  };

  if (latestOutfitCall) {
    const args =
      latestOutfitCall.args ||
      latestOutfitCall.input ||
      latestOutfitCall.toolInvocation?.args ||
      latestOutfitCall.toolInvocation?.input ||
      (latestOutfitCall as any);

    const tops = findItem(args.tops_id || args.top || args.top_id || args.tops, "tops") || wardrobe.find(i => i.meta?.category?.toLowerCase() === "tops");
    const bottoms = findItem(args.bottoms_id || args.bottom || args.bottom_id || args.bottoms, "bottoms") || wardrobe.find(i => i.meta?.category?.toLowerCase() === "bottoms");
    const outerwear = findItem(args.outerwear_id || args.outerwear, "outerwear");
    const shoes = findItem(args.footwear_id || args.footwear || args.shoes || args.shoe_id || args.shoes_id, "footwear") || wardrobe.find(i => i.meta?.category?.toLowerCase() === "footwear");

    if (tops || bottoms || outerwear || shoes || args.reasoning) {
      generatedOutfit = { tops, bottoms, outerwear, shoes, reasoning: args.reasoning || args.explanation };
    }
  }

  // Fallback: Check if any message text contains raw JSON of an outfit recommendation
  if (!generatedOutfit) {
    for (const m of [...messages].reverse()) {
      const textParts = m.parts?.filter((p: any) => p.type === 'text') || [];
      const content = (m as any).content || textParts.map((p: any) => p.text).join("");
      if (content && content.includes('{') && content.includes('}')) {
        try {
          const match = content.match(/\{[\s\S]*?\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            const args = parsed.parameters || parsed.args || parsed;
            const tops = findItem(args.tops_id || args.top || args.top_id, "tops") || wardrobe.find(i => i.meta?.category?.toLowerCase() === "tops");
            const bottoms = findItem(args.bottoms_id || args.bottom || args.bottom_id, "bottoms") || wardrobe.find(i => i.meta?.category?.toLowerCase() === "bottoms");
            const outerwear = findItem(args.outerwear_id || args.outerwear, "outerwear");
            const shoes = findItem(args.footwear_id || args.footwear || args.shoes || args.shoe_id, "footwear") || wardrobe.find(i => i.meta?.category?.toLowerCase() === "footwear");

            if (tops || bottoms || outerwear || shoes) {
              generatedOutfit = { tops, bottoms, outerwear, shoes, reasoning: args.reasoning || "Curated based on your style request." };
              break;
            }
          }
        } catch (e) {
          // ignore JSON parse errors
        }
      }
    }
  }

  const hasAnyOutfitItem = Boolean(generatedOutfit && (generatedOutfit.tops || generatedOutfit.bottoms || generatedOutfit.outerwear || generatedOutfit.shoes));

  return (
    <div className="flex h-screen bg-[#F8F9FB] font-sans">
      {/* LEFT PANEL: Chat Interface */}
      <div className="w-1/2 flex flex-col border-r border-slate-200 bg-white relative z-10 shadow-xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push("/")}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
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

          {/* Active Style Profile Badges */}
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

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((m: any) => {
            if (m.role === "system") return null;
            
            // Extract text from parts (V5) or content (V4)
            const textParts = m.parts?.filter((p: any) => p.type === 'text') || [];
            let textContent = (m as any).content || textParts.map((p: any) => p.text).join("");

            // Extract tool call reasoning if textContent is empty
            const toolPart: any = (m.parts || []).find((p: any) => p.type && String(p.type).startsWith("tool"));
            const toolArgs = toolPart?.input || toolPart?.args || (toolPart as any)?.toolInvocation?.args;

            if (!textContent || textContent.trim() === "") {
              if (toolArgs?.reasoning) {
                textContent = toolArgs.reasoning;
              } else if (toolPart) {
                textContent = "✨ I've curated a custom outfit tailored specifically to your style profile and request! Check out the styling panel on the right.";
              }
            }

            // Clean up unwanted meta commentary from model
            if (
              textContent.includes("No function call is") || 
              textContent.includes("No function call needed") ||
              textContent.includes("No tool call")
            ) {
              textContent = "Hello! I'm AURA, your personal AI fashion stylist. What outfit or occasion can I help you style today?";
            }

            // Strip out raw JSON strings from text so the user NEVER sees raw code in chat!
            if (textContent.includes('{"name":') || textContent.includes('"top_id"') || textContent.includes('"tops_id"')) {
              textContent = textContent.replace(/\{[\s\S]*?\}/g, "").trim();
              if (!textContent) {
                textContent = "✨ I've curated a custom outfit recommendation for you! Check out the styling panel on the right.";
              }
            }

            if (!textContent || textContent.trim() === "") return null;

            const isUser = m.role === "user";

            return (
              <div key={m.id} className={`flex gap-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? "bg-slate-900" : "bg-indigo-100"}`}>
                  {isUser ? <UserIcon className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-indigo-600" />}
                </div>
                <div className={`max-w-[80%] rounded-2xl p-4 ${
                  isUser 
                    ? "bg-slate-900 text-white rounded-tr-sm shadow-md" 
                    : "bg-slate-100 text-slate-800 rounded-tl-sm border border-slate-200"
                }`}>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{textContent}</p>
                </div>
              </div>
            );
          })}
          {(isThinking || (messages.length > 0 && messages[messages.length - 1].role === "user")) && (
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
                  AURA is analyzing your wardrobe, weather & style profile...
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
                ⚠️ Connection interrupted. Please ensure Next.js dev server is running and try sending again.
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
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

      {/* RIGHT PANEL: Paper Doll Outfit Viewer */}
      <div className="w-1/2 flex flex-col items-center justify-start bg-[#F8F9FB] relative overflow-y-auto p-8 h-full">
        {!hasAnyOutfitItem || !generatedOutfit ? (
          <div className="text-center opacity-50 flex flex-col items-center">
            <div className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-full flex items-center justify-center mb-6">
              <Sparkles className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-600 mb-2">Your Look Awaits</h2>
            <p className="text-slate-500 max-w-sm">Tell me where you're going or what mood you're in, and I'll generate a custom outfit right here.</p>
          </div>
        ) : (
          <div className="w-full max-w-md animate-in zoom-in duration-500 fade-in flex flex-col h-full">
            <div className="flex-1 bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl overflow-hidden relative shadow-inner border border-slate-200 flex flex-col items-center justify-center p-8">
              
              {/* Active Outfit Badges */}
              <div className="absolute top-4 left-4 right-4 flex flex-wrap gap-2 justify-center z-30">
                {generatedOutfit.outerwear && (
                  <span className="px-3 py-1 bg-white/80 backdrop-blur-md rounded-full text-[11px] font-semibold text-slate-700 border border-slate-200 shadow-sm">
                    🧥 {generatedOutfit.outerwear.meta.sub_category}
                  </span>
                )}
                {generatedOutfit.tops && (
                  <span className="px-3 py-1 bg-white/80 backdrop-blur-md rounded-full text-[11px] font-semibold text-slate-700 border border-slate-200 shadow-sm">
                    👕 {generatedOutfit.tops.meta.sub_category}
                  </span>
                )}
                {generatedOutfit.bottoms && (
                  <span className="px-3 py-1 bg-white/80 backdrop-blur-md rounded-full text-[11px] font-semibold text-slate-700 border border-slate-200 shadow-sm">
                    👖 {generatedOutfit.bottoms.meta.sub_category}
                  </span>
                )}
                {generatedOutfit.shoes && (
                  <span className="px-3 py-1 bg-white/80 backdrop-blur-md rounded-full text-[11px] font-semibold text-slate-700 border border-slate-200 shadow-sm">
                    👞 {generatedOutfit.shoes.meta.sub_category}
                  </span>
                )}
              </div>

              {/* Paper Doll Render */}
              <div className="relative flex flex-col items-center w-[320px]">
                {/* Tops & Outerwear */}
                <div className="relative w-full flex justify-center z-10" style={{ height: "280px" }}>
                  {generatedOutfit.outerwear && (
                    <img src={generatedOutfit.outerwear.image_url} alt="Outerwear" className="absolute inset-0 w-full h-full object-contain scale-110 drop-shadow-xl z-20" />
                  )}
                  {generatedOutfit.tops && (
                    <img src={generatedOutfit.tops.image_url} alt="Top" className="absolute inset-0 w-full h-full object-contain drop-shadow-md z-10" />
                  )}
                </div>
                {/* Bottoms */}
                <div className="relative w-full flex justify-center z-0" style={{ height: "280px", marginTop: "-10px" }}>
                  {generatedOutfit.bottoms && (
                    <img src={generatedOutfit.bottoms.image_url} alt="Bottoms" className="absolute inset-0 w-full h-full object-contain drop-shadow-md" />
                  )}
                </div>
                {/* Shoes */}
                <div className="relative w-full flex justify-center z-20" style={{ height: "140px", marginTop: "-20px" }}>
                  {generatedOutfit.shoes && (
                    <img src={generatedOutfit.shoes.image_url} alt="Footwear" className="absolute inset-0 w-full h-full object-contain drop-shadow-md" />
                  )}
                </div>
              </div>

            </div>

            {/* Stylist Reasoning Card & Feedback */}
            {generatedOutfit.reasoning && (
              <div className="mt-6 bg-white p-6 rounded-2xl shadow-lg border border-slate-100 flex flex-col gap-4 animate-in slide-in-from-bottom-4">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-1">Stylist Note</h3>
                    <p className="text-slate-700 font-medium leading-relaxed text-sm">
                      {generatedOutfit.reasoning}
                    </p>
                  </div>
                </div>

                {/* Feedback Action Buttons */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-2">
                  <span className="text-xs font-semibold text-slate-500">Rate this recommendation:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSendFeedback(true)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                        feedbackState === "liked"
                          ? "bg-emerald-600 text-white shadow-md"
                          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      {feedbackState === "liked" ? "Liked!" : "Like"}
                    </button>
                    <button
                      onClick={() => handleSendFeedback(false)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                        feedbackState === "disliked"
                          ? "bg-rose-600 text-white shadow-md"
                          : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                      }`}
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                      {feedbackState === "disliked" ? "Disliked!" : "Dislike"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
