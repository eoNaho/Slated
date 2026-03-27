"use client";

import Link from "next/link";
import { Sparkles, X } from "lucide-react";
import { useState } from "react";
import { useOnboardingStatus } from "@/hooks/queries/use-recommendations";
import { useSession } from "@/lib/auth-client";

export function OnboardingBanner() {
  const { data: session } = useSession();
  const [dismissed, setDismissed] = useState(false);

  const { data, isLoading, isError } = useOnboardingStatus(!!session?.user);

  if (!session?.user || isLoading || dismissed || isError) return null;

  // Only show if we have a definitive answer that onboarding is needed
  if (!data || data.completed || data.hasEnoughData) return null;

  return (
    <div className="container mx-auto px-6 py-3">
      <div className="relative flex items-center gap-4 bg-purple-600/10 border border-purple-500/20 rounded-xl px-5 py-4">
        <div className="flex-shrink-0 w-10 h-10 bg-purple-600/20 rounded-full flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-200">
            Personalize your recommendations
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">
            Tell us what you enjoy to get suggestions made just for you.
          </p>
        </div>
        <Link
          href="/onboarding"
          className="flex-shrink-0 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Get started
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors rounded-lg hover:bg-white/5"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
