import type { Metadata } from "next";
import { ClubsGrid } from "./clubs-grid";

export const metadata: Metadata = {
  title: "Clubs — PixelReel Command",
};

export default function ClubsPage() {
  return <ClubsGrid />;
}
