"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Menu,
  X,
  Bell,
  MessageSquare,
  Film,
  LogOut,
  User,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSession, signOut } from "@/lib/auth-client";
import { resolveImage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useClickOutside } from "@/hooks/use-click-outside";
import { useUnreadCount } from "@/hooks/queries/use-notifications";
import { useUnreadDmCount } from "@/hooks/queries/use-messages";
import { MiniDmPanel } from "@/components/messages/mini-dm-panel";

const navLinks = [
  { href: "/movies", label: "Filmes" },
  { href: "/series", label: "Séries" },
  { href: "/lists", label: "Listas" },
  { href: "/clubs", label: "Clubs" },
  { href: "/discover", label: "Descobrir" },
];

export function Header() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const user = session?.user ?? null;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isDmPanelOpen, setIsDmPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const dmPanelRef = useRef<HTMLDivElement>(null);

  const { data: unreadCount = 0 } = useUnreadCount(user?.id);
  const { data: unreadDmCount = 0 } = useUnreadDmCount(user?.id);

  useClickOutside(menuRef, useCallback(() => setIsMenuOpen(false), []));
  useClickOutside(userMenuRef, useCallback(() => setIsUserMenuOpen(false), []));
  useClickOutside(dmPanelRef, useCallback(() => setIsDmPanelOpen(false), []));

  async function handleSignOut() {
    await signOut();
    toast.success("Saiu com sucesso");
    router.push("/");
    setIsUserMenuOpen(false);
  }

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) {
        router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        setSearchQuery("");
        setIsMenuOpen(false);
      }
    },
    [searchQuery, router],
  );

  const avatarSrc = user?.image || null;
  const displayName = user?.name || user?.email?.split("@")[0] || "User";
  const username = (user as { username?: string })?.username || null;

  return (
    <nav
      ref={menuRef}
      className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50"
    >
      <div className="container mx-auto flex items-center justify-between h-14 px-4">
        {/* Left Section: Logo & Links */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 group"
            aria-label="PixelReel Home"
          >
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center transition-transform group-hover:scale-105">
              <Film size={16} className="text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-foreground text-lg group-hover:text-primary/80 transition-colors">
              PixelReel
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-5">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors font-body"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right Section: Search, Notifications & Profile */}
        <div className="flex items-center gap-3">
          <form
            onSubmit={handleSearch}
            className="hidden sm:flex items-center bg-secondary/60 rounded-lg px-3 py-1.5 gap-2 border border-border/50 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all"
          >
            <Search size={14} className="text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar..."
              className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-32 xl:w-48 font-body transition-all"
            />
          </form>

          {user && (
            <div ref={dmPanelRef} className="relative hidden sm:block">
              <button
                onClick={() => setIsDmPanelOpen((v) => !v)}
                className={cn(
                  "relative inline-flex items-center justify-center h-9 w-9 rounded-lg transition-colors",
                  isDmPanelOpen
                    ? "text-foreground bg-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
                aria-label="Mensagens"
              >
                <MessageSquare size={18} />
                {unreadDmCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-orange-500 text-[9px] font-bold text-white px-1 leading-none">
                    {unreadDmCount > 99 ? "99+" : unreadDmCount}
                  </span>
                )}
              </button>
              <MiniDmPanel
                isOpen={isDmPanelOpen}
                onClose={() => setIsDmPanelOpen(false)}
              />
            </div>
          )}

          {user && (
            <Link
              href="/notifications"
              className="relative inline-flex items-center justify-center h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors hidden sm:inline-flex"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-purple-500 text-[9px] font-bold text-white px-1 leading-none">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          )}

          {isPending ? (
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen((v) => !v)}
                className="w-8 h-8 rounded-full bg-primary flex items-center justify-center border-2 border-transparent hover:border-border transition-all focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="User menu"
              >
                {avatarSrc ? (
                  <Image
                    src={resolveImage(avatarSrc)!}
                    alt={displayName}
                    width={32}
                    height={32}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-primary-foreground font-display font-bold text-sm">
                    {displayName[0]?.toUpperCase()}
                  </span>
                )}
              </button>

              {/* Dropdown Menu Desktop */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-background border border-border/50 rounded-xl shadow-xl py-1.5 z-50">
                  <div className="px-3 py-2 border-b border-border/50">
                    <p className="text-sm font-medium text-foreground truncate">
                      {displayName}
                    </p>
                    {username && (
                      <p className="text-xs text-muted-foreground truncate">
                        @{username}
                      </p>
                    )}
                  </div>
                  <Link
                    href={username ? `/profile/${username}` : "/profile"}
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    Perfil
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Configurações
                  </Link>
                  <div className="border-t border-border/50 mt-1 pt-1">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:text-destructive/80 hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sair
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link href="/sign-in" className="hidden md:inline-flex">
              <Button size="sm" className="font-medium">
                Entrar
              </Button>
            </Link>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-muted-foreground"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={cn(
          "md:hidden overflow-hidden transition-all duration-300 ease-in-out bg-background/95 backdrop-blur-md",
          isMenuOpen ? "max-h-[400px] border-b border-border/50" : "max-h-0",
        )}
      >
        <nav className="container mx-auto px-4 py-4 flex flex-col space-y-2">
          {/* Mobile Search */}
          <form onSubmit={handleSearch} className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar..."
              className="w-full bg-secondary/60 border border-border/50 rounded-lg py-2 pl-9 pr-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </form>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMenuOpen(false)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground py-2 font-body"
            >
              {link.label}
            </Link>
          ))}
          <div className="border-t border-border/50 my-2 pt-2 flex flex-col">
            {user ? (
              <>
                <Link
                  href={username ? `/profile/${username}` : "/profile"}
                  onClick={() => setIsMenuOpen(false)}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground py-2"
                >
                  Perfil
                </Link>
                <Link
                  href="/messages"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground py-2"
                >
                  Mensagens
                  {unreadDmCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-orange-500 text-[10px] font-bold text-white px-1">
                      {unreadDmCount > 99 ? "99+" : unreadDmCount}
                    </span>
                  )}
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-left text-sm font-medium text-destructive hover:text-destructive/80 py-2"
                >
                  Sair
                </button>
              </>
            ) : (
              <Link
                href="/sign-in"
                onClick={() => setIsMenuOpen(false)}
                className="text-sm font-medium text-primary hover:text-primary/80 py-2"
              >
                Entrar
              </Link>
            )}
          </div>
        </nav>
      </div>
    </nav>
  );
}
