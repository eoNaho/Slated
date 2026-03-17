"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ChevronLeft,
  Save,
  Trash2,
  Globe,
  Lock,
  Loader2,
  AlertTriangle,
  ImagePlus,
  X,
  Upload,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import type { Club } from "@/lib/queries/clubs";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

async function apiFetch(endpoint: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...opts,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts.headers ?? {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error || "Erro na requisição");
  }
  return res.json();
}

const CLUB_CATEGORIES = [
  { value: "action", label: "Action" },
  { value: "comedy", label: "Comedy" },
  { value: "drama", label: "Drama" },
  { value: "horror", label: "Horror" },
  { value: "sci-fi", label: "Sci-Fi" },
  { value: "thriller", label: "Thriller" },
  { value: "romance", label: "Romance" },
  { value: "crime", label: "Crime" },
  { value: "fantasy", label: "Fantasy" },
  { value: "mystery", label: "Mystery" },
  { value: "animation", label: "Animation" },
  { value: "anime", label: "Anime" },
  { value: "documentary", label: "Documentary" },
  { value: "musical", label: "Musical" },
  { value: "by-director", label: "Por Diretor" },
  { value: "by-actor", label: "Por Ator" },
  { value: "by-decade", label: "Por Década" },
  { value: "by-country", label: "Por País" },
  { value: "general", label: "Geral" },
];

