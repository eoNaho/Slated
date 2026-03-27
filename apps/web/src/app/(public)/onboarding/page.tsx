import type { Metadata } from "next";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export const metadata: Metadata = {
  title: "Personalizar — PixelReel",
  description: "Diga-nos o que você curte para receber recomendações personalizadas.",
};

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
