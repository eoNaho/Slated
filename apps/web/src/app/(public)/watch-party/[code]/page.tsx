import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRoom } from "@/lib/queries/watch-party";
import { RoomClient } from "./room-client";

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const room = await getRoom(code);
  if (!room) return { title: "Sala não encontrada — PixelReel" };

  return {
    title: `${room.title} — Watch Party — PixelReel`,
    description: room.mediaTitle
      ? `Watch Party: ${room.mediaTitle}`
      : "Assista junto com seus amigos em sincronia perfeita.",
  };
}

export default async function RoomPage({ params }: PageProps) {
  const { code } = await params;
  const room = await getRoom(code);

  if (!room) notFound();

  return <RoomClient room={room} />;
}
