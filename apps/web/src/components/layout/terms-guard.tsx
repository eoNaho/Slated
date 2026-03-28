"use client";

import { useTermsGuard } from "@/hooks/use-terms-guard";

export function TermsGuard({ children }: { children: React.ReactNode }) {
  useTermsGuard();
  return <>{children}</>;
}
