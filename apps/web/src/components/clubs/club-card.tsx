import Link from "next/link";
import { Users, Lock, Film } from "lucide-react";
import type { Club } from "@/lib/queries/clubs";

const CATEGORY_LABELS: Record<string, string> = {
  action: "Ação",
  comedy: "Comédia",
  drama: "Drama",
  horror: "Terror",
  "sci-fi": "Sci-Fi",
  thriller: "Suspense",
  romance: "Romance",
  crime: "Crime",
  fantasy: "Fantasia",
  mystery: "Mistério",
  animation: "Animação",
  anime: "Anime",
  documentary: "Documentário",
  musical: "Musical",
  "by-director": "Diretor",
  "by-actor": "Ator",
  "by-decade": "Época",
  "by-country": "País",
  general: "Geral",
};

interface ClubCardProps {
  club: Club;
}

export function ClubCard({ club }: ClubCardProps) {
  const memberPct = Math.min(
    Math.round((club.memberCount / club.maxMembers) * 100),
    100,
  );
  const primaryCategory = club.categories[0];

  return (
    <Link href={`/clubs/${club.slug}`} className="group block">
      <article className="relative overflow-hidden rounded-xl bg-zinc-900 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_0_1px_rgba(217,119,6,0.15)]">
        {/* Cinematic frame */}
        <div
          className="relative overflow-hidden"
          style={{ aspectRatio: "16/9" }}
        >
          {club.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={club.coverUrl}
              alt={club.name}
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div
              className="w-full h-full relative overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, #1c0d2e 0%, #0d0d1a 55%, #1a0d0a 100%)",
              }}
            >
              {/* Scanline texture */}
              <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,1) 2px, rgba(255,255,255,1) 3px)",
                }}
              />
              {/* Film reel decoration */}
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <div className="relative">
                  <div className="w-16 h-16 border border-zinc-600 rounded-full" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Film className="w-7 h-7 text-zinc-500" />
                  </div>
                  <div className="absolute -inset-4 border border-dashed border-zinc-700 rounded-full animate-spin-slow" />
                </div>
              </div>
            </div>
          )}

          {/* Dark vignette overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-transparent" />

          {/* Top badges */}
          <div className="absolute top-0 left-0 right-0 p-3 flex items-start justify-between">
            {primaryCategory ? (
              <span
                className="text-[9px] font-black uppercase tracking-[0.18em] px-2.5 py-1 backdrop-blur-sm"
                style={{
                  background: "rgba(0,0,0,0.6)",
                }}
              >
                {CATEGORY_LABELS[primaryCategory] ?? primaryCategory}
              </span>
            ) : (
              <span />
            )}
            {!club.isPublic && (
              <span
                className="flex items-center gap-1 text-[9px] text-zinc-300 px-2 py-1 rounded-full backdrop-blur-sm"
                style={{ background: "rgba(0,0,0,0.6)" }}
              >
                <Lock className="h-2.5 w-2.5" />
              </span>
            )}
          </div>

          {/* Club name on image */}
          <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
            <h3
              className="font-bold text-white leading-tight line-clamp-2 transition-colors duration-300 group-hover:text-amber-100"
              style={{
                fontSize: "14px",
                textShadow: "0 1px 12px rgba(0,0,0,0.9)",
              }}
            >
              {club.name}
            </h3>
          </div>
        </div>

        {/* Card footer */}
        <div className="px-3 py-2.5 flex items-center gap-3 border-t border-white/5">
          {/* Owner */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 ring-1 ring-white/10 bg-zinc-700">
              {club.owner.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={club.owner.avatarUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-white bg-amber-900/80">
                  {(club.owner.displayName ??
                    club.owner.username ??
                    "?")[0].toUpperCase()}
                </div>
              )}
            </div>
            <span className="text-[10px] text-zinc-500 truncate">
              {club.owner.displayName ?? club.owner.username}
            </span>
          </div>

          {/* Member count + fill */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Users className="h-3 w-3 text-zinc-600" />
            <span className="text-[11px] font-medium">
              <span className="text-zinc-400">{club.memberCount}</span>
              <span className="text-zinc-700">/{club.maxMembers}</span>
            </span>
            <div className="w-10 h-0.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500/60 transition-all duration-700"
                style={{ width: `${memberPct}%` }}
              />
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
