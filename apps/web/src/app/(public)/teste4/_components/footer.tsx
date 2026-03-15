"use client";

import Link from "next/link";
import { Film, Tv, Heart, Users, Zap } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-black/50 border-t border-white/10 backdrop-blur-md mt-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo e Descrição */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center mb-4">
              <span className="text-2xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                PixelReel
              </span>
            </Link>
            <p className="text-sm text-zinc-400 mb-4">
              Sua plataforma definitiva para descobrir, avaliar e compartilhar
              filmes e séries.
            </p>
            <div className="flex space-x-4">
              <div className="flex items-center text-xs text-zinc-500">
                <Users className="h-4 w-4 mr-1" />
                <span>50k+ usuários</span>
              </div>
              <div className="flex items-center text-xs text-zinc-500">
                <Film className="h-4 w-4 mr-1" />
                <span>100k+ filmes</span>
              </div>
            </div>
          </div>

          {/* Navegação */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Explorar</h3>
            <ul className="space-y-2">
              {[
                { href: "#", label: "Filmes", icon: Film },
                { href: "#", label: "Séries", icon: Tv },
                { href: "#", label: "Listas", icon: Heart },
                { href: "#", label: "Descobrir", icon: Zap },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center"
                  >
                    <link.icon className="h-3 w-3 mr-2" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Comunidade */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">
              Comunidade
            </h3>
            <ul className="space-y-2">
              {[
                { href: "#", label: "Críticas" },
                { href: "#", label: "Diários" },
                { href: "#", label: "Desafios" },
                { href: "#", label: "Rankings" },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Suporte */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Suporte</h3>
            <ul className="space-y-2">
              {[
                { href: "#", label: "Central de Ajuda" },
                { href: "#", label: "Contato" },
                { href: "#", label: "Sobre Nós" },
                { href: "#", label: "API" },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-zinc-400 mb-4 md:mb-0">
            © 2024 PixelReel. Todos os direitos reservados.
          </div>
          <div className="flex space-x-6">
            <Link
              href="#"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Privacidade
            </Link>
            <Link
              href="#"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Termos
            </Link>
            <Link
              href="#"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
