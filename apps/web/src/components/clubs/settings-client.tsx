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
  CheckCircle2,
  UserX,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import type { Club } from "@/lib/queries/clubs";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

const inputCls = "w-full bg-zinc-950/50 border border-white/5 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-purple-500/10 focus:border-purple-500/30 transition-all font-medium";
const btnPrimaryCls = "h-12 px-8 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-purple-900/10";
const btnGhostCls = "h-12 px-8 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95";
const cardCls = "relative rounded-[2rem] border border-white/5 bg-zinc-900/40 backdrop-blur-xl overflow-hidden shadow-2xl";
const labelCls = "block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2.5 ml-1";

async function apiFetch(endpoint: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...opts,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts.headers ?? {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error || "Request failed");
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
  { value: "by-director", label: "By Director" },
  { value: "by-actor", label: "By Actor" },
  { value: "by-decade", label: "By Decade" },
  { value: "by-country", label: "By Country" },
  { value: "general", label: "General" },
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
      toast.error("Only JPEG, PNG and WebP are supported.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB.");
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
      toast.success("Banner updated!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
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
    if (!club || !confirm("Remove the club banner?")) return;
    setBannerRemoving(true);
    try {
      await apiFetch(`/clubs/${club.id}/cover`, { method: "DELETE" });
      setCoverUrl(null);
      toast.success("Banner removed.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error removing banner");
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
      toast.success("Club updated!");
      router.push(`/clubs/${slug}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error saving");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!club || deleteConfirm !== club.name) return;
    setDeleting(true);
    try {
      await apiFetch(`/clubs/${club.id}`, { method: "DELETE" });
      toast.success("Club deleted.");
      router.push("/clubs");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error deleting");
      setDeleting(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center relative overflow-hidden">
        <div className="fixed inset-0 bg-gradient-to-br from-black via-purple-900/5 to-black -z-10" />
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (status === "forbidden") {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-6 text-center px-6 relative overflow-hidden">
        <div className="fixed inset-0 bg-gradient-to-br from-black via-purple-900/5 to-black -z-10" />
        <div className="w-20 h-20 rounded-[2rem] bg-zinc-900 border border-white/5 flex items-center justify-center text-3xl shadow-2xl relative group">
          <div className="absolute inset-0 bg-purple-500/20 blur-2xl opacity-50" />
          <Lock className="h-8 w-8 text-zinc-400 relative z-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-white tracking-tight">Access Denied</h1>
          <p className="text-zinc-500 text-sm font-medium">Only owners and moderators can access settings.</p>
        </div>
        <Link 
          href={`/clubs/${slug}`} 
          className="h-11 px-6 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 text-sm font-bold text-zinc-300 hover:text-white transition-all hover:scale-105 active:scale-95"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Club
        </Link>
      </div>
    );
  }

  if (status === "not_found" || !club) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-6 text-center px-6 relative overflow-hidden">
        <div className="fixed inset-0 bg-gradient-to-br from-black via-purple-900/5 to-black -z-10" />
        <h1 className="text-2xl font-black text-white tracking-tight">Club Not Found</h1>
        <Link 
          href="/clubs" 
          className="h-11 px-6 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center gap-2 text-sm font-bold text-purple-400 hover:text-purple-300 transition-all hover:scale-105 active:scale-95"
        >
          Browse Clubs
        </Link>
      </div>
    );
  }

  const isOwner = club.myRole === "owner" || club.ownerId === session?.user?.id;
  const displayBanner = bannerPreview ?? coverUrl;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 selection:bg-purple-500/30 selection:text-purple-100 relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-black via-purple-900/5 to-black -z-10" />
      
      {/* Header */}
      <div className="relative pt-12 pb-10 border-b border-white/5">
        {/* Artistic Grid */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,#fff_2px,#fff_3px)]" />
        
        <div className="container mx-auto px-6 max-w-3xl relative z-10">
          <Link
            href={`/clubs/${slug}`}
            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-purple-400 transition-all mb-8 group"
          >
            <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Club
          </Link>
          
          <div className="flex flex-col gap-1">
            <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight">
              Club Settings
            </h1>
            <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">{club.name}</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12 max-w-3xl space-y-10 relative z-10">

        {/* ── Banner ─────────────────────────────────────────────────────────── */}
        <div className={cardCls}>
          <div className="p-8 pb-7">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 mb-6 flex items-center gap-2">
              <Upload className="h-3.5 w-3.5 text-purple-400" /> Club Banner
            </h2>

            {/* Preview area */}
            <div className="relative rounded-2xl overflow-hidden bg-zinc-950 border border-white/5 shadow-inner group/banner"
              style={{ aspectRatio: "21/9" }}>
              {displayBanner ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displayBanner} alt="Banner" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-zinc-800 bg-gradient-to-br from-zinc-900 to-black">
                  <ImagePlus className="h-10 w-10 opacity-20" />
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-40">No banner set</span>
                </div>
              )}
              
              <div className="absolute inset-0 bg-black/20 group-hover/banner:bg-black/10 transition-colors" />

              {/* Preview badge */}
              {bannerPreview && (
                <div className="absolute top-4 left-4 text-[9px] font-black uppercase tracking-widest text-white bg-purple-600 px-3 py-1 rounded-full shadow-lg backdrop-blur-md animate-pulse">
                  Preview Mode
                </div>
              )}

              {/* Remove button */}
              {coverUrl && !bannerPreview && (
                <button
                  onClick={handleRemoveBanner}
                  disabled={bannerRemoving}
                  title="Remove banner"
                  className="absolute top-4 right-4 p-2.5 rounded-xl bg-black/60 text-zinc-400 hover:text-red-400 hover:bg-red-950/40 border border-white/5 backdrop-blur-md transition-all opacity-0 group-hover/banner:opacity-100"
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

            <div className="flex flex-wrap items-center gap-4 mt-6">
              {!bannerPreview ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={btnGhostCls}
                >
                  <ImagePlus className="h-4 w-4" />
                  {coverUrl ? "Change Banner" : "Upload Banner"}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleBannerUpload}
                    disabled={bannerUploading}
                    className={btnPrimaryCls}
                  >
                    {bannerUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {bannerUploading ? "Uploading..." : "Save Banner"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelBanner}
                    disabled={bannerUploading}
                    className={btnGhostCls}
                  >
                    <X className="h-4 w-4" /> Cancel
                  </button>
                </div>
              )}
              <div className="flex flex-col gap-0.5 ml-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Format: JPEG, PNG, WebP</span>
                <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest">Max Size: 5MB · Recommended: 3:1 ratio</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Info Form ──────────────────────────────────────────────────────── */}
        <form onSubmit={handleSave} className={`${cardCls} p-8 space-y-8`}>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 text-purple-400" /> Club Information
          </h2>

          <div className="grid gap-6">
            <div>
              <label className={labelCls}>Club Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required minLength={3} maxLength={60}
                className={inputCls}
                placeholder="The name of your club..."
              />
            </div>

            <div>
              <label className={labelCls}>Description <span className="text-zinc-700 opacity-50">(optional)</span></label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500} rows={4}
                placeholder="Tell the world what this club is about..."
                className={`${inputCls} resize-none`}
              />
              <div className="text-right text-[9px] font-black uppercase tracking-widest text-zinc-700 mt-2 px-1">{description.length} / 500</div>
            </div>
          </div>

          <div className="space-y-4">
            <label className={labelCls}>Visibility</label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button" 
                onClick={() => setIsPublic(true)}
                className={`flex items-center gap-3 px-6 py-4 rounded-2xl border transition-all shadow-lg ${isPublic ? "border-purple-500/50 bg-purple-500/10 text-white shadow-purple-500/10" : "border-white/5 bg-white/20 text-zinc-500 hover:bg-white/5 hover:border-white/10"}`}
              >
                <div className={`p-2 rounded-lg ${isPublic ? "bg-purple-500 text-white" : "bg-zinc-800 text-zinc-600"}`}>
                  <Globe className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <span className="block text-xs font-black uppercase tracking-widest">Public</span>
                  <span className="block text-[10px] opacity-60">Anyone can join</span>
                </div>
              </button>
              <button 
                type="button" 
                onClick={() => setIsPublic(false)}
                className={`flex items-center gap-3 px-6 py-4 rounded-2xl border transition-all shadow-lg ${!isPublic ? "border-purple-500/50 bg-purple-500/10 text-white shadow-purple-500/10" : "border-white/5 bg-white/2 bg-zinc-800/20 text-zinc-500 hover:bg-white/5 hover:border-white/10"}`}
              >
                <div className={`p-2 rounded-lg ${!isPublic ? "bg-purple-500 text-white" : "bg-zinc-800 text-zinc-600"}`}>
                  <Lock className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <span className="block text-xs font-black uppercase tracking-widest">Private</span>
                  <span className="block text-[10px] opacity-60">Requires approval</span>
                </div>
              </button>
            </div>
          </div>

          {!isPublic && (
            <div className="flex items-center justify-between p-5 rounded-2xl bg-white/2 border border-white/5">
              <div className="space-y-0.5">
                <p className="text-xs font-black uppercase tracking-widest text-zinc-300">Allow Join Requests</p>
                <p className="text-[10px] text-zinc-500 font-medium">Members can request to join this private club</p>
              </div>
              <button 
                type="button" 
                onClick={() => setAllowJoinRequests((v) => !v)}
                className={`relative w-11 h-6 rounded-full transition-all duration-300 ${allowJoinRequests ? "bg-purple-600 shadow-lg shadow-purple-600/20" : "bg-zinc-800"}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 shadow-md ${allowJoinRequests ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
          )}

          <div>
            <label className={labelCls}>
              Categories <span className="text-zinc-700 opacity-50">({categories.length} / 3 selected)</span>
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              {CLUB_CATEGORIES.map((cat) => {
                const selected = categories.includes(cat.value);
                return (
                  <button 
                    key={cat.value} 
                    type="button" 
                    onClick={() => toggleCategory(cat.value)}
                    className={`text-[10px] font-black uppercase tracking-[0.15em] px-4 py-2 rounded-xl border transition-all ${selected ? "border-purple-500/50 bg-purple-500/10 text-purple-300 shadow-lg shadow-purple-500/10" : "border-white/5 text-zinc-600 hover:border-white/10 hover:text-zinc-400 hover:bg-white/5"}`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-white/5">
            <button type="submit" disabled={saving || !name.trim()} className={btnPrimaryCls}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </button>
          </div>
        </form>

        {/* ── Danger Zone ────────────────────────────────────────────────────── */}
        {isOwner && (
          <div className="relative rounded-[2rem] border border-red-500/10 bg-red-500/5 p-8 space-y-6 overflow-hidden">
            <div className="absolute inset-0 bg-red-500/[0.02] -z-10" />
            
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Danger Zone
            </h2>

            {!showDelete ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 rounded-2xl bg-white/2 border border-white/5">
                <div className="space-y-1">
                  <p className="text-sm font-black uppercase tracking-widest text-zinc-100">Delete this Club</p>
                  <p className="text-xs text-zinc-500 font-medium">This action is irreversible. All data will be lost forever.</p>
                </div>
                <button 
                  onClick={() => setShowDelete(true)}
                  className="h-11 px-6 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Club
                </button>
              </div>
            ) : (
              <div className="space-y-6 p-6 rounded-2xl bg-white/2 border border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-red-300 uppercase tracking-widest">
                    Confirm deletion by typing: <span className="text-white select-all">{club.name}</span>
                  </p>
                  <input 
                    value={deleteConfirm} 
                    onChange={(e) => setDeleteConfirm(e.target.value)} 
                    placeholder={club.name}
                    className="w-full bg-black/40 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-800 focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500/40 transition-all font-medium" 
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleDelete} 
                    disabled={deleting || deleteConfirm !== club.name}
                    className="h-11 px-6 rounded-xl bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                  >
                    {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    Confirm Delete
                  </button>
                  <button 
                    onClick={() => { setShowDelete(false); setDeleteConfirm(""); }}
                    className="h-11 px-6 rounded-xl border border-white/10 text-zinc-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Cancel
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
