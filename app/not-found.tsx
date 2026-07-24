import React from "react";
import Link from "next/link";
import { Sparkles, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl text-center shadow-2xl">
        <span className="text-6xl font-black text-indigo-400/80 block mb-2">404</span>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Page Not Found</h2>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          The style page or feature route you are looking for doesn't exist or has moved.
        </p>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-full transition-all shadow-md"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
