import type { Metadata } from "next";
import { UserDetail } from "./user-detail";

export const metadata: Metadata = { title: "Usuário — PixelReel Command" };

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <UserDetail userId={id} />;
}
