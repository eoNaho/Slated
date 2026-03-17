import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyEmailContent } from "./verify-email-content";

export const metadata: Metadata = {
  title: "Verify Email | PixelReel",
  description: "Verify your email address to activate your PixelReel account.",
};

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
