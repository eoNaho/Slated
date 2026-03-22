import type { Metadata } from "next";
import { SystemStats } from "./system-stats";

export const metadata: Metadata = {
  title: "Infraestrutura — PixelReel Command",
};

export default function SystemPage() {
  return <SystemStats />;
}
