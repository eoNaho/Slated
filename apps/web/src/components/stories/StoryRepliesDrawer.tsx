"use client";

import * as React from "react";
import Image from "next/image";
import { X, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { resolveImage } from "@/lib/utils";
import { useStoryReplies } from "@/hooks/queries/use-stories";

interface StoryRepliesDrawerProps {
  storyId: string;
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

export function StoryRepliesDrawer({ storyId, isOpen, onClose }: StoryRepliesDrawerProps) {
  const { data: replies, isLoading } = useStoryReplies(storyId, isOpen);

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
                <MessageCircle className="w-4 h-4 text-white/60" />
                <span className="font-semibold text-sm">Respostas</span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-white/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Reply list */}
            <div className="overflow-y-auto flex-1 overscroll-contain">
              {isLoading ? (
                <div className="space-y-4 p-5">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-start gap-3 animate-pulse">
                      <div className="w-9 h-9 rounded-full bg-white/10 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-28 bg-white/10 rounded" />
                        <div className="h-3 w-48 bg-white/5 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !replies?.length ? (
                <div className="flex flex-col items-center justify-center py-12 text-white/40 gap-2">
                  <MessageCircle className="w-8 h-8" />
                  <p className="text-sm">Nenhuma resposta ainda</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {replies.map((reply) => (
                    <div key={reply.id} className="flex items-start gap-3 px-5 py-4">
                      <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 bg-zinc-800">
                        <Image
                          fill
                          src={resolveImage(reply.user.avatarUrl) || "/placeholder-user.jpg"}
                          alt={reply.user.displayName || reply.user.username}
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-white text-sm font-semibold">
                            {reply.user.displayName || reply.user.username}
                          </span>
                          <span className="text-white/30 text-xs">{timeAgo(reply.createdAt)}</span>
                        </div>
                        <p className="text-white/80 text-sm mt-1 leading-relaxed">
                          {reply.textReply}
                        </p>
                      </div>
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
