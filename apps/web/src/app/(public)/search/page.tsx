"use client";

import { useState, useCallback, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  Loader2,
  Film,
  Tv,
  X,
  Star,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  User2,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { mediaApi, searchApi } from "@/lib/api";
import type { SearchResult } from "@/types";
import { resolveImage } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type TypeFilter = "all" | "movie" | "series" | "users";

type UserResult = {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  isVerified?: boolean;
};

const TABS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "movie", label: "Filmes" },
  { value: "series", label: "Séries" },
  { value: "users", label: "Pessoas" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonMediaCard() {
  return (
    <div className="flex flex-col gap-2 animate-pulse">
      <div className="aspect-[2/3] rounded-lg bg-zinc-800/70 w-full" />
      <div className="h-3 w-3/4 rounded bg-zinc-800/70" />
      <div className="h-2.5 w-1/3 rounded bg-zinc-800/50" />
    </div>
  );
}

function SkeletonUserCard() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse w-full">
      <div className="h-10 w-10 rounded-full bg-zinc-800/70 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-28 rounded bg-zinc-800/70" />
        <div className="h-2.5 w-20 rounded bg-zinc-800/50" />
      </div>
    </div>
  );
}

function MediaCard({
  item,
  navigating,
  onClick,
}: {
  item: SearchResult;
  navigating: boolean;
  onClick: () => void;
}) {
  const isMovie = item.mediaType === "movie";
  const year = item.releaseDate
    ? new Date(item.releaseDate).getFullYear()
    : null;

  return (
    <button
      onClick={onClick}
      disabled={navigating}
      className="group relative text-left focus:outline-none w-full"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-zinc-900 border border-zinc-800 transition-all duration-200 group-hover:border-zinc-500 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-black/50">
        {item.posterPath ? (
          <Image
            src={item.posterPath}
            alt={item.title}
            fill
            unoptimized
            className="object-cover transition-transform duration-300 group-hover:scale-[1.05]"
            sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 15vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {isMovie ? (
              <Film className="h-8 w-8 text-zinc-600" />
            ) : (
              <Tv className="h-8 w-8 text-zinc-600" />
            )}
          </div>
        )}

        {/* overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

        {/* loading overlay */}
        {navigating && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}

        {/* type pill */}
        <span
          className={cn(
            "absolute left-2 top-2 rounded px-1.5 py-0.5 text-[9px] font-bold tracking-widest uppercase",
            isMovie ? "bg-violet-600 text-white" : "bg-sky-600 text-white",
          )}
        >
          {isMovie ? "FILM" : "TV"}
        </span>

        {/* rating */}
        {item.voteAverage && item.voteAverage > 0 && (
          <span className="absolute bottom-2 right-2 flex items-center gap-0.5 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
            <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
            {item.voteAverage.toFixed(1)}
          </span>
        )}
      </div>

      <div className="mt-2 space-y-0.5 px-0.5">
        <p className="truncate text-xs font-bold text-zinc-200 group-hover:text-violet-400 transition-colors">
          {item.title}
        </p>
        {year && (
          <p className="text-[11px] text-zinc-500 font-medium">{year}</p>
        )}
      </div>
    </button>
  );
}

