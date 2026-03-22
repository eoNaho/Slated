"use client";

import { Users } from "lucide-react";
import type { ClubMember } from "@/lib/queries/clubs";
import { Avatar, EmptyState, ROLE_BADGE } from "../shared/club-ui";

interface MembersTabProps {
  members: ClubMember[];
}

export function MembersTab({ members }: MembersTabProps) {
  if (members.length === 0) {
    return <EmptyState icon={Users} text="Nenhum membro ainda." />;
  }

  return (
    <div className="max-w-lg">
      <div
        className="relative rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/5 shadow-2xl transition-all duration-300 hover:border-purple-500/20"
        style={{
          background: "rgba(24,24,27,0.4)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,1) 2px, rgba(255,255,255,1) 3px)",
          }}
        />
        {members.map((m) => {
          const badge =
            ROLE_BADGE[m.role as keyof typeof ROLE_BADGE] ?? ROLE_BADGE.member;
          const BadgeIcon = badge.icon;
          const name = m.user.displayName ?? m.user.username ?? "?";
          return (
            <div
              key={m.id}
              className="relative z-10 flex items-center gap-4 px-4 py-3.5 hover:bg-purple-500/[0.03] transition-colors group/member"
            >
              <Avatar src={m.user.avatarUrl} name={name} size="md" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-zinc-100 block line-clamp-1 group-hover/member:text-purple-300 transition-colors">
                  {name}
                </span>
                {m.user.username && (
                  <span className="text-xs text-zinc-600">
                    @{m.user.username}
                  </span>
                )}
              </div>
              <span
                className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all duration-300 group-hover/member:scale-105 ${badge.color}`}
              >
                <BadgeIcon className="h-3 w-3" />
                {badge.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
