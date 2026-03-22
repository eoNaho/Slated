"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/lib/auth-client";

export function CTABanner() {
  const [mounted, setMounted] = useState(false);
  const { data: session, isPending } = useSession();

  useEffect(() => setMounted(true), []);

  // Render nothing until mounted — avoids SSR/client hydration mismatch
  if (!mounted || isPending || session?.user) return null;

  return (
    <section className="container mx-auto px-6 mb-20 mt-12">
      <div className="relative rounded-3xl overflow-hidden bg-zinc-900 border border-white/10">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=2070&auto=format&fit=crop"
            className="w-full h-full object-cover opacity-20 mix-blend-overlay"
            loading="lazy"
            alt=""
            width={2070}
            height={1380}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-900/80 to-transparent" />
        </div>

        <div className="relative z-10 px-8 py-20 md:px-16 md:flex items-center justify-between gap-12">
          <div className="max-w-xl space-y-6">
            <h2 className="text-4xl font-black text-white leading-tight">
              Seu diário de cinema, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                reimaginado.
              </span>
            </h2>
            <p className="text-zinc-400 text-lg">
              Registre o que você assiste, salve o que quer ver e conte para os
              amigos o que vale a pena.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full border-2 border-zinc-900 bg-zinc-800 overflow-hidden"
                  >
                    <Image
                      src={`https://i.pravatar.cc/100?img=${i + 10}`}
                      className="w-full h-full object-cover"
                      alt=""
                      width={100}
                      height={100}
                    />
                  </div>
                ))}
                <div className="w-10 h-10 rounded-full border-2 border-zinc-900 bg-zinc-800 flex items-center justify-center text-xs font-bold text-white">
                  +2k
                </div>
              </div>
              <div className="flex items-center text-sm text-zinc-400">
                Entraram essa semana
              </div>
            </div>
          </div>

          <div className="mt-8 md:mt-0 flex-shrink-0">
            <Link
              href="/register"
              className="inline-flex items-center justify-center bg-white text-black hover:bg-zinc-200 font-bold px-8 py-4 rounded-full text-lg shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-colors"
            >
              Criar conta grátis
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
