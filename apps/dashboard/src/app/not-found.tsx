import Link from "next/link";
import { Home, Ghost } from "lucide-react";

export default function DashboardNotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center space-y-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-purple-500/10 border border-purple-500/20 mx-auto">
          <Ghost className="h-10 w-10 text-purple-400" />
        </div>

        <div className="space-y-3">
          <h1 className="text-5xl font-black text-white tracking-tighter">404</h1>
          <h2 className="text-lg font-bold text-zinc-300 uppercase tracking-widest">
            Página não encontrada
          </h2>
          <p className="text-zinc-500 text-sm">
            A página que você procura não existe ou foi movida.
          </p>
        </div>

        <Link
          href="/overview"
          className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-colors"
        >
          <Home className="h-4 w-4" />
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