export function ClubSettingsClient({ slug }: { slug: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [club, setClub] = useState<Club | null>(null);
  const [status, setStatus] = useState<"loading" | "forbidden" | "not_found" | "ok">("loading");

  // Banner state
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerRemoving, setBannerRemoving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [allowJoinRequests, setAllowJoinRequests] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch(`${API_URL}/clubs/${slug}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (res.status === 403) { setStatus("forbidden"); return; }
      if (res.status === 404 || !res.ok) { setStatus("not_found"); return; }

      const data: { data: Club } = await res.json();
      const c = data.data;

      if (!c.myRole || c.myRole === "member") { setStatus("forbidden"); return; }

      setClub(c);
      setCoverUrl(c.coverUrl);
      setName(c.name);
      setDescription(c.description ?? "");
      setIsPublic(c.isPublic);
      setAllowJoinRequests(c.allowJoinRequests);
      setCategories(c.categories ?? []);
      setStatus("ok");
    }
    load();
  }, [slug]);

  // ── Banner handlers ─────────────────────────────────────────────────────────

  function handleBannerSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Apenas JPEG, PNG e WebP são suportados.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter menos de 5MB.");
      return;
    }

    setBannerFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setBannerPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleBannerUpload() {
    if (!bannerFile || !club) return;
    setBannerUploading(true);
    try {
      const formData = new FormData();
      formData.append("cover", bannerFile);
      const res = await fetch(`${API_URL}/clubs/${club.id}/cover`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error || "Erro no upload");
      }
      const data = await res.json();
      setCoverUrl(data.data.coverUrl);
      setBannerPreview(null);
      setBannerFile(null);
      toast.success("Banner atualizado!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setBannerUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleCancelBanner() {
    setBannerFile(null);
    setBannerPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleRemoveBanner() {
    if (!club || !confirm("Remover o banner do club?")) return;
    setBannerRemoving(true);
    try {
      await apiFetch(`/clubs/${club.id}/cover`, { method: "DELETE" });
      setCoverUrl(null);
      toast.success("Banner removido.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover banner");
    } finally {
      setBannerRemoving(false);
    }
  }

  // ── Form handlers ───────────────────────────────────────────────────────────

  function toggleCategory(val: string) {
    setCategories((prev) =>
      prev.includes(val)
        ? prev.filter((c) => c !== val)
        : prev.length < 3 ? [...prev, val] : prev
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!club) return;
    setSaving(true);
    try {
      await apiFetch(`/clubs/${club.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, description: description || undefined, isPublic, allowJoinRequests, categories }),
      });
      toast.success("Club atualizado!");
      router.push(`/clubs/${slug}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!club || deleteConfirm !== club.name) return;
    setDeleting(true);
    try {
      await apiFetch(`/clubs/${club.id}`, { method: "DELETE" });
      toast.success("Club excluído.");
      router.push("/clubs");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir");
      setDeleting(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (status === "forbidden") {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 text-center px-6">
        <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center text-3xl">🔒</div>
        <h1 className="text-xl font-semibold text-white">Acesso negado</h1>
        <p className="text-zinc-500 text-sm">Só donos e moderadores podem acessar as configurações.</p>
        <Link href={`/clubs/${slug}`} className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
          Voltar ao club
        </Link>
      </div>
    );
  }

  if (status === "not_found" || !club) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 text-center px-6">
        <h1 className="text-xl font-semibold text-white">Club não encontrado</h1>
        <Link href="/clubs" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">Ver todos os clubs</Link>
      </div>
    );
  }

  const isOwner = club.myRole === "owner" || club.ownerId === session?.user?.id;
  const displayBanner = bannerPreview ?? coverUrl;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-white/5 pt-8 pb-6">
        <div className="container mx-auto px-6 max-w-2xl">
          <Link href={`/clubs/${slug}`} className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-4">
            <ChevronLeft className="h-3.5 w-3.5" /> Voltar ao club
          </Link>
          <h1 className="text-2xl font-bold text-white">Configurações do Club</h1>
          <p className="text-zinc-500 text-sm mt-1">{club.name}</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 max-w-2xl space-y-6">

        {/* ── Banner ─────────────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-white/8 bg-zinc-900/40 overflow-hidden">
          <div className="p-5 pb-4">
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4">Banner do Club</h2>

            {/* Preview area */}
            <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-purple-900/40 via-zinc-800 to-indigo-900/30 border border-white/6"
              style={{ aspectRatio: "3/1" }}>
              {displayBanner ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displayBanner} alt="Banner" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-zinc-700">
                  <ImagePlus className="h-8 w-8" />
                  <span className="text-xs">Sem banner</span>
                </div>
              )}

              {/* Preview badge */}
              {bannerPreview && (
                <div className="absolute top-2 left-2 text-[10px] font-bold text-white bg-purple-600 px-2 py-0.5 rounded-full">
                  Pré-visualização
                </div>
              )}

              {/* Remove button (only on saved cover, not preview) */}
              {coverUrl && !bannerPreview && (
                <button
                  onClick={handleRemoveBanner}
                  disabled={bannerRemoving}
                  title="Remover banner"
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-zinc-300 hover:text-white hover:bg-black/70 transition-all"
                >
                  {bannerRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              )}
            </div>

            {/* Upload controls */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleBannerSelect}
            />

            <div className="flex items-center gap-2 mt-3">
              {!bannerPreview ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-white/8 text-zinc-300 hover:border-purple-500/40 hover:text-white transition-all"
                >
                  <ImagePlus className="h-4 w-4" />
                  {coverUrl ? "Trocar banner" : "Enviar banner"}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleBannerUpload}
                    disabled={bannerUploading}
                    className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium disabled:opacity-50 transition-all"
                  >
                    {bannerUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {bannerUploading ? "Enviando..." : "Salvar banner"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelBanner}
                    disabled={bannerUploading}
                    className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-white/8 text-zinc-400 hover:text-zinc-200 transition-all"
                  >
                    <X className="h-4 w-4" /> Cancelar
                  </button>
                </>
              )}
              <span className="text-xs text-zinc-600">JPEG, PNG ou WebP · máx. 5MB · proporção 3:1 recomendada</span>
            </div>
          </div>
        </div>

        {/* ── Info Form ──────────────────────────────────────────────────────── */}
        <form onSubmit={handleSave} className="rounded-xl border border-white/8 bg-zinc-900/40 p-6 space-y-5">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Informações do Club</h2>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nome do Club</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required minLength={3} maxLength={60}
              className="w-full bg-zinc-800/60 border border-white/8 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Descrição <span className="text-zinc-600">(opcional)</span></label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500} rows={3}
              placeholder="Sobre o que é este club..."
              className="w-full bg-zinc-800/60 border border-white/8 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
            />
            <div className="text-right text-[11px] text-zinc-600 mt-1">{description.length}/500</div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Visibilidade</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setIsPublic(true)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm transition-all ${isPublic ? "border-purple-500/50 bg-purple-600/15 text-white" : "border-white/8 text-zinc-500 hover:border-white/16"}`}>
                <Globe className="h-4 w-4" /> Público
              </button>
              <button type="button" onClick={() => setIsPublic(false)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm transition-all ${!isPublic ? "border-purple-500/50 bg-purple-600/15 text-white" : "border-white/8 text-zinc-500 hover:border-white/16"}`}>
                <Lock className="h-4 w-4" /> Privado
              </button>
            </div>
          </div>

          {!isPublic && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/40 border border-white/5">
              <div>
                <p className="text-sm text-zinc-200">Aceitar solicitações de entrada</p>
                <p className="text-xs text-zinc-500 mt-0.5">Membros podem pedir para entrar no club privado</p>
              </div>
              <button type="button" onClick={() => setAllowJoinRequests((v) => !v)}
                className={`relative w-10 h-5 rounded-full transition-colors ${allowJoinRequests ? "bg-purple-600" : "bg-zinc-700"}`}>
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${allowJoinRequests ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">
              Categorias <span className="text-zinc-600">({categories.length}/3)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {CLUB_CATEGORIES.map((cat) => {
                const selected = categories.includes(cat.value);
                return (
                  <button key={cat.value} type="button" onClick={() => toggleCategory(cat.value)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${selected ? "border-purple-500/60 bg-purple-600/20 text-purple-300" : "border-white/8 text-zinc-500 hover:border-white/20 hover:text-zinc-300"}`}>
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button type="submit" disabled={saving || !name.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar alterações
          </button>
        </form>

        {/* ── Danger Zone ────────────────────────────────────────────────────── */}
        {isOwner && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Zona de Perigo
            </h2>

            {!showDelete ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-200">Excluir este club</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Esta ação é irreversível. Todos os dados serão perdidos.</p>
                </div>
                <button onClick={() => setShowDelete(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 text-sm font-medium transition-all">
                  <Trash2 className="h-4 w-4" /> Excluir
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-zinc-300">
                  Para confirmar, digite o nome do club: <span className="font-semibold text-white">{club.name}</span>
                </p>
                <input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder={club.name}
                  className="w-full bg-zinc-800/60 border border-red-500/30 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-red-500/60 transition-colors" />
                <div className="flex gap-2">
                  <button onClick={handleDelete} disabled={deleting || deleteConfirm !== club.name}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Excluir permanentemente
                  </button>
                  <button onClick={() => { setShowDelete(false); setDeleteConfirm(""); }}
                    className="px-4 py-2 rounded-lg border border-white/8 text-zinc-400 hover:text-zinc-200 text-sm transition-colors">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
