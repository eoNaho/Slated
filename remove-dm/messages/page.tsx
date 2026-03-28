"use client";

// On mobile, the inbox list is shown directly (via the layout sidebar slot).
// On desktop, this page renders nothing — the layout's right panel shows
// the "Selecione uma conversa" empty state when no conversation is active.
// On mobile we render an empty fragment so layout logic drives visibility.
export default function MessagesPage() {
  return null;
}
