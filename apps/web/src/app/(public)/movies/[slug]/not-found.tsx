import Link from "next/link";
import { Home, Film } from "lucide-react";

export default function MovieNotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/50 to-zinc-950" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <div
          className="rounded-[2.5rem] border border-white/10 p-12 text-center relative overflow-hidden shadow-2xl"
          style={{
            background: "rgba(24,24,27,0.4)",
            backdropFilter: "blur(24px)",
          }}
        >
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-purple-500/10 border border-purple-500/20 mb-8">
            <Film className="h-12 w-12 text-purple-400" />
          </div>

          <div className="space-y-4 mb-10">
            <h2 className="text-2xl font-black text-zinc-100 uppercase tracking-widest">
              Filme não encontrado
            </h2>
            <p className="text-zinc-500 text-sm font-medium leading-relaxed max-w-xs mx-auto">
              Este filme não existe no catálogo ou foi removido.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/movies"
              className="inline-flex items-center justify-center gap-2.5 h-12 px-8 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] border border-white/10 text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 transition-all active:scale-95"
            >
              Ver filmes
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2.5 h-12 px-8 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-500/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Home className="h-4 w-4" />
              Início
            </Link>
          </div>

          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,#fff_2px,#fff_3px)]" />
        </div>
      </div>
    </div>
  );
}
