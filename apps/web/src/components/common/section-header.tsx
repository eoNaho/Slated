import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  href?: string;
}

export function SectionHeader({ title, subtitle, href }: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between mb-8">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          {title}
          <ChevronRight className="h-5 w-5 text-zinc-600" />
        </h2>
        {subtitle && <p className="text-zinc-400 text-sm mt-1">{subtitle}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="hidden sm:flex group items-center gap-1 text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors px-4 py-2 rounded-full bg-purple-500/10 hover:bg-purple-500/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          View all
        </Link>
      )}
    </div>
  );
}
