"use client";

import React, { useState } from "react";
import { WardrobeItem } from "@/types";
import { ThumbsUp, ThumbsDown, Trash2, Sparkles, Filter, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface FeedbackItem {
  id: string;
  user_id: string;
  item_ids: string[];
  liked: boolean;
  created_at: string;
}

interface FeedbackHistoryClientProps {
  user: any;
  initialFeedback: FeedbackItem[];
  wardrobe: WardrobeItem[];
}

export default function FeedbackHistoryClient({
  initialFeedback,
  wardrobe,
}: FeedbackHistoryClientProps) {
  const router = useRouter();
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>(initialFeedback);
  const [filter, setFilter] = useState<"all" | "liked" | "disliked">("all");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDeleteOne = async (id: string) => {
    setIsDeleting(id);
    try {
      const res = await fetch(`/api/feedback?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setFeedbackList((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete feedback:", err);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to clear your entire feedback history?")) return;
    setIsDeleting("all");
    try {
      const res = await fetch("/api/feedback", { method: "DELETE" });
      if (res.ok) {
        setFeedbackList([]);
      }
    } catch (err) {
      console.error("Failed to clear feedback history:", err);
    } finally {
      setIsDeleting(null);
    }
  };

  const filteredList = feedbackList.filter((item) => {
    if (filter === "liked") return item.liked;
    if (filter === "disliked") return !item.liked;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/stylist"
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Feedback & Style Memory
                <span className="text-xs bg-indigo-100 text-indigo-700 font-semibold px-2.5 py-0.5 rounded-full">
                  Phase 5
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Outfits you like or dislike shape AURA's future personalized recommendations.
              </p>
            </div>
          </div>

          {feedbackList.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={isDeleting === "all"}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear History
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 mt-8">
        {/* Filters */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === "all"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              All ({feedbackList.length})
            </button>
            <button
              onClick={() => setFilter("liked")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === "liked"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              Liked ({feedbackList.filter((f) => f.liked).length})
            </button>
            <button
              onClick={() => setFilter("disliked")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === "disliked"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <ThumbsDown className="w-3.5 h-3.5" />
              Disliked ({feedbackList.filter((f) => !f.liked).length})
            </button>
          </div>

          <p className="text-xs text-slate-500">
            Showing {filteredList.length} feedback record{filteredList.length === 1 ? "" : "s"}
          </p>
        </div>

        {/* Feedback List */}
        {filteredList.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center max-w-md mx-auto mt-12">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-indigo-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">No feedback entries yet</h3>
            <p className="text-sm text-slate-500 mb-6">
              Rate outfit recommendations in the AURA Stylist chat using 👍 or 👎 to teach AURA your style preferences.
            </p>
            <Link
              href="/stylist"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-full transition-colors shadow-md"
            >
              Go to AURA Stylist
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredList.map((fb) => {
              const matchedItems = wardrobe.filter((i) => fb.item_ids.includes(i.id));

              return (
                <div
                  key={fb.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative flex flex-col justify-between"
                >
                  <div>
                    {/* Badge & Date */}
                    <div className="flex items-center justify-between mb-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          fb.liked
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-rose-100 text-rose-800 border border-rose-200"
                        }`}
                      >
                        {fb.liked ? (
                          <>
                            <ThumbsUp className="w-3.5 h-3.5" /> Liked
                          </>
                        ) : (
                          <>
                            <ThumbsDown className="w-3.5 h-3.5" /> Disliked
                          </>
                        )}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {new Date(fb.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* Wardrobe Items Thumbnails */}
                    <div className="grid grid-cols-3 gap-2 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {matchedItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-col items-center text-center group"
                        >
                          <div className="w-16 h-16 rounded-lg bg-white border border-slate-200 overflow-hidden p-1 flex items-center justify-center shadow-2xs">
                            <img
                              src={item.image_url}
                              alt={item.meta.sub_category}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <span className="text-[10px] font-semibold text-slate-600 mt-1 truncate max-w-full">
                            {item.meta.sub_category}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-2">
                    <span className="text-[11px] text-slate-500 font-medium">
                      {matchedItems.length} item{matchedItems.length === 1 ? "" : "s"}
                    </span>
                    <button
                      onClick={() => handleDeleteOne(fb.id)}
                      disabled={isDeleting === fb.id}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
