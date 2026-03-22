import type { Metadata } from "next";
import { FlagsList } from "./flags-list";

export const metadata: Metadata = {
  title: "Flags Automáticas — PixelReel Command",
};

export default function FlagsPage() {
  return <FlagsList />;
}
