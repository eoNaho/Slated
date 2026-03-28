"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { InboxList } from "@/components/messages/inbox-list";

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.replace("/sign-in");
    }
  }, [isPending, session, router]);

  if (isPending) {
    return (
      <div className="flex h-[calc(100vh-56px)] items-center justify-center bg-zinc-950">
        <div className="w-6 h-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!session?.user) return null;

  // Determine if we're on a conversation page (has conversationId segment)
  const isConversationPage =
    pathname !== "/messages" && pathname.startsWith("/messages/");

  return (
    <div className="flex h-[calc(100vh-56px)] bg-zinc-950 overflow-hidden">
      {/* Sidebar: conversation list
          - On desktop: always visible (360px)
          - On mobile: visible only when NOT in a conversation */}
      <div
        className={[
          "flex-shrink-0 w-full md:w-[360px] border-r border-white/5 flex flex-col",
          isConversationPage ? "hidden md:flex" : "flex",
        ].join(" ")}
      >
        <InboxList />
      </div>

      {/* Main content area
          - On desktop: always visible
          - On mobile: visible only when IN a conversation */}
      <div
        className={[
          "flex-1 flex flex-col min-w-0",
          isConversationPage ? "flex" : "hidden md:flex",
        ].join(" ")}
      >
        {isConversationPage ? (
          children
        ) : (
          <EmptyConversationState />
        )}
      </div>
    </div>
  );
}

function EmptyConversationState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-7 w-7 text-zinc-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </div>
      <div>
        <p className="text-zinc-300 font-medium">Selecione uma conversa</p>
        <p className="text-zinc-600 text-sm mt-1">
          Escolha uma conversa ao lado para começar a ler.
        </p>
      </div>
    </div>
  );
}
