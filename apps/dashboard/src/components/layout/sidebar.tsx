"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { resolveImage } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Film,
  Settings,
  MessageSquare,
  Zap,
  ShieldCheck,
  Command,
  Shield,
  Activity,
} from "lucide-react";
import Image from "next/image";

interface AdminUser {
  displayName?: string;
  username?: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
}

const STAFF_NAV = [
  { label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Community", icon: Users, href: "/community" },
  { label: "Clubs", icon: Zap, href: "/clubs" },
  { label: "Content", icon: Film, href: "/content" },
  { label: "Discussions", icon: MessageSquare, href: "/discussions" },
  { label: "Premium", icon: Shield, href: "/premium" },
  { label: "Infrastructure", icon: ShieldCheck, href: "/system" },
];

const ADMIN_ONLY_NAV = [
  { label: "Audit Logs", icon: Activity, href: "/audit-logs" },
];

export function Sidebar({ admin }: { admin?: AdminUser | null }) {
  const pathname = usePathname();
  const isAdmin = admin?.role === "admin";

  const displayName = admin?.displayName || admin?.username || admin?.email || "Admin";
  const roleLabel = admin?.role === "admin" ? "Admin" : admin?.role === "moderator" ? "Moderador" : "Staff";

  const navItems = isAdmin ? [...STAFF_NAV, ...ADMIN_ONLY_NAV] : STAFF_NAV;

  return (
    <aside className="fixed left-0 top-0 h-screen w-20 lg:w-64 flex flex-col z-50 transition-all duration-500 border-r border-white/5 bg-zinc-950/40 backdrop-blur-xl">
      {/* Brand area */}
      <div className="relative p-6 lg:p-8">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="relative w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/20">
              <Command className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="hidden lg:block">
            <h1 className="text-sm font-bold text-white tracking-wide">
              PixelReel
            </h1>
            <p className="text-xs font-semibold text-accent/80 uppercase tracking-widest">
              Command
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 px-4 lg:px-6 mt-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-4 p-3 rounded-lg transition-colors duration-200 group relative ${
                isActive
                  ? "bg-white/5 text-accent"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-accent rounded-r-full" />
              )}
              <Icon
                className={`w-5 h-5 transition-colors ${isActive ? "text-accent" : "text-zinc-400 group-hover:text-zinc-300"}`}
              />
              <span className="hidden lg:block text-sm font-medium">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Profile area */}
      <div className="relative p-6 border-t border-white/5 space-y-4">
        {isAdmin && (
          <Link
            href="/settings"
            className="flex items-center gap-4 p-3 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors"
          >
            <Settings className="w-5 h-5" />
            <span className="hidden lg:block text-sm font-medium">Settings</span>
          </Link>
        )}

        <div className="hidden lg:flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 overflow-hidden flex items-center justify-center relative">
            {admin?.avatarUrl ? (
              <Image
                src={resolveImage(admin.avatarUrl) ?? ""}
                fill
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-zinc-400">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {displayName}
            </p>
            <p className="text-xs text-zinc-500 truncate">{roleLabel}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
