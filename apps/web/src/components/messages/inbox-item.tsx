"use client";

import Link from "next/link";
import { BellOff, Users } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useSession } from "@/lib/auth-client";
import { resolveImage } from "@/lib/utils";
import type { Conversation } from "@/types";

interface InboxItemProps {
  conversation: Conversation;
  isActive?: boolean;
}

export function InboxItem({ conversation, isActive = false }: InboxItemProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const { displayName, avatarUrl } = resolveConversationMeta(
    conversation,
    currentUserId
  );

  const isMuted = resolveIsMuted(conversation, currentUserId);
  const unreadCount = conversation.unreadCount ?? 0;

  const timeLabel = conversation.lastMessageAt
    ? formatRelative(conversation.lastMessageAt)
    : null;

  return (
    <Link
      href={`/messages/${conversation.id}`}
      className={[
        "flex items-center gap-3 px-3 py-3 rounded-xl transition-colors group",
        isActive
          ? "bg-white/8 text-white"
          : "hover:bg-white/5 text-zinc-300",
      ].join(" ")}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {conversation.type === "group" ? (
          <div className="w-11 h-11 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-zinc-400" />
          </div>
        ) : (
          <Avatar className="w-11 h-11">
            <AvatarImage
              src={resolveImage(avatarUrl) ?? undefined}
              alt={displayName}
            />
            <AvatarFallback className="bg-zinc-800 text-zinc-400 text-sm font-medium">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}

        {/* Unread dot */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-orange-500 border-2 border-zinc-950" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={[
              "text-sm font-medium truncate",
              unreadCount > 0 ? "text-white" : "text-zinc-200",
            ].join(" ")}
          >
            {displayName}
          </span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isMuted && (
              <BellOff className="h-3 w-3 text-zinc-600" />
            )}
            {timeLabel && (
              <span className="text-xs text-zinc-500 tabular-nums">
                {timeLabel}
              </span>
            )}
          </div>
        </div>

        {conversation.lastMessagePreview && (
          <p
            className={[
              "text-xs truncate mt-0.5 leading-relaxed",
              unreadCount > 0 ? "text-zinc-300 font-medium" : "text-zinc-500",
            ].join(" ")}
          >
            {conversation.lastMessagePreview}
          </p>
        )}
      </div>
    </Link>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function resolveConversationMeta(
  conversation: Conversation,
  currentUserId: string | undefined
): { displayName: string; avatarUrl?: string | null } {
  if (conversation.type === "group") {
    return {
      displayName: conversation.name ?? "Grupo",
      avatarUrl: conversation.avatarUrl,
    };
  }

  // DM: find the other participant
  const other = conversation.participants?.find(
    (p) => p.userId !== currentUserId
  );
  if (!other) {
    return { displayName: "Usuário desconhecido", avatarUrl: null };
  }
  return {
    displayName: other.displayName ?? other.username,
    avatarUrl: other.avatarUrl,
  };
}

function resolveIsMuted(
  conversation: Conversation,
  currentUserId: string | undefined
): boolean {
  if (!currentUserId) return false;
  const me = conversation.participants?.find((p) => p.userId === currentUserId);
  return me?.isMuted ?? false;
}

function formatRelative(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
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
