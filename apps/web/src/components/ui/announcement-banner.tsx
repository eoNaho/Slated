"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, ExternalLink, Megaphone, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { useWsContext, type AnnouncementData } from "@/providers/websocket-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
const DISMISSED_KEY = "pixelreel-dismissed-announcements";

const TYPE_CONFIG = {
  info:    { icon: Info,          glow: "shadow-blue-500/20",    badge: "text-blue-400 bg-blue-500/10 border-blue-500/20",    cta: "bg-blue-500 hover:bg-blue-400",    bar: "from-blue-500 to-blue-400" },
  warning: { icon: AlertTriangle, glow: "shadow-amber-500/20",   badge: "text-amber-400 bg-amber-500/10 border-amber-500/20",  cta: "bg-amber-500 hover:bg-amber-400",  bar: "from-amber-500 to-amber-400" },
  success: { icon: CheckCircle2,  glow: "shadow-emerald-500/20", badge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", cta: "bg-emerald-500 hover:bg-emerald-400", bar: "from-emerald-500 to-emerald-400" },
  promo:   { icon: Megaphone,     glow: "shadow-purple-500/30",  badge: "text-purple-400 bg-purple-500/10 border-purple-500/25",  cta: "bg-gradient-to-r from-purple-500 to-indigo-500",  bar: "from-purple-500 to-indigo-500" },
} as const;

function cfg(type: string) {
  return TYPE_CONFIG[type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.info;
}

export function AnnouncementBanner() {
  // Dismissed IDs stored in localStorage
  const [dismissed, setDismissed] = useState<string[]>([]);
  // Announcement pushed via WebSocket (takes priority)
  const [wsAnn, setWsAnn] = useState<AnnouncementData | null>(null);
  // Closing animation flag
  const [closing, setClosing] = useState(false);

  const { subscribeAnnouncement } = useWsContext();

  // Load dismissed list from localStorage on mount
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]");
      setDismissed(stored);
    } catch { /* ignore */ }
  }, []);

  // Poll API for active announcement
  const { data: queryAnn } = useQuery({
    queryKey: ["announcement-active"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/announcements/active`, { credentials: "include" });
      if (!res.ok) return null;
      const json = await res.json();
      return (json.data ?? null) as AnnouncementData | null;
    },
    staleTime: 0,
    refetchInterval: 60_000,
  });

  // Subscribe to WS push — setState inside callback is allowed
  useEffect(() => {
    return subscribeAnnouncement((ann) => {
      setWsAnn((prev) => {
        if (dismissed.includes(ann.id)) return prev;
        return ann;
      });
    });
  }, [subscribeAnnouncement, dismissed]);

  // Derive the current announcement to show (WS takes priority over API)
  const current = useMemo<AnnouncementData | null>(() => {
    const ann = wsAnn ?? queryAnn ?? null;
    if (!ann || dismissed.includes(ann.id)) return null;
    return ann;
  }, [wsAnn, queryAnn, dismissed]);

  const dismiss = useCallback(() => {
    if (!current) return;
    const id = current.id;
    setClosing(true);
    setTimeout(() => {
      setDismissed((prev) => {
        const next = [...prev, id];
        try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(next)); } catch { /* */ }
        return next;
      });
      setWsAnn(null);
      setClosing(false);
    }, 250);
  }, [current]);

  // Close on Escape
  useEffect(() => {
    if (!current) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [current, dismiss]);

  if (!current) return null;

  const c = cfg(current.type);
  const Icon = c.icon;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={current.dismissible ? dismiss : undefined}
        className={`fixed inset-0 z-[998] bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${closing ? "opacity-0" : "opacity-100"}`}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`
            pointer-events-auto w-full max-w-md rounded-2xl overflow-hidden
            border border-white/10 bg-zinc-900 shadow-2xl ${c.glow}
            transition-all duration-200
            ${closing ? "opacity-0 scale-95" : "opacity-100 scale-100"}
          `}
        >
          {/* Image */}
          {current.imageUrl ? (
            <div className="relative w-full h-44 bg-zinc-800">
              <Image src={current.imageUrl} alt={current.title} fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 to-transparent" />
            </div>
          ) : (
            <div className={`h-1 bg-gradient-to-r ${c.bar}`} />
          )}

          <div className="p-6">
            {/* Title row */}
            <div className="flex items-start gap-3 mb-3">
              <div className={`shrink-0 p-2 rounded-xl border ${c.badge}`}>
                <Icon className="w-4 h-4" />
              </div>
              <h3 className="flex-1 text-base font-bold text-white leading-snug pt-1.5">
                {current.title}
              </h3>
              {current.dismissible && (
                <button
                  onClick={dismiss}
                  className="shrink-0 p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Message */}
            <p className="text-sm text-zinc-400 leading-relaxed">{current.message}</p>

            {/* Buttons */}
            <div className="flex gap-3 mt-5">
              {current.actionLabel && current.actionUrl && (
                <a
                  href={current.actionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={dismiss}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity ${c.cta}`}
                >
                  {current.actionLabel}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              {current.dismissible && (
                <button
                  onClick={dismiss}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Fechar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
