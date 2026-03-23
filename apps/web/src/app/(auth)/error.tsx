"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, LogIn } from "lucide-react";

export default function AuthError({
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
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 mx-auto">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-black text-zinc-100 uppercase tracking-widest">
            Erro de autenticação
          </h2>
          <p className="text-zinc-500 text-sm">
            Ocorreu um erro. Tente novamente.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full h-11 px-6 rounded-xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] border border-white/10 text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 transition-all active:scale-95"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </button>
          <Link
            href="/sign-in"
            className="w-full h-11 px-6 rounded-xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:scale-105 active:scale-95 transition-all"
          >
            <LogIn className="h-4 w-4" />
            Ir para login
          </Link>
        </div>
      </div>
    </div>
  );
}
