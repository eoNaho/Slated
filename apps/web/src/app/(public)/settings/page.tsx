import type { Metadata } from "next";
import { SettingsClient } from "./settings-client";

export const metadata: Metadata = {
  title: "Settings | PixelReel",
  description: "Manage your profile, account security, privacy, and notification preferences.",
};

export default function SettingsPage() {
  return <SettingsClient />;
}
