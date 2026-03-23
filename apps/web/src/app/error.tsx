"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-red-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-orange-600/10 blur-[120px] rounded-full animate-pulse delay-700" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/50 to-zinc-950" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <div
          className="rounded-[2.5rem] border border-white/10 p-12 text-center relative overflow-hidden shadow-2xl"
          style={{
            background: "rgba(24,24,27,0.4)",
            backdropFilter: "blur(24px)",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
          }}
        >
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-red-500/10 border border-red-500/20 mb-8 relative group">
            <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <AlertTriangle className="h-12 w-12 text-red-400 relative z-10" />
          </div>

          <div className="space-y-4 mb-10">
            <h2 className="text-2xl font-black text-zinc-100 uppercase tracking-widest">
              Algo deu errado
            </h2>
            <p className="text-zinc-500 text-sm font-medium leading-relaxed max-w-xs mx-auto">
              Ocorreu um erro inesperado. Tente novamente ou volte para a página inicial.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={reset}
              className="w-full sm:w-auto h-12 px-8 rounded-2xl flex items-center justify-center gap-2.5 text-[11px] font-black uppercase tracking-[0.2em] border border-white/10 text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 transition-all group active:scale-95"
            >
              <RefreshCw className="h-4 w-4 transition-transform group-hover:rotate-180 duration-500" />
              Tentar novamente
            </button>
            <Link
              href="/"
              className="w-full sm:w-auto h-12 px-8 rounded-2xl flex items-center justify-center gap-2.5 text-[11px] font-black uppercase tracking-[0.2em] bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-500/20 hover:scale-105 active:scale-95 transition-all group"
            >
              <Home className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
              Início
            </Link>
          </div>

          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,#fff_2px,#fff_3px)]" />
        </div>
      </div>
    </div>
  );
}
