import type { Metadata } from "next";
import { ClubPageClient } from "./club-page-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await fetch(`${API_URL}/clubs/${slug}`, { cache: "no-store" });
    if (res.ok) {
      const { data } = await res.json();
      return {
        title: `${data.name} — PixelReel`,
        description: data.description ?? `Club de cinema: ${data.name}`,
      };
    }
  } catch { /* ignore */ }
  return { title: "Club — PixelReel" };
}

export default async function ClubPage({ params }: PageProps) {
  const { slug } = await params;
  return <ClubPageClient slug={slug} />;
}
