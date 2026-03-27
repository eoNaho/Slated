import type { Metadata } from "next";
import { RecommendationsMetrics } from "./recommendations-metrics";

export const metadata: Metadata = {
  title: "Recomendações — PixelReel Command",
};

export default function RecommendationsPage() {
  return <RecommendationsMetrics />;
}
