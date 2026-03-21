import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search, Film } from "lucide-react";
import { ClubCard } from "@/components/clubs/club-card";
import { getPublicClubs } from "@/lib/queries/clubs";

export const metadata: Metadata = {
  title: "Clubs — PixelReel",
  description:
    "Join communities of cinephiles united by genre, director, or just a love of film.",
};

const CATEGORIES = [
  { value: "", label: "Todos" },
  { value: "action", label: "Ação" },
  { value: "horror", label: "Terror" },
  { value: "sci-fi", label: "Sci-Fi" },
  { value: "drama", label: "Drama" },
  { value: "anime", label: "Anime" },
  { value: "comedy", label: "Comédia" },
  { value: "thriller", label: "Suspense" },
  { value: "documentary", label: "Doc." },
  { value: "by-director", label: "Diretor" },
  { value: "by-decade", label: "Época" },
  { value: "general", label: "Geral" },
];

interface PageProps {
  searchParams: Promise<{ category?: string; search?: string; page?: string }>;
}

export default async function ClubsPage({ searchParams }: PageProps) {
  const { category, search, page } = await searchParams;

  const result = await getPublicClubs({
    page: Number(page) || 1,
    category,
    search,
  });

  const clubs = result?.data ?? [];
  const totalPages = result?.totalPages ?? 1;
  const currentPage = Number(page) || 1;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-black via-purple-900/10 to-black -z-10" />
      
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="relative border-b border-white/5 bg-zinc-900/20 backdrop-blur-md">
        <div className="container mx-auto px-6 pt-16 pb-12">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8 mb-12">
            {/* Title */}
            <div className="relative">
              <div className="absolute -left-12 -top-12 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl -z-10 animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-purple-400 mb-4 flex items-center gap-2">
                <span className="w-8 h-px bg-purple-500/30" />
                Community Hub
              </p>
              <h1
                className="font-black text-white leading-none mb-6"
                style={{
                  fontSize: "clamp(3.5rem, 10vw, 7rem)",
                  letterSpacing: "-0.05em",
                }}
              >
                Clubs
              </h1>
              <p className="text-zinc-400 text-base max-w-lg leading-relaxed font-medium">
                Find your tribe. Watch together, discuss, vote, and discover
                the magic of cinema with enthusiasts who share your passion.
              </p>
            </div>

            {/* CTA */}
            <Link
              href="/clubs/new"
              className="group relative flex items-center gap-2 px-8 py-4 text-sm font-bold text-white uppercase tracking-wider transition-all duration-300 rounded-2xl overflow-hidden hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 group-hover:from-purple-500 group-hover:to-indigo-500 transition-all" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.2),transparent)] opacity-0 group-hover:opacity-100 transition-opacity" />
              <Plus className="h-4 w-4 relative z-10" />
              <span className="relative z-10">Create Club</span>
            </Link>
          </div>

          {/* ── Filters ── */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 p-2 rounded-3xl bg-black/40 border border-white/5 backdrop-blur-xl">
            {/* Search */}
            <form method="GET" className="relative w-full lg:w-80 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-purple-400 transition-colors pointer-events-none" />
              <input
                name="search"
                defaultValue={search}
                placeholder="Search clubs..."
                className="w-full pl-11 pr-4 py-3 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/40 transition-all"
              />
              {category && (
                <input type="hidden" name="category" value={category} />
              )}
            </form>

            <div className="hidden lg:block h-8 w-px bg-white/10" />

            {/* Category chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden w-full lg:w-auto">
              {CATEGORIES.map((cat) => {
                const isActive = (category ?? "") === cat.value;
                const href = cat.value
                  ? `?category=${cat.value}${search ? `&search=${search}` : ""}`
                  : `?${search ? `search=${search}` : ""}`;
                return (
                  <Link
                    key={cat.value}
                    href={href}
                    className={`shrink-0 px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-all duration-300 rounded-xl border ${
                      isActive
                        ? "bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.15)]"
                        : "bg-transparent text-zinc-500 border-white/5 hover:border-white/20 hover:text-zinc-300"
                    }`}
                  >
                    {cat.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="container mx-auto px-6 py-12">
        {/* Count */}
        {result && result.total > 0 && (
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">
              <span className="text-purple-400">{result.total}</span> communities found
            </p>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          </div>
        )}

        {/* Grid */}
        {clubs.length === 0 ? (
          <div className="py-32 text-center rounded-[3rem] bg-zinc-900/20 border border-white/5 backdrop-blur-sm max-w-3xl mx-auto">
            <div className="w-20 h-20 rounded-3xl bg-zinc-900 border border-white/10 flex items-center justify-center mx-auto mb-8 shadow-2xl">
              <Film className="h-8 w-8 text-zinc-600" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">
              No clubs found
            </h3>
            <p className="text-zinc-500 text-base max-w-sm mx-auto mb-10 leading-relaxed">
              Looks like there are no communities matching your criteria. Why not start one yourself?
            </p>
            <Link
              href="/clubs/new"
              className="inline-flex items-center gap-2 px-8 py-4 text-sm font-bold text-white uppercase tracking-wider bg-white/5 border border-white/10 rounded-2xl transition-all hover:bg-white/10 hover:-translate-y-1 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" /> Start a Club
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {clubs.map((club) => (
              <ClubCard key={club.id} club={club} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-20">
            {Array.from({ length: totalPages }).map((_, i) => {
              const p = i + 1;
              const isActive = p === currentPage;
              const qs = new URLSearchParams();
              qs.set("page", String(p));
              if (category) qs.set("category", category);
              if (search) qs.set("search", search);
              return (
                <Link
                  key={p}
                  href={`?${qs}`}
                  className={`w-12 h-12 flex items-center justify-center text-sm font-bold rounded-2xl border transition-all duration-300 ${
                    isActive
                      ? "bg-purple-500/10 text-purple-400 border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.1)]"
                      : "text-zinc-500 border-white/5 hover:border-white/20 hover:text-zinc-300"
                  }`}
                >
                  {p}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
