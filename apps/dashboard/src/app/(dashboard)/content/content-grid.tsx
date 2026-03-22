"use client";

import { useState, useEffect, useCallback } from "react";
import { Film, Search, Loader2, RefreshCw, Star, Tv } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorBanner } from "@/components/ui/error-banner";

interface MediaItem {
  id: string;
  title: string;
  type: "movie" | "series";
  year?: number | null;
  posterUrl?: string | null;
  rating?: number | null;
}

export function ContentGrid() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const limit = 24;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set("q", search);
      const res = await apiFetch<any>(`/media?${params}`);
      const data = res.data ?? res;
      setItems(Array.isArray(data) ? data : []);
      setTotal(res.total ?? res.pagination?.total ?? 0);
    } catch {
      setError("Falha ao carregar mídias.");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader
        section="Content"
        title="Catálogo"
        icon={Film}
        badge={total}
        actions={
          <button onClick={load} className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        }
      />

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por título..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-accent/40 transition-colors"
          />
        </div>
        <button type="submit" className="px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors">
          Buscar
        </button>
      </form>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 text-sm">
          <Film className="w-10 h-10 mb-3 opacity-30" />
          <p>Nenhuma mídia encontrada.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
            {items.map((item) => (
              <div key={item.id} className="space-y-2">
                <div className="aspect-[2/3] rounded-xl overflow-hidden bg-zinc-800 border border-white/5 relative">
                  {item.posterUrl
                    ? <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-zinc-700">{item.type === "series" ? <Tv className="w-8 h-8" /> : <Film className="w-8 h-8" />}</div>
                  }
                  <div className="absolute top-1.5 left-1.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${item.type === "series" ? "bg-blue-500/80 text-white" : "bg-purple-500/80 text-white"}`}>
                      {item.type === "series" ? "Série" : "Filme"}
                    </span>
                  </div>
                  {item.rating != null && (
                    <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 bg-black/70 rounded-md px-1.5 py-0.5">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span className="text-[10px] font-bold text-white">{Number(item.rating).toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-300 truncate">{item.title}</p>
                  {item.year && <p className="text-[11px] text-zinc-600">{item.year}</p>}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/5 border border-white/10 disabled:opacity-30 transition-colors">Anterior</button>
              <span className="text-sm text-zinc-500">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/5 border border-white/10 disabled:opacity-30 transition-colors">Próxima</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
