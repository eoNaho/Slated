import type { Metadata } from "next";
import { ReportDetail } from "./report-detail";

export const metadata: Metadata = { title: "Denúncia — PixelReel Command" };

export default function ReportDetailPage({ params }: { params: { id: string } }) {
  return <ReportDetail reportId={params.id} />;
}
