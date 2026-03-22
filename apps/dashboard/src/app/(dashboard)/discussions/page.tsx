import type { Metadata } from "next";
import { ReportsList } from "./reports-list";

export const metadata: Metadata = {
  title: "Moderação — PixelReel Command",
};

export default function DiscussionsPage() {
  return <ReportsList />;
}
