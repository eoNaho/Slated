"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, ArrowLeft, Ghost, Search } from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Cinematic Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse delay-700" />
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/50 to-zinc-950" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Glassmorphism Card */}
        <div
          className="rounded-[2.5rem] border border-white/10 p-12 text-center relative overflow-hidden shadow-2xl"
          style={{
            background: "rgba(24,24,27,0.4)",
            backdropFilter: "blur(24px)",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
          }}
        >
          {/* Animated Ghost/Icon */}
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-purple-500/10 border border-purple-500/20 mb-8 relative group">
            <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <Ghost className="h-12 w-12 text-purple-400 relative z-10 animate-bounce" />
          </div>

          <h1
            className="text-7xl font-black text-white mb-4 tracking-tighter"
            style={{ textShadow: "0 10px 40px rgba(0,0,0,0.5)" }}
          >
            404
          </h1>
          
          <div className="space-y-4 mb-10">
            <h2 className="text-2xl font-black text-zinc-100 uppercase tracking-widest">
              Lost in the Reel
            </h2>
            <p className="text-zinc-500 text-sm font-medium leading-relaxed max-w-xs mx-auto">
              The page you are looking for has been cut from the final edit or vanished into the void.
            </p>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => router.back()}
              className="w-full sm:w-auto h-12 px-8 rounded-2xl flex items-center justify-center gap-2.5 text-[11px] font-black uppercase tracking-[0.2em] border border-white/10 text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 transition-all group active:scale-95"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Go Back
            </button>
            <Link
              href="/"
              className="w-full sm:w-auto h-12 px-8 rounded-2xl flex items-center justify-center gap-2.5 text-[11px] font-black uppercase tracking-[0.2em] bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-500/20 hover:scale-105 active:scale-95 transition-all group"
            >
              <Home className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
              Return Home
            </Link>
          </div>

          {/* Footer Decoration */}
          <div className="mt-12 pt-8 border-t border-white/5">
            <div className="flex items-center justify-center gap-4 opacity-30 grayscale transition-all hover:opacity-60 hover:grayscale-0 cursor-default">
              <Search className="h-4 w-4 text-zinc-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
                PixelReel Explorer
              </span>
            </div>
          </div>
          
          {/* Micro scanlines */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,#fff_2px,#fff_3px)]" />
        </div>
      </div>
    </div>
  );
}