function UserCard({
  user,
  onClick,
}: {
  user: UserResult;
  onClick: () => void;
}) {
  const initials = (user.displayName || user.username || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all hover:bg-zinc-800/60 focus:outline-none border border-transparent hover:border-zinc-700/50"
    >
      {user.avatarUrl ? (
        <Image
          src={resolveImage(user.avatarUrl) || ""}
          alt={user.username}
          width={40}
          height={40}
          unoptimized
          className="h-10 w-10 rounded-full object-cover border border-zinc-700 shrink-0"
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-400">
          {initials}
        </div>
      )}
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-sm font-bold text-zinc-200 group-hover:text-violet-400 transition-colors">
          <span className="truncate">{user.displayName || user.username}</span>
          {user.isVerified && (
            <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-violet-500 text-white text-[8px]">
              ✓
            </span>
          )}
        </p>
        <p className="truncate text-xs text-zinc-500 font-medium">
          @{user.username}
        </p>
      </div>
    </button>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const getPages = (): (number | "…")[] => {
    if (totalPages <= 7)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, "…", totalPages];
    if (page >= totalPages - 3)
      return [
        1,
        "…",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    return [1, "…", page - 1, page, page + 1, "…", totalPages];
  };

  return (
    <div className="flex items-center justify-center gap-1 pt-10 pb-6">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:pointer-events-none disabled:opacity-30 transition-all"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {getPages().map((p, i) =>
        p === "…" ? (
          <span
            key={`ellipsis-${i}`}
            className="flex h-8 w-8 items-center justify-center text-xs text-zinc-600"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            className={cn(
              "flex h-8 min-w-[32px] items-center justify-center rounded-md px-1 text-xs font-bold transition-all",
              p === page
                ? "bg-violet-600 text-white"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-white",
            )}
          >
            {p}
          </button>
        ),
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:pointer-events-none disabled:opacity-30 transition-all"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageInner />
    </Suspense>
  );
}

function SearchPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlQuery = searchParams.get("q") || "";
  const urlPage = Math.max(1, Number(searchParams.get("page")) || 1);
  const urlType = (searchParams.get("type") as TypeFilter) || "all";

  // inputValue is a local typing buffer; activeTab comes directly from URL
  const [inputValue, setInputValue] = useState(urlQuery);
  const activeTab = urlType;

  const [mediaResults, setMediaResults] = useState<SearchResult[]>([]);
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [page, setPage] = useState(urlPage);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [navigating, setNavigating] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const runSearch = useCallback(
    async (q: string, type: TypeFilter, p: number) => {
      if (!q.trim()) {
        setMediaResults([]);
        setUserResults([]);
        setTotalResults(0);
        setTotalPages(0);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await searchApi.search(q.trim(), { type, page: p });
        setMediaResults(result.media || []);
        setUserResults((result.users as UserResult[]) || []);
        setPage(result.page);
        setTotalPages(result.totalPages);
        setTotalResults(result.total);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError("A busca falhou. Por favor, tente novamente.");
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    runSearch(urlQuery, urlType, urlPage);
  }, [urlQuery, urlType, urlPage, runSearch]);

  const pushSearch = (q: string, type: TypeFilter = activeTab, p = 1) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (type !== "all") params.set("type", type);
    if (p > 1) params.set("page", String(p));
    router.push(`/search?${params}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) pushSearch(inputValue.trim(), activeTab);
  };

  const handleTabChange = (tab: TypeFilter) => {
    if (urlQuery) pushSearch(urlQuery, tab);
    // Garante que o scroll volta ao topo ao trocar de aba para evitar que itens fiquem cortados
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePageChange = (p: number) => {
    pushSearch(urlQuery, activeTab, p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleMediaClick = async (item: SearchResult) => {
    const segment = item.mediaType === "movie" ? "movies" : "series";

    // 1. Prioridade: Slug local já conhecido
    if (item.isLocal && item.localSlug) {
      router.push(`/${segment}/${item.localSlug}`);
      return;
    }

    // 2. Fallback: Importar e usar o slug retornado
    setNavigating(item.tmdbId);
    try {
      const { slug } = await mediaApi.import(item.tmdbId, item.mediaType);
      router.push(`/${segment}/${slug}`);
    } catch {
      setError("Falha ao carregar detalhes. Tente novamente.");
      setNavigating(null);
    }
  };

  const handleUserClick = (user: UserResult) => {
    router.push(`/profile/${user.username}`);
  };

  const hasMedia = mediaResults.length > 0;
  const hasUsers = userResults.length > 0;
  const showUsers = activeTab === "all" || activeTab === "users";
  const showMedia = activeTab !== "users";
  const isEmpty = !isLoading && !!urlQuery && !hasMedia && !hasUsers && !error;
  const showEmpty = !isLoading && !urlQuery;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* ── Sticky bar ── */}
      {/* CORREÇÃO: bg-zinc-950/80 para permitir que o backdrop-blur-md funcione e seja mais suave */}
      <div className="sticky top-14 z-30 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Search row */}
          <div className="py-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Buscar filmes, séries, pessoas..."
                  autoFocus={!urlQuery}
                  className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900/50 pl-10 pr-10 text-sm focus:border-violet-500/50 focus:outline-none focus:ring-4 focus:ring-violet-500/10 transition-all"
                />
                {inputValue && (
                  <button
                    type="button"
                    onClick={() => {
                      setInputValue("");
                      inputRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="h-11 rounded-xl bg-violet-600 px-6 text-sm font-bold text-white hover:bg-violet-500 active:scale-95 transition-all shrink-0 shadow-lg shadow-violet-900/20"
              >
                Buscar
              </button>
            </form>
          </div>

          {/* Tabs row */}
          <div className="flex items-center gap-1 pb-0">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleTabChange(tab.value)}
                className={cn(
                  "relative px-4 pb-3 pt-1 text-xs font-bold transition-all",
                  activeTab === tab.value
                    ? "text-violet-400"
                    : "text-zinc-500 hover:text-zinc-300",
                )}
              >
                {tab.label}
                {activeTab === tab.value && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-full" />
                )}
              </button>
            ))}

            <div className="ml-auto pb-3">
              {isLoading && urlQuery && (
                <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-zinc-600">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Buscando
                </span>
              )}
              {!isLoading && totalResults > 0 && (
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">
                  <span className="text-zinc-400">
                    {totalResults.toLocaleString()}
                  </span>{" "}
                  resultados
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Error banner */}
        {error && (
          <div className="mb-8 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-4 text-sm text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span className="flex-1 font-medium">{error}</span>
            <button
              onClick={() => setError(null)}
              className="rounded-lg p-1 hover:bg-red-500/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── Loading ── */}
        {isLoading && (
          <div className="space-y-12">
            {showUsers && (
              <section>
                {/* CORREÇÃO: Título mantido no skeleton para evitar layout shift */}
                <h2 className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 opacity-50">
                  <User2 className="h-3.5 w-3.5" />
                  Pessoas
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: activeTab === "all" ? 3 : 9 }).map(
                    (_, i) => (
                      <SkeletonUserCard key={i} />
                    ),
                  )}
                </div>
              </section>
            )}
            {showMedia && (
              <section>
                {/* CORREÇÃO: Título mantido no skeleton para evitar layout shift */}
                <h2 className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 opacity-50">
                  <Film className="h-3.5 w-3.5" />
                  {activeTab === "movie"
                    ? "Filmes"
                    : activeTab === "series"
                      ? "Séries"
                      : "Filmes & Séries"}
                </h2>
                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-6">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <SkeletonMediaCard key={i} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ── Results ── */}
        {!isLoading && (hasMedia || hasUsers) && (
          <div className="space-y-12">
            {/* Users section */}
            {showUsers && hasUsers && (
              <section>
                {/* CORREÇÃO: Título é sempre exibido independentemente de ser a aba 'all' ou não */}
                <h2 className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                  <User2 className="h-3.5 w-3.5" />
                  Pessoas
                </h2>
                <div
                  className={cn(
                    "pt-2",
                    activeTab === "users"
                      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                      : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
                  )}
                >
                  {userResults.map((user) => (
                    <UserCard
                      key={user.id}
                      user={user}
                      onClick={() => handleUserClick(user)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Media grid */}
            {showMedia && hasMedia && (
              <section>
                {/* CORREÇÃO: Título é sempre exibido, texto ajusta-se à aba */}
                <h2 className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                  <Film className="h-3.5 w-3.5" />
                  {activeTab === "movie"
                    ? "Filmes"
                    : activeTab === "series"
                      ? "Séries"
                      : "Filmes & Séries"}
                </h2>
                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-x-4 gap-y-8 pt-2">
                  {mediaResults.map((item) => (
                    <MediaCard
                      key={`${item.mediaType}-${item.tmdbId}`}
                      item={item}
                      navigating={navigating === item.tmdbId}
                      onClick={() => handleMediaClick(item)}
                    />
                  ))}
                </div>
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </section>
            )}
          </div>
        )}

        {/* ── No results ── */}
        {isEmpty && (
          <div className="flex flex-col items-center py-32 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-900/50">
              <Search className="h-8 w-8 text-zinc-700" />
            </div>
            <p className="text-lg font-bold text-zinc-200">
              Nenhum resultado para &ldquo;{urlQuery}&rdquo;
            </p>
            <p className="mt-2 text-sm text-zinc-500 max-w-xs leading-relaxed">
              Verifique a ortografia ou tente termos mais genéricos.
            </p>
          </div>
        )}

        {/* ── Empty state ── */}
        {showEmpty && (
          <div className="flex flex-col items-center py-32 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-900/50">
              <Film className="h-8 w-8 text-zinc-700" />
            </div>
            <p className="text-lg font-bold text-zinc-200">
              Explore o catálogo
            </p>
            <p className="mt-2 text-sm text-zinc-500 max-w-xs leading-relaxed">
              Procure por milhões de filmes, séries e conecte-se com outras
              pessoas.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
