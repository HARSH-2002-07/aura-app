"use client";

import React, { useEffect } from "react";
import { Sparkles, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error Boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl text-center shadow-2xl">
        <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-400/30">
          <Sparkles className="w-8 h-8 text-indigo-400" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Something went wrong</h2>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          {error?.message || "An unexpected error occurred. Don't worry, your style data is safe."}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-full transition-all flex items-center justify-center gap-2 shadow-md"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Try Again
          </button>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-full transition-all flex items-center justify-center gap-2 border border-white/10"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
