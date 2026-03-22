import type { Metadata } from "next";
import { ContentGrid } from "./content-grid";

export const metadata: Metadata = {
  title: "Catálogo — PixelReel Command",
};

export default function ContentPage() {
  return <ContentGrid />;
}
