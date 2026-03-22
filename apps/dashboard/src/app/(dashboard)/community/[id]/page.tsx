import type { Metadata } from "next";
import { UserDetail } from "./user-detail";

export const metadata: Metadata = { title: "Usuário — PixelReel Command" };

export default function UserDetailPage({ params }: { params: { id: string } }) {
  return <UserDetail userId={params.id} />;
}
