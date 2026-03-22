import type { Metadata } from "next";
import { BlocklistManager } from "./blocklist-manager";

export const metadata: Metadata = {
  title: "Blocklist — PixelReel Command",
};

export default function BlocklistPage() {
  return <BlocklistManager />;
}
