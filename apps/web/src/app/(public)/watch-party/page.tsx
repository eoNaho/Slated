import type { Metadata } from "next";
import { getMyRooms } from "@/lib/queries/watch-party";
import { WatchPartyHome } from "./watch-party-home";

export const metadata: Metadata = {
  title: "Watch Party — PixelReel",
  description:
    "Assista junto com amigos em sincronia perfeita na Netflix, Disney+, Max e Prime Video.",
};

export default async function WatchPartyPage() {
  const myRooms = await getMyRooms();

  return <WatchPartyHome myRooms={myRooms} />;
}
