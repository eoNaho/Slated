"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

interface ConsentStatus {
  needsAcceptance: boolean;
  currentVersions?: {
    terms: { id: string; version: string };
    privacy: { id: string; version: string };
  };
  accepted?: {
    terms: boolean;
    privacy: boolean;
  };
}

export default function AcceptTermsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [status, setStatus] = useState<ConsentStatus | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Wait for session to fully load
    if (isPending) return;
    // Give Better Auth a bit more time if session user is null but we just navigated here
    if (!session?.user) {
      // Use a small delay before redirecting to sign-in to avoid race conditions
      const timer = setTimeout(() => {
        router.replace("/sign-in");
      }, 1500);
      return () => clearTimeout(timer);
    }

    fetch(`${API_URL}/consent/status`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("failed");
        return r.json();
      })
      .then((data: ConsentStatus) => {
        if (!data.needsAcceptance) {
          router.replace("/");
        } else {
          setStatus(data);
        }
      })
      .catch(() => {
        // If status check fails (e.g. migration not applied), skip to home
        router.replace("/");
      });
  }, [session?.user?.id, isPending, router]);

  async function handleAccept() {
    if (!accepted || !status?.currentVersions) return;
    setLoading(true);

    const res = await fetch(`${API_URL}/consent/accept`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        termsVersionId: !status.accepted?.terms ? status.currentVersions.terms.id : undefined,
        privacyVersionId: !status.accepted?.privacy ? status.currentVersions.privacy.id : undefined,
        method: "reaccept",
      }),
    });

    setLoading(false);

    if (res.ok) {
      // Clear the sessionStorage cache so the guard re-checks and finds needsAcceptance: false
      if (session?.user?.id) {
        sessionStorage.removeItem(`terms_ok_${session.user.id}`);
      }
      toast.success("Terms accepted successfully");
      router.replace("/");
    } else {
      toast.error("Failed to record your acceptance. Please try again.");
    }
  }

  if (isPending || !status) {
    return null;
  }

  return (
    <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
          <Shield className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Updated Terms</h1>
          <p className="text-xs text-zinc-500">Review required to continue</p>
        </div>
      </div>

      <p className="text-sm text-zinc-400 mb-6">
        Our Terms of Service and/or Privacy Policy have been updated. Please review and accept the
        latest version to continue using PixelReel.
      </p>

      <div className="space-y-3 mb-6">
        {!status.accepted?.terms && (
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800/50 border border-white/5">
            <span className="text-sm text-zinc-300">Terms of Service</span>
            <span className="text-xs text-purple-400 font-mono">
              v{status.currentVersions?.terms.version}
            </span>
          </div>
        )}
        {!status.accepted?.privacy && (
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800/50 border border-white/5">
            <span className="text-sm text-zinc-300">Privacy Policy</span>
            <span className="text-xs text-purple-400 font-mono">
              v{status.currentVersions?.privacy.version}
            </span>
          </div>
        )}
      </div>

      <div className="mb-6">
        <Checkbox
          id="accept-updated-terms"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          label={
            <>
              I have read and agree to the updated{" "}
              <Link href="/terms" className="text-purple-400 hover:text-purple-300 underline underline-offset-2" target="_blank">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-purple-400 hover:text-purple-300 underline underline-offset-2" target="_blank">
                Privacy Policy
              </Link>
            </>
          }
        />
      </div>

      <Button
        onClick={handleAccept}
        disabled={!accepted || loading}
        className="w-full bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        size="lg"
      >
        {loading ? "Saving..." : "Accept and Continue"}
      </Button>
    </div>
  );
}
