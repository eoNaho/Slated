"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BookX, Plus, Search, RefreshCw, Loader2, Pencil, Trash2,
  ToggleLeft, ToggleRight, Upload, X, Check,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorBanner } from "@/components/ui/error-banner";

interface BlocklistEntry {
  id: string;
  word: string;
  matchType: "exact" | "contains" | "regex";
  severity: "low" | "medium" | "high";
  category: "profanity" | "slur" | "spam" | "custom";
  isActive: boolean;
  addedBy: string | null;
  createdAt: string;
}

interface BlocklistResponse {
  data: BlocklistEntry[];
  total: number;
  page: number;
  limit: number;
}

const SEVERITY_STYLES: Record<string, string> = {
  low:    "text-zinc-400 bg-zinc-800/60 border-zinc-700",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  high:   "text-red-400 bg-red-500/10 border-red-500/20",
};

const CATEGORY_STYLES: Record<string, string> = {
  profanity: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  slur:      "text-red-400 bg-red-500/10 border-red-500/20",
  spam:      "text-amber-400 bg-amber-500/10 border-amber-500/20",
  custom:    "text-violet-400 bg-violet-500/10 border-violet-500/20",
};

const MATCH_TYPE_LABELS: Record<string, string> = {
  exact: "Exato", contains: "Contém", regex: "Regex",
};

interface EntryFormData {
  word: string;
  matchType: "exact" | "contains" | "regex";
  severity: "low" | "medium" | "high";
  category: "profanity" | "slur" | "spam" | "custom";
}

const EMPTY_FORM: EntryFormData = {
  word: "", matchType: "contains", severity: "medium", category: "profanity",
};

