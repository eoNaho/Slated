import Link from "next/link";
import { Film } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-zinc-950 selection:bg-purple-500/30 selection:text-purple-200 flex flex-col items-center justify-center px-4 py-16">
      {/* Background gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[128px]" />
      </div>
      <div className="relative z-10 w-full flex flex-col items-center">
      <Link href="/" className="flex items-center gap-2 mb-8 group">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-900/50 group-hover:scale-105 transition-transform">
          <Film className="w-5 h-5 text-white fill-white/20" />
        </div>
        <span className="text-2xl font-bold tracking-tight text-white group-hover:text-purple-300 transition-colors">
          PixelReel
        </span>
      </Link>

        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
