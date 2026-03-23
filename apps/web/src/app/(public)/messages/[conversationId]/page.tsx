"use client";

import { use } from "react";
import { ConversationView } from "@/components/messages/conversation-view";

interface ConversationPageProps {
  params: Promise<{ conversationId: string }>;
}

export default function ConversationPage({ params }: ConversationPageProps) {
  const { conversationId } = use(params);
  return <ConversationView conversationId={conversationId} />;
}
