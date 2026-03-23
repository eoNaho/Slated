"use client";

import { useState, useEffect, useRef } from "react";
import { X, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { api } from "@/lib/api";
import { resolveImage } from "@/lib/utils";

interface UserResult {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

interface NewConversationModalProps {
  onClose: () => void;
  onConversationCreated: (conversationId: string) => void;
}

export function NewConversationModal({
  onClose,
  onConversationCreated,
}: NewConversationModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Autofocus
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.users.search(q);
        setResults((res.data ?? []).map((u: any) => ({
          id: u.id,
          username: u.username ?? null,
          displayName: u.displayName ?? null,
          avatarUrl: u.avatarUrl ?? null,
        })));
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      setIsSearching(false);
    };
  }, [query]);

  async function handleSelect(userId: string) {
    if (creatingId) return;
    setCreatingId(userId);
    try {
      const conv = await api.messages.createConversation({
        type: "dm",
        participantIds: [userId],
      });
      onConversationCreated(conv.id);
    } catch {
      toast.error("Não foi possível iniciar a conversa.");
    } finally {
      setCreatingId(null);
    }
  }

  return (
    /* Absolute overlay covers the entire parent panel */
    <div className="absolute inset-0 z-20 flex flex-col bg-zinc-900">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 flex-shrink-0">
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/8 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-white">Nova mensagem</span>
      </div>

      {/* Search input */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2 bg-zinc-800 border border-white/8 rounded-xl px-3 py-2 focus-within:border-purple-500/40 transition-colors">
          <Search className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou @usuário..."
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 outline-none"
          />
          {isSearching && (
            <Loader2 className="h-3.5 w-3.5 text-zinc-500 animate-spin flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {results.length === 0 && !isSearching && query.trim() && (
          <p className="text-xs text-zinc-500 text-center py-8">
            Nenhum usuário encontrado
          </p>
        )}

        {results.length === 0 && !query.trim() && (
          <p className="text-xs text-zinc-600 text-center py-8">
            Digite para buscar pessoas
          </p>
        )}

        {results.map((user) => {
          const name = user.displayName ?? user.username ?? "Usuário";
          const isCreating = creatingId === user.id;

          return (
            <button
              key={user.id}
              onClick={() => handleSelect(user.id)}
              disabled={!!creatingId}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors disabled:opacity-60"
            >
              <Avatar className="w-9 h-9 flex-shrink-0">
                <AvatarImage
                  src={resolveImage(user.avatarUrl) ?? undefined}
                  alt={name}
                />
                <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs">
                  {name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-zinc-100 truncate">
                  {name}
                </p>
                {user.username && (
                  <p className="text-xs text-zinc-500 truncate">
                    @{user.username}
                  </p>
                )}
              </div>
              {isCreating && (
                <Loader2 className="h-4 w-4 text-zinc-500 animate-spin flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
