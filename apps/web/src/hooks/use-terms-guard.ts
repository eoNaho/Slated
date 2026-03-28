"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "@/lib/auth-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

const EXEMPT_PATHS = [
  "/accept-terms",
  "/terms",
  "/privacy",
  "/cookies",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

const SESSION_CACHE_KEY = "terms_ok_";

export function useTermsGuard() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Stable user ID primitive — avoids re-running on object reference change
  const userId = session?.user?.id;

  useEffect(() => {
    // Wait for session to fully load before doing anything
    if (isPending) return;
    // Not logged in — nothing to check
    if (!userId) return;
    // Exempt pages
    if (EXEMPT_PATHS.some((p) => pathname.startsWith(p))) return;

    // Only check once per browser session per user
    const cacheKey = SESSION_CACHE_KEY + userId;
    if (sessionStorage.getItem(cacheKey) === "ok") return;

    fetch(`${API_URL}/consent/status`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("status check failed");
        return r.json();
      })
      .then((data) => {
        if (data.needsAcceptance) {
          router.push("/accept-terms");
        } else {
          // Cache so we don't re-check on every navigation
          sessionStorage.setItem(cacheKey, "ok");
        }
      })
      .catch(() => {
        // On error (e.g. tables not yet migrated), don't block the user
        sessionStorage.setItem(cacheKey, "ok");
      });
  // Only re-run when user changes or session load state changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isPending]);
}
