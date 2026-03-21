import Link from "next/link";

interface CrewChipProps {
  credit: {
    id: string;
    job?: string | null;
    person: { id: string; name: string };
  };
  highlight?: boolean;
}

export function CrewChip({ credit, highlight = false }: CrewChipProps) {
  return (
    <Link
      href={`/people/${credit.person.id}`}
      className="group flex items-center gap-2 px-3 py-2 rounded-lg transition-all border"
      style={{
        background: highlight ? "rgba(245,196,24,0.06)" : "rgba(255,255,255,0.025)",
        borderColor: highlight ? "rgba(245,196,24,0.2)" : "rgba(255,255,255,0.06)",
      }}
    >
      <div>
        <p className="text-[13px] font-semibold text-zinc-200 group-hover:text-amber-400 transition-colors leading-tight">
          {credit.person.name}
        </p>
        {credit.job && (
          <p className="text-[11px] text-zinc-600 leading-tight">{credit.job}</p>
        )}
      </div>
    </Link>
  );
}
