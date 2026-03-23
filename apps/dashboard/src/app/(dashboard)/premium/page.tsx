import type { Metadata } from "next";
import { FlagsTable } from "./flags-table";
import { AtRiskSubscriptions } from "./at-risk-subscriptions";

export const metadata: Metadata = {
  title: "Premium — PixelReel Command",
};

export default function AdminPremiumPage() {
  return (
    <>
      <FlagsTable />
      <AtRiskSubscriptions />
    </>
  );
}
