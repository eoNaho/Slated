"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Send, Smile } from "lucide-react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import { useAppendMessage } from "@/hooks/queries/use-messages";
import type { EmojiClickData } from "emoji-picker-react";

// Lazy-load the picker — it's heavy (~300kb) and not needed on every page
const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

interface MessageInputProps {
  conversationId: string;
  wsSend: (event: object) => void;
  onSent?: () => void;
}

export function MessageInput({ conversationId, wsSend, onSent }: MessageInputProps) {
  const { data: session } = useSession();
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const appendMessage = useAppendMessage();
  const isTypingRef = useRef(false);
  const stopTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isEmpty = content.trim().length === 0;

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmoji) return;
    const handler = (e: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node) &&
        !emojiButtonRef.current?.contains(e.target as Node)
      ) {
        setShowEmoji(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmoji]);

  const sendStopTyping = useCallback(() => {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      wsSend({ type: "stop_typing", conversationId });
    }
    if (stopTypingTimerRef.current) {
      clearTimeout(stopTypingTimerRef.current);
      stopTypingTimerRef.current = null;
    }
  }, [conversationId, wsSend]);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    adjustHeight();

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      wsSend({ type: "typing", conversationId });
    }
    if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);
    stopTypingTimerRef.current = setTimeout(sendStopTyping, 3000);
  };

  const handleEmojiClick = useCallback(
    (emojiData: EmojiClickData) => {
      const emoji = emojiData.emoji;
      const el = textareaRef.current;
      if (el) {
        const start = el.selectionStart ?? content.length;
        const end = el.selectionEnd ?? content.length;
        const newContent =
          content.slice(0, start) + emoji + content.slice(end);
        setContent(newContent);

        // Restore cursor after emoji
        requestAnimationFrame(() => {
          el.focus();
          const pos = start + emoji.length;
          el.setSelectionRange(pos, pos);
          adjustHeight();
        });
      } else {
        setContent((prev) => prev + emoji);
      }
    },
    [content, adjustHeight]
  );

  const sendMessage = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    sendStopTyping();
    setShowEmoji(false);
    setIsSending(true);
    setContent("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const message = await api.messages.sendMessage(conversationId, {
        content: trimmed,
        type: "text",
      });
      appendMessage(conversationId, message);
      onSent?.();
    } catch {
      toast.error("Não foi possível enviar a mensagem. Tente novamente.");
      setContent(trimmed);
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  }, [content, isSending, conversationId, appendMessage, onSent, sendStopTyping]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isDisabled = isEmpty || isSending || !session?.user;

  return (
    <div className="flex-shrink-0 px-4 py-3 border-t border-white/5 bg-zinc-950 relative">
      {/* Emoji picker — opens above the input */}
      {showEmoji && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-full right-4 mb-2 z-50"
        >
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={"dark" as const}
            skinTonesDisabled
            searchPlaceHolder="Buscar emoji..."
            width={320}
            height={380}
          />
        </div>
      )}

      <div className="flex items-end gap-2 bg-zinc-900 border border-white/8 rounded-2xl px-3 py-2.5 focus-within:border-purple-500/40 transition-colors">
        {/* Emoji button */}
        <button
          ref={emojiButtonRef}
          type="button"
          onClick={() => setShowEmoji((v) => !v)}
          disabled={!session?.user}
          className={[
            "flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
            showEmoji
              ? "text-purple-400 bg-purple-500/10"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5",
            "disabled:opacity-40 disabled:cursor-not-allowed",
          ].join(" ")}
          aria-label="Emojis"
        >
          <Smile className="h-4 w-4" />
        </button>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Escreva uma mensagem..."
          rows={1}
          disabled={isSending || !session?.user}
          className={[
            "flex-1 resize-none bg-transparent text-sm text-zinc-100",
            "placeholder:text-zinc-600 outline-none leading-6",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "max-h-[120px] overflow-y-auto",
          ].join(" ")}
          style={{ height: "24px" }}
        />

        <button
          onClick={sendMessage}
          disabled={isDisabled}
          className={[
            "flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all",
            isDisabled
              ? "text-zinc-600 cursor-not-allowed"
              : "text-white bg-purple-600 hover:bg-purple-500 active:scale-95",
          ].join(" ")}
          aria-label="Enviar mensagem"
        >
          {isSending ? (
            <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      <p className="text-[10px] text-zinc-700 mt-1.5 text-center select-none">
        Enter para enviar · Shift+Enter para nova linha
      </p>
    </div>
  );
}
