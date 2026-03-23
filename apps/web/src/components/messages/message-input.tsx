"use client";

import { useRef, useState, useCallback } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import { useAppendMessage } from "@/hooks/queries/use-messages";

interface MessageInputProps {
  conversationId: string;
  wsSend: (event: object) => void;
  onSent?: () => void;
}

export function MessageInput({ conversationId, wsSend, onSent }: MessageInputProps) {
  const { data: session } = useSession();
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const appendMessage = useAppendMessage();
  const isTypingRef = useRef(false);
  const stopTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isEmpty = content.trim().length === 0;

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
    // Max ~4 rows at ~24px line-height = 96px + padding
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    adjustHeight();

    // Emit typing event on first keystroke; reset 3s stop-typing timer
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      wsSend({ type: "typing", conversationId });
    }
    if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);
    stopTypingTimerRef.current = setTimeout(sendStopTyping, 3000);
  };

  const sendMessage = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    sendStopTyping();
    setIsSending(true);
    setContent("");
    // Reset textarea height
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
      // Restore content on failure
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
    <div className="flex-shrink-0 px-4 py-3 border-t border-white/5 bg-zinc-950">
      <div className="flex items-end gap-2 bg-zinc-900 border border-white/8 rounded-2xl px-4 py-2.5 focus-within:border-purple-500/40 transition-colors">
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
