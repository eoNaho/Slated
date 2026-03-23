"use client";

import { useState, useEffect, useRef } from "react";
import { X, Plus, ArrowLeft, ExternalLink, MessageSquare, Users } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useConversations, useConversation } from "@/hooks/queries/use-messages";
import { useSession } from "@/lib/auth-client";
import { resolveImage } from "@/lib/utils";
import { ConversationView } from "./conversation-view";
import { NewConversationModal } from "./new-conversation-modal";
import type { Conversation } from "@/types";
import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Props ────────────────────────────────────────────────────────────────────

interface MiniDmPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Panel ───────────────────────────────────────────────────────────────────

export function MiniDmPanel({ isOpen, onClose }: MiniDmPanelProps) {
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const { data: selectedConv } = useConversation(selectedConvId);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (selectedConvId) setSelectedConvId(null);
      else if (showNewModal) setShowNewModal(false);
      else onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, selectedConvId, showNewModal, onClose]);

  // Reset selected conversation when panel closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedConvId(null);
      setShowNewModal(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const convDisplayName = resolveConvName(selectedConv ?? null, currentUserId);
  const convAvatarUrl = resolveConvAvatar(selectedConv ?? null, currentUserId);

  return (
    <div
      ref={panelRef}
      className="fixed top-[57px] right-4 z-[55] w-[360px] flex flex-col bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
      style={{ maxHeight: "min(540px, calc(100vh - 72px))" }}
    >
      {/* ── Panel header ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 flex-shrink-0">
        {selectedConvId ? (
          <>
            <button
              onClick={() => setSelectedConvId(null)}
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/8 transition-colors"
              title="Voltar"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 flex-1 min-w-0">
              {selectedConv?.type === "group" ? (
                <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                  <Users className="h-3.5 w-3.5 text-zinc-400" />
                </div>
              ) : (
                <Avatar className="w-7 h-7 flex-shrink-0">
                  <AvatarImage
                    src={resolveImage(convAvatarUrl) ?? undefined}
                    alt={convDisplayName}
                  />
                  <AvatarFallback className="bg-zinc-800 text-zinc-400 text-[10px]">
                    {convDisplayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              <span className="text-sm font-semibold text-white truncate">
                {convDisplayName}
              </span>
            </div>

            {/* Open full page */}
            <Link
              href={`/messages/${selectedConvId}`}
              onClick={onClose}
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/8 transition-colors"
              title="Abrir em tela cheia"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </>
        ) : (
          <>
            <span className="flex-1 text-sm font-semibold text-white">
              Mensagens
            </span>
            <button
              onClick={() => setShowNewModal(true)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/8 transition-colors"
              title="Nova conversa"
            >
              <Plus className="h-4 w-4" />
            </button>
          </>
        )}

        <button
          onClick={onClose}
          className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/8 transition-colors"
          title="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0 relative">
        {showNewModal && (
          <NewConversationModal
            onClose={() => setShowNewModal(false)}
            onConversationCreated={(id) => {
              setShowNewModal(false);
              setSelectedConvId(id);
            }}
          />
        )}

        {selectedConvId ? (
          <ConversationView conversationId={selectedConvId} hideHeader />
        ) : (
          <MiniInboxList
            currentUserId={currentUserId}
            onSelect={setSelectedConvId}
          />
        )}
      </div>

      {/* ── Footer — only on inbox view ─────────────────────────────────── */}
      {!selectedConvId && !showNewModal && (
        <div className="flex-shrink-0 border-t border-white/5">
          <Link
            href="/messages"
            onClick={onClose}
            className="flex items-center justify-center py-2.5 text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Ver todas as mensagens
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Mini inbox list ─────────────────────────────────────────────────────────

function MiniInboxList({
  currentUserId,
  onSelect,
}: {
  currentUserId: string | undefined;
  onSelect: (id: string) => void;
}) {
  const { data, isLoading } = useConversations();
  const conversations: Conversation[] = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="p-3 space-y-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <MiniItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 px-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
          <MessageSquare className="h-5 w-5 text-zinc-600" />
        </div>
        <p className="text-zinc-500 text-xs leading-relaxed">
          Nenhuma conversa ainda.
          <br />
          Comece uma nova!
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto flex-1">
      <div className="p-2 space-y-0.5">
        {conversations.map((conv) => (
          <MiniInboxItem
            key={conv.id}
            conversation={conv}
            currentUserId={currentUserId}
            onClick={() => onSelect(conv.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Mini inbox item ─────────────────────────────────────────────────────────

function MiniInboxItem({
  conversation,
  currentUserId,
  onClick,
}: {
  conversation: Conversation;
  currentUserId: string | undefined;
  onClick: () => void;
}) {
  const { displayName, avatarUrl } = resolveConvName2(
    conversation,
    currentUserId
  );
  const unreadCount = conversation.unreadCount ?? 0;
  const timeLabel = conversation.lastMessageAt
    ? formatShort(conversation.lastMessageAt)
    : null;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left group"
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {conversation.type === "group" ? (
          <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-zinc-400" />
          </div>
        ) : (
          <Avatar className="w-10 h-10">
            <AvatarImage
              src={resolveImage(avatarUrl) ?? undefined}
              alt={displayName}
            />
            <AvatarFallback className="bg-zinc-800 text-zinc-400 text-sm">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-orange-500 border-2 border-zinc-900" />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={[
              "text-sm font-medium truncate",
              unreadCount > 0 ? "text-white" : "text-zinc-300",
            ].join(" ")}
          >
            {displayName}
          </span>
          {timeLabel && (
            <span className="text-[11px] text-zinc-500 flex-shrink-0 tabular-nums">
              {timeLabel}
            </span>
          )}
        </div>
        {conversation.lastMessagePreview && (
          <p
            className={[
              "text-xs truncate mt-0.5",
              unreadCount > 0 ? "text-zinc-300 font-medium" : "text-zinc-500",
            ].join(" ")}
          >
            {conversation.lastMessagePreview}
          </p>
        )}
      </div>
    </button>
  );
}

function MiniItemSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-3 w-24 rounded" />
        <Skeleton className="h-2.5 w-36 rounded" />
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveConvName(
  conv: Conversation | null,
  currentUserId: string | undefined
): string {
  if (!conv) return "...";
  if (conv.type === "group") return conv.name ?? "Grupo";
  const other = conv.participants?.find((p) => p.userId !== currentUserId);
  return other?.displayName ?? other?.username ?? "Usuário";
}

function resolveConvAvatar(
  conv: Conversation | null,
  currentUserId: string | undefined
): string | null | undefined {
  if (!conv) return null;
  if (conv.type === "group") return conv.avatarUrl;
  const other = conv.participants?.find((p) => p.userId !== currentUserId);
  return other?.avatarUrl;
}

function resolveConvName2(
  conv: Conversation,
  currentUserId: string | undefined
): { displayName: string; avatarUrl?: string | null } {
  if (conv.type === "group") {
    return { displayName: conv.name ?? "Grupo", avatarUrl: conv.avatarUrl };
  }
  const other = conv.participants?.find((p) => p.userId !== currentUserId);
  if (!other) return { displayName: "Usuário desconhecido", avatarUrl: null };
  return {
    displayName: other.displayName ?? other.username,
    avatarUrl: other.avatarUrl,
  };
}

function formatShort(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    if (diffMins < 1) return "agora";
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d`;
    return formatDistanceToNowStrict(date, { locale: ptBR, addSuffix: false });
  } catch {
    return "";
  }
}
