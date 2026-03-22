import { ChevronRight } from "lucide-react";

interface PageHeaderProps {
  section: string;
  title: string;
  icon?: React.ElementType;
  badge?: string | number;
  actions?: React.ReactNode;
}

export function PageHeader({ section, title, icon: Icon, badge, actions }: PageHeaderProps) {
  return (
    <header className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 mb-2">
          <span>Control</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-zinc-300">{section}</span>
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
          {Icon && <Icon className="w-6 h-6 text-accent" />}
          {title}
          {badge !== undefined && badge !== 0 && (
            <span className="text-sm font-normal text-zinc-500 px-2 py-0.5 rounded-full border border-white/10 bg-white/5">
              {typeof badge === "number" ? badge.toLocaleString() : badge}
            </span>
          )}
        </h2>
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </header>
  );
}
