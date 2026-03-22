import type { Metadata } from "next";
import { UsersTable } from "./users-table";

export const metadata: Metadata = {
  title: "Community — PixelReel Command",
};

export default function CommunityPage() {
  return <UsersTable />;
}
