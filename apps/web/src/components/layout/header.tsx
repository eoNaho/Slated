"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Menu, X, Bell, Film, LogOut, User, Settings } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSession, signOut } from "@/lib/auth-client";

const navLinks = [
  { href: "/movies", label: "Films" },
  { href: "/series", label: "Series" },
  { href: "/lists", label: "Lists" },
  { href: "/discover", label: "Discover" },
  { href: "/community", label: "Community" },
];

export function Header() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const user = session?.user ?? null;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 10);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleSignOut() {
    await signOut();
    toast.success("Signed out");
    router.push("/");
    setIsUserMenuOpen(false);
  }

  const avatarSrc = user?.image || null;
  const displayName = user?.name || user?.email?.split("@")[0] || "User";
  const username = (user as any)?.username || null;

  return (
    <nav
      ref={menuRef}
      className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-md border-b border-white/5 py-3"
    >
      <div className="container mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-4 lg:gap-10">
          <Link href="/" className="flex items-center gap-2 group" aria-label="PixelReel Home">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-purple-900/50 group-hover:scale-105 transition-transform">
              <Film className="w-5 h-5 fill-white/20" />
            </div>
            <span className="hidden sm:inline text-xl font-bold tracking-tight text-white group-hover:text-purple-300 transition-colors">
              PixelReel
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5 rounded-full transition-all"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-purple-400 transition-colors" />
            <input
              type="text"
              placeholder="Search..."
              aria-label="Search movies and series"
              className="bg-black/20 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-zinc-200 focus:outline-none focus:border-purple-500/50 focus:bg-zinc-900 focus:ring-1 focus:ring-purple-500/20 w-40 xl:w-56 transition-all placeholder:text-zinc-600"
            />
          </div>

          <div className="flex items-center gap-3 border-l border-white/10 pl-4">
            {user && (
              <button
                className="p-2 h-9 w-9 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
              </button>
            )}

            {isPending ? (
              <div className="w-9 h-9 rounded-full bg-zinc-800 animate-pulse" />
            ) : user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen((v) => !v)}
                  className="w-9 h-9 rounded-full bg-zinc-800 p-0.5 border border-white/10 cursor-pointer hover:border-purple-500 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500"
                  aria-label="User menu"
                >
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={displayName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center text-white text-xs font-bold">
                      {displayName[0]?.toUpperCase()}
                    </div>
                  )}
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-zinc-900 border border-white/10 rounded-xl shadow-xl py-1.5 z-50">
                    <div className="px-3 py-2 border-b border-white/10">
                      <p className="text-sm font-medium text-white truncate">{displayName}</p>
                      {username && (
                        <p className="text-xs text-zinc-500 truncate">@{username}</p>
                      )}
                    </div>
                    <Link
                      href={username ? `/profile/${username}` : "/profile"}
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                    <div className="border-t border-white/10 mt-1 pt-1">
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/sign-in"
                className="hidden md:inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium bg-white text-black hover:bg-zinc-200 transition-colors"
              >
                Sign In
              </Link>
            )}

            <button
              className="md:hidden p-2 text-zinc-400 hover:text-white"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={cn(
          "md:hidden overflow-hidden transition-all duration-300 ease-in-out",
          isMenuOpen ? "max-h-96 py-4" : "max-h-0 py-0"
        )}
      >
        <nav className="container mx-auto px-6 flex flex-col space-y-2 border-t border-white/10 pt-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMenuOpen(false)}
              className="text-sm font-medium text-zinc-300 hover:text-white py-2"
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <button
              onClick={handleSignOut}
              className="text-left text-sm font-medium text-red-400 hover:text-red-300 py-2"
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/sign-in"
              onClick={() => setIsMenuOpen(false)}
              className="text-sm font-medium text-purple-400 hover:text-purple-300 py-2"
            >
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </nav>
  );
}
