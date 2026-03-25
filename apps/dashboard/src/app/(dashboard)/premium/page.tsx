import type { Metadata } from "next";
import { FlagsTable } from "./flags-table";
import { AtRiskSubscriptions } from "./at-risk-subscriptions";
import { SubscriptionsManager } from "./subscriptions-manager";

export const metadata: Metadata = {
  title: "Premium — PixelReel Command",
};

export default function AdminPremiumPage() {
  return (
    <>
      <FlagsTable />
      <SubscriptionsManager />
      <AtRiskSubscriptions />
    </>
  );
}
