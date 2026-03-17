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
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="border-b border-white/5">
        <div className="container mx-auto px-6 pt-10 pb-8">
          <div className="flex items-start justify-between gap-6 mb-8">
            {/* Title */}
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.35em] text-amber-500/70 mb-3">
                Comunidades de Cinema
              </p>
              <h1
                className="font-black text-white leading-none mb-4"
                style={{
                  fontSize: "clamp(3rem, 8vw, 6rem)",
                  letterSpacing: "-0.04em",
                }}
              >
                Clubs
              </h1>
              <p className="text-zinc-500 text-sm max-w-md leading-relaxed">
                Encontre sua tribo. Assista junto, discuta, vote, e descubra
                cinema com quem entende.
              </p>
            </div>

            {/* CTA */}
            <Link
              href="/clubs/new"
              className="shrink-0 mt-1 flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white uppercase tracking-wide transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(217,119,6,0.4)]"
              style={{
                background: "linear-gradient(135deg, #d97706, #b45309)",
                boxShadow: "0 4px 20px rgba(217,119,6,0.3)",
              }}
            >
              <Plus className="h-4 w-4" />
              Criar Club
            </Link>
          </div>

          {/* ── Filters ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Search */}
            <form method="GET" className="relative w-full sm:w-auto sm:min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600 pointer-events-none" />
              <input
                name="search"
                defaultValue={search}
                placeholder="Buscar clubs..."
                className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-white/6 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/40 transition-colors"
                style={{ borderRadius: "2px" }}
              />
              {category && (
                <input type="hidden" name="category" value={category} />
              )}
            </form>

            {/* Divider */}
            <div className="hidden sm:block h-6 w-px bg-white/8" />

            {/* Category chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
              {CATEGORIES.map((cat) => {
                const isActive = (category ?? "") === cat.value;
                const href = cat.value
                  ? `?category=${cat.value}${search ? `&search=${search}` : ""}`
                  : `?${search ? `search=${search}` : ""}`;
                return (
                  <Link
                    key={cat.value}
                    href={href}
                    className={`shrink-0 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-200 border ${
                      isActive
                        ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                        : "bg-transparent text-zinc-600 border-white/6 hover:border-white/15 hover:text-zinc-300"
                    }`}
                    style={{ borderRadius: "2px" }}
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
      <div className="container mx-auto px-6 py-8">
        {/* Count */}
        {result && result.total > 0 && (
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-700 mb-6">
            <span className="text-zinc-400">{result.total}</span> clubs
            encontrados
          </p>
        )}

        {/* Grid */}
        {clubs.length === 0 ? (
          <div className="py-24 text-center">
            <div className="w-16 h-16 border border-white/6 flex items-center justify-center mx-auto mb-5">
              <Film className="h-7 w-7 text-zinc-700" />
            </div>
            <p className="text-zinc-300 text-base font-semibold mb-1">
              Nenhum club encontrado
            </p>
            <p className="text-zinc-600 text-sm">Seja o primeiro a criar um.</p>
            <Link
              href="/clubs/new"
              className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 text-sm font-bold text-white uppercase tracking-wide transition-all hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(135deg, #d97706, #b45309)",
                borderRadius: "2px",
              }}
            >
              <Plus className="h-4 w-4" /> Criar Club
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {clubs.map((club) => (
              <ClubCard key={club.id} club={club} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 mt-12">
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
                  className={`w-8 h-8 flex items-center justify-center text-xs font-bold border transition-all ${
                    isActive
                      ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                      : "text-zinc-600 border-transparent hover:border-white/10 hover:text-zinc-300"
                  }`}
                  style={{ borderRadius: "2px" }}
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
