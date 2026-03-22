import type { Metadata } from "next";
import { DashboardOverview } from "./dashboard-overview";

export const metadata: Metadata = {
  title: "Overview — PixelReel Command",
};

export default function DashboardPage() {
  return <DashboardOverview />;
}
