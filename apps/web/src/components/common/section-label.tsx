import type { ReactNode } from "react";

interface SectionLabelProps {
  children: ReactNode;
}

export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <span className="inline-block text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-500 mb-4">
      {children}
    </span>
  );
}
