import type { Metadata } from "next";
import { ClubSettingsClient } from "@/components/clubs/settings-client";

export const metadata: Metadata = {
  title: "Club Settings — PixelReel",
};

export default async function ClubSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ClubSettingsClient slug={slug} />;
}