export function BlocklistManager() {
  const [entries, setEntries] = useState<BlocklistEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Add/edit form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EntryFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk import
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ page: String(p), limit: "30" });
      if (debouncedSearch) q.set("q", debouncedSearch);
      const res = await apiFetch<BlocklistResponse>(`/admin/blocklist?${q}`);
      setEntries((prev) => (p === 1 ? res.data : [...prev, ...res.data]));
      setTotal(res.total);
      setHasMore(res.data.length === 30);
      setPage(p);
    } catch {
      setError("Falha ao carregar blocklist.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => { load(1); }, [load]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (entry: BlocklistEntry) => {
    setEditingId(entry.id);
    setForm({ word: entry.word, matchType: entry.matchType, severity: entry.severity, category: entry.category });
    setShowForm(true);
  };

  const saveForm = async () => {
    if (!form.word.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        const updated = await apiFetch<BlocklistEntry>(`/admin/blocklist/${editingId}`, { method: "PATCH", body: form });
        setEntries((prev) => prev.map((e) => (e.id === editingId ? updated : e)));
      } else {
        const created = await apiFetch<BlocklistEntry>("/admin/blocklist", { method: "POST", body: form });
        setEntries((prev) => [created, ...prev]);
        setTotal((t) => t + 1);
      }
      setShowForm(false);
    } catch {
      setError("Falha ao salvar entry.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (entry: BlocklistEntry) => {
    try {
      const updated = await apiFetch<BlocklistEntry>(`/admin/blocklist/${entry.id}`, {
        method: "PATCH",
        body: { isActive: !entry.isActive },
      });
      setEntries((prev) => prev.map((e) => (e.id === entry.id ? updated : e)));
    } catch {
      setError("Falha ao atualizar status.");
    }
  };

  const deleteEntry = async () => {
    if (!deletingId) return;
    setDeleting(true);
    try {
      await apiFetch(`/admin/blocklist/${deletingId}`, { method: "DELETE" });
      setEntries((prev) => prev.filter((e) => e.id !== deletingId));
      setTotal((t) => t - 1);
      setDeletingId(null);
    } catch {
      setError("Falha ao deletar entry.");
    } finally {
      setDeleting(false);
    }
  };

  const bulkImport = async () => {
    if (!importText.trim()) return;
    setImporting(true);
    try {
      const words = importText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((word) => ({ word }));
      const res = await apiFetch<{ data: { inserted: number } }>("/admin/blocklist/import", {
        method: "POST",
        body: { words },
      });
      setShowImport(false);
      setImportText("");
      await load(1);
      setError(null);
      // Show success briefly
      setError(`${res.data.inserted} palavras importadas com sucesso.`);
      setTimeout(() => setError(null), 3000);
    } catch {
      setError("Falha ao importar palavras.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader
        section="Sistema"
        title="Blocklist de Conteúdo"
        icon={BookX}
        badge={total}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-zinc-400 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <Upload className="w-4 h-4" /> Importar
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-accent hover:bg-accent/90 transition-colors"
            >
              <Plus className="w-4 h-4" /> Adicionar
            </button>
            <button onClick={() => load(1)} className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar palavra…"
          className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-accent/50 transition-colors"
        />
      </div>

      {error && (
        <ErrorBanner
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Table */}
      {loading && page === 1 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 text-sm">
          <BookX className="w-10 h-10 mb-3 opacity-30" />
          <p>Nenhuma entrada encontrada.</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Palavra</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Tipo</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Categoria</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Severity</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 font-mono text-sm text-white">{entry.word}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-zinc-400 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                      {MATCH_TYPE_LABELS[entry.matchType]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${CATEGORY_STYLES[entry.category]}`}>
                      {entry.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${SEVERITY_STYLES[entry.severity]}`}>
                      {entry.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(entry)}
                      className="flex items-center gap-1.5 text-xs transition-colors"
                    >
                      {entry.isActive ? (
                        <><ToggleRight className="w-4 h-4 text-emerald-400" /><span className="text-emerald-400">Ativo</span></>
                      ) : (
                        <><ToggleLeft className="w-4 h-4 text-zinc-600" /><span className="text-zinc-600">Inativo</span></>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEdit(entry)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingId(entry.id)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {hasMore && (
            <div className="p-3 border-t border-white/5">
              <button
                onClick={() => load(page + 1)}
                disabled={loading}
                className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Carregar mais"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass-card rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                {editingId ? "Editar Entrada" : "Nova Entrada"}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Palavra / Padrão</label>
                <input
                  type="text"
                  value={form.word}
                  onChange={(e) => setForm({ ...form, word: e.target.value })}
                  placeholder="ex: palavrão, spam.*, ..."
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-accent/50 font-mono"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Tipo</label>
                  <select
                    value={form.matchType}
                    onChange={(e) => setForm({ ...form, matchType: e.target.value as EntryFormData["matchType"] })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-sm text-white focus:outline-none focus:border-accent/50"
                  >
                    <option value="exact">Exato</option>
                    <option value="contains">Contém</option>
                    <option value="regex">Regex</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Severity</label>
                  <select
                    value={form.severity}
                    onChange={(e) => setForm({ ...form, severity: e.target.value as EntryFormData["severity"] })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-sm text-white focus:outline-none focus:border-accent/50"
                  >
                    <option value="low">Baixo</option>
                    <option value="medium">Médio</option>
                    <option value="high">Alto</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Categoria</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as EntryFormData["category"] })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-sm text-white focus:outline-none focus:border-accent/50"
                  >
                    <option value="profanity">Profanity</option>
                    <option value="slur">Slur</option>
                    <option value="spam">Spam</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2 rounded-lg text-sm font-medium text-zinc-400 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveForm}
                disabled={saving || !form.word.trim()}
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-accent hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm glass-card rounded-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Remover entrada?</h3>
                <p className="text-sm text-zinc-400 mt-1">
                  Esta entrada será removida da blocklist. O filtro de conteúdo será atualizado automaticamente.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 py-2 rounded-lg text-sm font-medium text-zinc-400 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={deleteEntry}
                disabled={deleting}
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-red-500/80 hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass-card rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Importar Palavras</h3>
              <button onClick={() => setShowImport(false)} className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-500">
              Cole uma palavra por linha. Todas serão importadas como <span className="text-zinc-300 font-mono">contains / medium / profanity</span>.
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={"palavra1\npalavra2\npalavra3"}
              rows={10}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-accent/50 font-mono resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowImport(false)}
                className="flex-1 py-2 rounded-lg text-sm font-medium text-zinc-400 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={bulkImport}
                disabled={importing || !importText.trim()}
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-accent hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Importar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
