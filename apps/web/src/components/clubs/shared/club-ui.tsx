"use client";

import Image from "next/image";
import { Crown, Shield, Users } from "lucide-react";
import { resolveImage } from "@/lib/utils";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export async function apiFetch(endpoint: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...opts,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts.headers ?? {}) },
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export const ROLE_BADGE = {
  owner: {
    label: "Dono",
    icon: Crown,
    color: "text-purple-300 bg-purple-400/10 border-purple-400/25",
  },
  moderator: {
    label: "Mod",
    icon: Shield,
    color: "text-indigo-300 bg-indigo-400/10 border-indigo-400/25",
  },
  member: {
    label: "Membro",
    icon: Users,
    color: "text-zinc-400 bg-zinc-400/8 border-zinc-600/30",
  },
} as const;

export const inputCls =
  "w-full bg-zinc-900/50 border border-white/5 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/40 transition-all rounded-xl backdrop-blur-md";

export const btnPrimaryCls =
  "group relative flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40";

export const btnGhostCls =
  "px-5 py-2.5 text-sm font-medium text-zinc-400 hover:text-zinc-200 border border-white/5 bg-zinc-900/40 hover:bg-zinc-800/60 transition-all rounded-xl backdrop-blur-md";

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Avatar({
  src,
  name,
  size = "sm",
}: {
  src?: string | null;
  name: string;
  size?: "sm" | "md";
}) {
  const dim = size === "md" ? "w-9 h-9" : "w-7 h-7";
  const text = size === "md" ? "text-sm" : "text-xs";
  return (
    <div className={`relative ${dim} rounded-full shrink-0 overflow-hidden ring-1 ring-white/8`}>
      {src ? (
        <Image fill src={resolveImage(src)!} alt={name} className="object-cover" />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center ${text} font-bold text-white`}
          style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
        >
          {name[0]?.toUpperCase() ?? "?"}
        </div>
      )}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  text,
}: {
  icon: React.ElementType;
  text: string;
}) {
  return (
    <div className="py-12 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-900 border border-white/5 mb-4">
        <Icon className="h-5 w-5 text-zinc-600" />
      </div>
      <p className="text-zinc-500 text-sm">{text}</p>
    </div>
  );
}
