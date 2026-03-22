"use client";

import * as React from "react";
import Image from "next/image";
import { X, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, resolveImage } from "@/lib/utils";
import { useStoryViewers } from "@/hooks/queries/use-stories";

interface SeenByDrawerProps {
  storyId: string;
  viewsCount: number;
  isOpen: boolean;
  onClose: () => void;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function SeenByDrawer({ storyId, viewsCount, isOpen, onClose }: SeenByDrawerProps) {
  const { data, isLoading } = useStoryViewers(storyId, isOpen);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[10] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute bottom-0 inset-x-0 z-[20] bg-zinc-900 border-t border-white/10 rounded-t-2xl max-h-[65%] flex flex-col"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-white">
                <Eye className="w-4 h-4 text-white/60" />
                <span className="font-semibold text-sm">
                  Visto por {viewsCount > 0 ? viewsCount : ""}
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-white/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Viewer list */}
            <div className="overflow-y-auto flex-1 overscroll-contain">
              {isLoading ? (
                <div className="space-y-3 p-5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-white/10 shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-32 bg-white/10 rounded" />
                        <div className="h-2 w-20 bg-white/5 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !data?.data?.length ? (
                <div className="flex flex-col items-center justify-center py-12 text-white/40 gap-2">
                  <Eye className="w-8 h-8" />
                  <p className="text-sm">Ninguém viu ainda</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {data.data.map((viewer) => (
                    <div key={viewer.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 bg-zinc-800">
                        <Image
                          fill
                          src={resolveImage(viewer.avatarUrl) || "/placeholder-user.jpg"}
                          alt={viewer.displayName || viewer.username}
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {viewer.displayName || viewer.username}
                        </p>
                        <p className="text-white/40 text-xs">@{viewer.username}</p>
                      </div>
                      <span className="text-white/30 text-xs shrink-0">
                        {timeAgo(viewer.viewedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
