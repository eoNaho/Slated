import Link from "next/link";
import { Users, Lock, Film } from "lucide-react";
import type { Club } from "@/lib/queries/clubs";
import { resolveImage } from "@/lib/utils";

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
      <article className="relative overflow-hidden rounded-2xl bg-zinc-900/40 border border-white/5 backdrop-blur-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8),0_0_0_1px_rgba(168,85,247,0.2)] hover:bg-zinc-900/60">
        {/* Cinematic frame */}
        <div
          className="relative overflow-hidden cursor-pointer"
          style={{ aspectRatio: "16/9" }}
        >
          {club.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={club.coverUrl}
              alt={club.name}
              className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-110"
            />
          ) : (
            <div
              className="w-full h-full relative overflow-hidden bg-gradient-to-br from-zinc-900 via-purple-950/20 to-zinc-950"
            >
              {/* Scanline texture */}
              <div
                className="absolute inset-0 opacity-[0.05]"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,1) 2px, rgba(255,255,255,1) 3px)",
                }}
              />
              {/* Film reel decoration */}
              <div className="absolute inset-0 flex items-center justify-center opacity-30">
                <div className="relative">
                  <div className="w-20 h-20 border border-purple-500/20 rounded-full" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Film className="w-8 h-8 text-purple-400" />
                  </div>
                  <div className="absolute -inset-6 border border-dashed border-purple-500/10 rounded-full animate-spin-slow" />
                </div>
              </div>
            </div>
          )}

          {/* Dark vignette overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />

          {/* Top badges */}
          <div className="absolute top-0 left-0 right-0 p-4 flex items-start justify-between">
            {primaryCategory ? (
              <span
                className="text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-md shadow-lg"
                style={{
                  background: "rgba(0,0,0,0.4)",
                }}
              >
                {CATEGORY_LABELS[primaryCategory] ?? primaryCategory}
              </span>
            ) : (
              <span />
            )}
            {!club.isPublic && (
              <div
                className="flex items-center justify-center w-8 h-8 rounded-full border border-white/10 backdrop-blur-md shadow-lg"
                style={{ background: "rgba(0,0,0,0.4)" }}
              >
                <Lock className="h-3 w-3 text-zinc-400" />
              </div>
            )}
          </div>

          {/* Club name on image */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
            <h3
              className="font-bold text-white leading-tight line-clamp-2 transition-colors duration-300 group-hover:text-purple-300"
              style={{
                fontSize: "16px",
                textShadow: "0 2px 10px rgba(0,0,0,0.8)",
              }}
            >
              {club.name}
            </h3>
          </div>
        </div>

        {/* Card footer */}
        <div className="px-4 py-4 flex flex-col gap-4 border-t border-white/5">
          {/* Progress Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
              <div className="flex items-center gap-2 text-zinc-500">
                <Users className="h-3 w-3" />
                <span>Members</span>
              </div>
              <div className="text-zinc-400">
                {club.memberCount} <span className="text-zinc-600">/ {club.maxMembers}</span>
              </div>
            </div>
            <div className="h-1.5 w-full rounded-full bg-zinc-800/50 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-1000 ease-out"
                style={{ width: `${memberPct}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            {/* Owner */}
            <div className="flex items-center gap-2 group/owner">
              <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 ring-1 ring-white/10 bg-zinc-800 transition-transform group-hover/owner:scale-110">
                {club.owner.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveImage(club.owner.avatarUrl)!}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white bg-purple-900/80">
                    {(club.owner.displayName ??
                      club.owner.username ??
                      "?")[0].toUpperCase()}
                  </div>
                )}
              </div>
              <span className="text-[11px] font-semibold text-zinc-500 group-hover/owner:text-zinc-300 transition-colors">
                {club.owner.displayName || club.owner.username}
              </span>
            </div>

            {/* View Link */}
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
              Enter →
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
