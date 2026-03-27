"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
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
  Bookmark,
  Tv,
  List,
  Users,
  Compass,
  Rss,
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
  { href: "/feed", label: "Feed", icon: Rss },
  { href: "/movies", label: "Movies", icon: Film },
  { href: "/series", label: "Series", icon: Tv },
  { href: "/lists", label: "Lists", icon: List },
  { href: "/clubs", label: "Clubs", icon: Users },
  { href: "/discover", label: "Discover", icon: Compass },
];


export function Header() {
  const router = useRouter();
  const pathname = usePathname();
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
    toast.success("Signed out successfully");
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

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  const avatarSrc = user?.image || null;
  const displayName = user?.name || user?.email?.split("@")[0] || "User";
  const username = (user as { username?: string })?.username || null;

  return (
    <nav
      ref={menuRef}
      className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50"
    >
      <div className="container mx-auto flex items-center justify-between h-14 px-4">
        {/* Left: Logo + Desktop Nav */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 group"
            aria-label="PixelReel Home"
          >
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
              <Film size={16} className="text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-foreground text-lg group-hover:text-primary/80 transition-colors">
              PixelReel
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative text-sm px-3 py-1.5 rounded-lg transition-colors font-body",
                  isActive(item.href)
                    ? "text-foreground bg-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                )}
              >
                {item.label}
                {isActive(item.href) && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Right: Search, Actions, Avatar */}
        <div className="flex items-center gap-2">
          {/* Search — hidden on mobile */}
          <form
            onSubmit={handleSearch}
            className="hidden sm:flex items-center bg-secondary/60 rounded-lg px-3 py-1.5 gap-2 border border-border/50 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all"
          >
            <Search size={14} className="text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-32 xl:w-48 font-body"
            />
          </form>

          {/* DM Panel — sm+ only */}
          {user && (
            <div ref={dmPanelRef} className="relative hidden sm:block">
              <button
                onClick={() => setIsDmPanelOpen((v) => !v)}
                className={cn(
                  "relative inline-flex items-center justify-center h-9 w-9 rounded-lg transition-colors",
                  isDmPanelOpen
                    ? "text-foreground bg-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent",
                )}
                aria-label="Messages"
              >
                <MessageSquare size={18} />
                {unreadDmCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-orange-500 text-[9px] font-bold text-white px-0.5 leading-none">
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

          {/* Notifications — visible on all sizes when logged in */}
          {user && (
            <Link
              href="/notifications"
              className="relative inline-flex items-center justify-center h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-purple-500 text-[9px] font-bold text-white px-0.5 leading-none">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          )}

          {/* Avatar / Auth */}
          {isPending ? (
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen((v) => !v)}
                className={cn(
                  "w-8 h-8 rounded-full bg-primary flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
                  isUserMenuOpen
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    : "hover:ring-2 hover:ring-border hover:ring-offset-2 hover:ring-offset-background",
                )}
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

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-background border border-border/60 rounded-xl shadow-2xl shadow-black/40 py-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-100">
                  <div className="px-3 py-2.5 border-b border-border/50">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {displayName}
                    </p>
                    {username && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        @{username}
                      </p>
                    )}
                  </div>
                  <div className="py-1">
                    <Link
                      href={username ? `/profile/${username}` : "/profile"}
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </Link>
                    <Link
                      href="/saved"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      <Bookmark className="w-4 h-4" />
                      Saved
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                  </div>
                  <div className="border-t border-border/50 py-1">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link href="/sign-in" className="hidden md:inline-flex">
              <Button size="sm" className="font-medium">
                Sign in
              </Button>
            </Link>
          )}

          {/* Hamburger */}
          <button
            className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={cn(
          "md:hidden overflow-hidden transition-all duration-300 ease-in-out bg-background/98 backdrop-blur-md border-b border-border/50",
          isMenuOpen ? "max-h-[520px]" : "max-h-0",
        )}
      >
        <div className="container mx-auto px-4 py-4 flex flex-col gap-1">
          {/* Mobile Search */}
          <form onSubmit={handleSearch} className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search movies, series..."
              className="w-full bg-secondary/60 border border-border/50 rounded-lg py-2.5 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </form>

          {/* Nav Links */}
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive(link.href)
                    ? "text-foreground bg-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                )}
              >
                <Icon size={16} />
                {link.label}
              </Link>
            );
          })}

          {/* User Section */}
          <div className="border-t border-border/50 mt-2 pt-3 flex flex-col gap-1">
            {user ? (
              <>
                {/* User identity */}
                <div className="flex items-center gap-3 px-3 py-2 mb-1">
                  <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    {avatarSrc ? (
                      <Image
                        src={resolveImage(avatarSrc)!}
                        alt={displayName}
                        width={36}
                        height={36}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-primary-foreground font-bold text-sm">
                        {displayName[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {displayName}
                    </p>
                    {username && (
                      <p className="text-xs text-muted-foreground truncate">
                        @{username}
                      </p>
                    )}
                  </div>
                </div>

                <Link
                  href={username ? `/profile/${username}` : "/profile"}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                >
                  <User size={16} />
                  Profile
                </Link>
                <Link
                  href="/messages"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                >
                  <MessageSquare size={16} />
                  Messages
                  {unreadDmCount > 0 && (
                    <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-orange-500 text-[10px] font-bold text-white px-1">
                      {unreadDmCount > 99 ? "99+" : unreadDmCount}
                    </span>
                  )}
                </Link>
                <Link
                  href="/saved"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                >
                  <Bookmark size={16} />
                  Saved
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                >
                  <Settings size={16} />
                  Settings
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 px-1">
                <Link href="/sign-in" onClick={() => setIsMenuOpen(false)}>
                  <Button className="w-full" size="sm">
                    Sign in
                  </Button>
                </Link>
                <Link href="/sign-up" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="outline" className="w-full" size="sm">
                    Create account
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
