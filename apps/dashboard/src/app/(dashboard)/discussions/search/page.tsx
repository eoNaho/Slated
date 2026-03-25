import type { Metadata } from "next";
import { SearchDiscussions } from "./search-discussions";

export const metadata: Metadata = {
  title: "Buscar Discussões — PixelReel Command",
};

export default function SearchDiscussionsPage() {
  return <SearchDiscussions />;
}
