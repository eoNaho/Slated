"use client";

import { usePathname } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useConversations } from "@/hooks/queries/use-messages";
import { InboxItem } from "./inbox-item";

export function InboxList() {
  const { data, isLoading } = useConversations();
  const pathname = usePathname();

  const conversations = data?.data ?? [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-white/5">
        <h1 className="text-lg font-semibold text-white">Mensagens</h1>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-3 space-y-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <InboxItemSkeleton key={i} />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-8 py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-zinc-600" />
            </div>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Nenhuma conversa ainda.
              <br />
              Comece uma nova!
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-0.5">
            {conversations.map((conversation) => {
              const isActive =
                pathname === `/messages/${conversation.id}`;
              return (
                <InboxItem
                  key={conversation.id}
                  conversation={conversation}
                  isActive={isActive}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function InboxItemSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-3 rounded-xl">
      <Skeleton className="w-11 h-11 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-3.5 w-28 rounded" />
        <Skeleton className="h-3 w-40 rounded" />
      </div>
      <Skeleton className="h-3 w-8 rounded flex-shrink-0" />
    </div>
  );
}
