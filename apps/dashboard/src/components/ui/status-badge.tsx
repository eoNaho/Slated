interface StatusBadgeProps {
  value: string;
  variant?: "status" | "role" | "priority" | "report" | "flag" | "plan";
  className?: string;
}

const STATUS_COLORS: Record<string, string> = {
  // user status
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  suspended: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  banned: "bg-red-500/15 text-red-400 border-red-500/20",
  // roles
  admin: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  moderator: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  user: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  // report status
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  investigating: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  resolved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  dismissed: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  // priority
  low: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  critical: "bg-red-500/15 text-red-400 border-red-500/20",
  // flag severity / types
  confirmed: "bg-red-500/15 text-red-400 border-red-500/20",
  // plan tiers
  free: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  pro: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  ultra: "bg-amber-500/15 text-amber-400 border-amber-500/20",
};

const LABELS: Record<string, string> = {
  active: "Ativo",
  suspended: "Suspenso",
  banned: "Banido",
  admin: "Admin",
  moderator: "Mod",
  user: "Usuário",
  pending: "Pendente",
  investigating: "Investigando",
  resolved: "Resolvido",
  dismissed: "Descartado",
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
  confirmed: "Confirmado",
  free: "Free",
  pro: "Pro",
  ultra: "Ultra",
};

export function StatusBadge({ value, className = "" }: StatusBadgeProps) {
  const colorClass = STATUS_COLORS[value] ?? "bg-zinc-500/15 text-zinc-400 border-zinc-500/20";
  const label = LABELS[value] ?? value;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${colorClass} ${className}`}
    >
      {label}
    </span>
  );
}
