import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subText?: string;
  trend?: {
    value: number;
    label?: string;
  };
  accentColor?: string;
  className?: string;
}

export function StatCard({ icon: Icon, label, value, subText, trend, accentColor, className = "" }: StatCardProps) {
  const isPositive = trend && trend.value >= 0;

  return (
    <div className={`glass-card rounded-xl p-5 flex flex-col gap-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={accentColor ? { background: `${accentColor}20`, color: accentColor } : undefined}
        >
          <Icon
            className="w-4.5 h-4.5"
            style={!accentColor ? { color: "var(--accent)" } : undefined}
          />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
            {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
      </div>
      {subText && (
        <p className="text-xs text-zinc-600 border-t border-white/5 pt-2">{subText}</p>
      )}
    </div>
  );
}
