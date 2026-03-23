"use client";

import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useSession } from "@/lib/auth-client";
import { resolveImage } from "@/lib/utils";
import type { Conversation } from "@/types";

interface ConversationHeaderProps {
  conversation: Conversation;
}

export function ConversationHeader({ conversation }: ConversationHeaderProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const { displayName, avatarUrl } = resolveDisplayMeta(
    conversation,
    currentUserId
  );

  return (
    <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-zinc-950/80 backdrop-blur-sm">
      {/* Back button — visible on mobile */}
      <Link
        href="/messages"
        className="md:hidden flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/8 transition-colors"
        aria-label="Voltar para mensagens"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>

      {/* Avatar */}
      {conversation.type === "group" ? (
        <div className="w-9 h-9 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center flex-shrink-0">
          <Users className="h-4 w-4 text-zinc-400" />
        </div>
      ) : (
        <div className="relative flex-shrink-0">
          <Avatar className="w-9 h-9">
            <AvatarImage
              src={resolveImage(avatarUrl) ?? undefined}
              alt={displayName}
            />
            <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs font-medium">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {/* Online dot placeholder — future WebSocket */}
          {/* <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-zinc-950" /> */}
        </div>
      )}

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{displayName}</p>
        <p className="text-xs text-zinc-600">
          {conversation.type === "group"
            ? `${conversation.participants?.length ?? 0} participantes`
            : "Direto"}
        </p>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveDisplayMeta(
  conversation: Conversation,
  currentUserId: string | undefined
): { displayName: string; avatarUrl?: string | null } {
  if (conversation.type === "group") {
    return {
      displayName: conversation.name ?? "Grupo",
      avatarUrl: conversation.avatarUrl,
    };
  }

  const other = conversation.participants?.find(
    (p) => p.userId !== currentUserId
  );
  if (!other) return { displayName: "Usuário desconhecido", avatarUrl: null };

  return {
    displayName: other.displayName ?? other.username,
    avatarUrl: other.avatarUrl,
  };
}
