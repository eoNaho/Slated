"use client";

import { useState } from "react";
import { Film, ImageOff } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { resolveImage } from "@/lib/utils";
import type { Message } from "@/types";

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  showAvatar?: boolean;
}

export function MessageBubble({
  message,
  isMine,
  showAvatar = false,
}: MessageBubbleProps) {
  const [showTime, setShowTime] = useState(false);

  const isDeleted = message.isDeleted || message.content === null;
  const isStoryReply = message.type === "story_reply";

  const timeLabel = format(new Date(message.createdAt), "HH:mm", {
    locale: ptBR,
  });

  return (
    <div
      className={[
        "flex items-end gap-2 group",
        isMine ? "flex-row-reverse" : "flex-row",
      ].join(" ")}
      onMouseEnter={() => setShowTime(true)}
      onMouseLeave={() => setShowTime(false)}
    >
      {/* Avatar (only for received messages, when sender changes) */}
      {!isMine && (
        <div className="flex-shrink-0 w-8">
          {showAvatar ? (
            <Avatar className="w-8 h-8">
              <AvatarImage
                src={resolveImage(message.senderAvatarUrl) ?? undefined}
                alt={message.senderDisplayName ?? message.senderUsername ?? ""}
              />
              <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs font-medium">
                {(message.senderDisplayName ?? message.senderUsername ?? "?")
                  .slice(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : null}
        </div>
      )}

      {/* Bubble */}
      <div
        className={[
          "flex flex-col max-w-[75%] min-w-0",
          isMine ? "items-end" : "items-start",
        ].join(" ")}
      >
        {/* Sender name (for group conversations, theirs only) */}
        {!isMine && showAvatar && message.senderDisplayName && (
          <span className="text-xs text-zinc-500 mb-1 ml-1">
            {message.senderDisplayName}
          </span>
        )}

        {/* Story reply preview */}
        {isStoryReply && !isDeleted && (
          <StoryReplyPreview message={message} isMine={isMine} />
        )}

        {/* Message content */}
        <div
          className={[
            "relative px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words",
            isMine
              ? "bg-purple-600 text-white rounded-br-sm"
              : "bg-zinc-800 text-zinc-100 rounded-bl-sm",
            isDeleted ? "italic text-opacity-60" : "",
          ].join(" ")}
        >
          {isDeleted ? (
            <span className="text-zinc-500 italic">Mensagem apagada</span>
          ) : (
            <>
              <span className="whitespace-pre-wrap">{message.content}</span>
              {message.isEdited && (
                <span
                  className={[
                    "ml-1.5 text-[10px]",
                    isMine ? "text-purple-200/70" : "text-zinc-500",
                  ].join(" ")}
                >
                  editado
                </span>
              )}
            </>
          )}
        </div>

        {/* Timestamp on hover */}
        <div
          className={[
            "text-[10px] text-zinc-600 mt-1 px-1 transition-opacity duration-150",
            showTime ? "opacity-100" : "opacity-0",
          ].join(" ")}
        >
          {timeLabel}
        </div>
      </div>
    </div>
  );
}

// ── Story Reply Preview ───────────────────────────────────────────────────────

interface StoryReplyPreviewProps {
  message: Message;
  isMine: boolean;
}

function StoryReplyPreview({ message, isMine }: StoryReplyPreviewProps) {
  const meta = message.metadata;
  const imageUrl = meta?.storyImageUrl
    ? resolveImage(meta.storyImageUrl)
    : null;
  const isExpired = meta?.storyIsExpired ?? false;

  return (
    <div
      className={[
        "mb-1 rounded-xl overflow-hidden border text-xs",
        isMine
          ? "border-purple-500/30 bg-purple-700/20"
          : "border-zinc-700 bg-zinc-900",
      ].join(" ")}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Story thumbnail */}
        <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800 flex items-center justify-center">
          {isExpired ? (
            <ImageOff className="h-4 w-4 text-zinc-600" />
          ) : imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt="Story"
              className="w-full h-full object-cover"
            />
          ) : (
            <Film className="h-4 w-4 text-zinc-600" />
          )}
        </div>

        <div className="min-w-0">
          <p
            className={[
              "font-medium truncate",
              isMine ? "text-purple-200" : "text-zinc-300",
            ].join(" ")}
          >
            {isExpired ? "Story expirado" : "Respondeu ao story"}
          </p>
          {meta?.storyType && (
            <p className="text-zinc-500 truncate capitalize">{meta.storyType}</p>
          )}
        </div>
      </div>
    </div>
  );
}
