import type { Metadata } from "next";
import { ReportDetail } from "./report-detail";

export const metadata: Metadata = { title: "Denúncia — PixelReel Command" };

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReportDetail reportId={id} />;
}
