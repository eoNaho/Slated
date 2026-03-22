"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  Lock,
  Eye,
  Bell,
  MapPin,
  Globe,
  FileText,
  AtSign,
  Mail,
  KeyRound,
  UserX,
  X,
  BookOpen,
  Clock,
  Heart,
  Users,
  MessageSquare,
  Newspaper,
  CheckCircle2,
  Camera,
  Trash2,
  Sparkles,
  RefreshCw,
  Puzzle,
  Copy,
  Plus,
  Twitter,
  Instagram,
  Clapperboard,
  Film,
  Palette,
  Crown,
  Ban,
  Loader2,
} from "lucide-react";
import { identityApi } from "@/lib/api";
import type { ProfileFrame, ProfileTitle, UserIdentity } from "@/types";
import { useSession, authClient } from "@/lib/auth-client";
import { resolveImage } from "@/lib/utils";
import { useApiTokens } from "@/hooks/queries/use-api-tokens";
import { useIdentityData } from "@/hooks/queries/use-identity";
import { useUserProfile } from "@/hooks/queries/use-user-profile";
import { useCloseFriends, useToggleCloseFriend } from "@/hooks/queries/use-stories";
import { api } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

type Section =
  | "profile"
  | "account"
  | "privacy"
  | "notifications"
  | "extension"
  | "identity"
  | "blocked";

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative w-10 h-5 rounded-full flex-shrink-0 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
      style={{
        background: checked
          ? "linear-gradient(135deg, #9918f5 0%, #8600e5 100%)"
          : "rgba(255,255,255,0.08)",
      }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
        style={{ left: checked ? "calc(100% - 18px)" : "2px" }}
      />
    </button>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────

function Field({
  label,
  icon: Icon,
  hint,
  readOnly,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon?: React.ElementType;
  hint?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </label>
      <input
        {...props}
        readOnly={readOnly}
        className={`w-full px-3.5 py-2.5 rounded-xl text-sm transition-all focus:outline-none ${
          readOnly
            ? "bg-zinc-900/40 border border-zinc-800/50 text-zinc-500 cursor-default select-none"
            : "bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/20"
        }`}
      />
      {hint && <p className="text-[11px] text-zinc-600">{hint}</p>}
    </div>
  );
}

function TextareaField({
  label,
  icon: Icon,
  hint,
  maxLength,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  icon?: React.ElementType;
  hint?: string;
}) {
  const val = String(props.value ?? "");
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
          {Icon && <Icon className="h-3 w-3" />}
          {label}
        </label>
        {maxLength && (
          <span
            className="text-[10px] tabular-nums"
            style={{
              color:
                val.length > maxLength * 0.9
                  ? "#f5c518"
                  : "rgba(255,255,255,0.2)",
            }}
          >
            {maxLength - val.length}
          </span>
        )}
      </div>
      <textarea
        {...props}
        maxLength={maxLength}
        className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/20 resize-none transition-all"
      />
      {hint && <p className="text-[11px] text-zinc-600">{hint}</p>}
    </div>
  );
}

// ── ToggleRow ─────────────────────────────────────────────────────────────────

function ToggleRow({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-zinc-800/50 last:border-0">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon className="h-3.5 w-3.5 text-zinc-500" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-200">{label}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="ml-6 flex-shrink-0">
        <Toggle checked={checked} onChange={onChange} />
      </div>
    </div>
  );
}

// ── SaveButton ─────────────────────────────────────────────────────────────────

function SaveButton({ loading, saved }: { loading: boolean; saved: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.97] disabled:opacity-60"
      style={{
        background: saved
          ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
          : "linear-gradient(135deg, #9918f5 0%, #8600e5 100%)",
        boxShadow: "0 0 20px rgba(153,24,245,0.3)",
      }}
    >
      {saved ? (
        <>
          <CheckCircle2 className="h-4 w-4" />
          Saved
        </>
      ) : loading ? (
        <span className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          Saving…
        </span>
      ) : (
        "Save changes"
      )}
    </button>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6 pb-5 border-b border-zinc-800/60">
      <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
      <p className="text-sm text-zinc-500 mt-1">{description}</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

// ── Close Friends Section ─────────────────────────────────────────────────────

function CloseFriendsSection() {
  const { data: friends = [], isLoading } = useCloseFriends();
  const toggleFriend = useToggleCloseFriend();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; username: string; displayName?: string | null; avatarUrl?: string | null }[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await api.users.search(q);
      setSearchResults(res.data ?? []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-green-400" />
        <h3 className="text-sm font-semibold text-white">Amigos Próximos</h3>
        <span className="text-xs text-white/40 ml-1">Veem seus stories exclusivos</span>
      </div>

      <div className="rounded-2xl border border-zinc-800/60 overflow-hidden mb-3" style={{ background: "rgba(24,24,27,0.5)" }}>
        <div className="p-4">
          <input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar usuário para adicionar..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-green-500/40 transition-colors placeholder:text-white/30"
          />
          {searchQuery && (
            <div className="mt-2 space-y-1">
              {searching ? (
                <p className="text-white/30 text-xs py-2 text-center">Buscando...</p>
              ) : searchResults.length === 0 ? (
                <p className="text-white/30 text-xs py-2 text-center">Nenhum usuário encontrado</p>
              ) : searchResults.slice(0, 5).map((u) => {
                const isAlready = friends.some((f) => f.id === u.id);
                return (
                  <div key={u.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden bg-zinc-800 shrink-0">
                      {u.avatarUrl && <Image fill src={resolveImage(u.avatarUrl) || ""} alt="" className="object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{u.displayName || u.username}</p>
                      <p className="text-white/40 text-xs">@{u.username}</p>
                    </div>
                    <button
                      onClick={() => { toggleFriend.mutate({ friendId: u.id, isCurrently: isAlready }); setSearchQuery(""); setSearchResults([]); }}
                      className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${isAlready ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-green-500/20 text-green-400 hover:bg-green-500/30"}`}
                    >
                      {isAlready ? "Remover" : "Adicionar"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <p className="text-white/30 text-xs text-center py-4">Carregando...</p>
      ) : friends.length === 0 ? (
        <p className="text-white/30 text-xs text-center py-4">Nenhum amigo próximo ainda</p>
      ) : (
        <div className="space-y-1">
          {friends.map((friend) => (
            <div key={friend.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 hover:bg-white/5 transition-colors">
              <div className="relative w-9 h-9 rounded-full overflow-hidden bg-zinc-800 shrink-0">
                {friend.avatarUrl && <Image fill src={resolveImage(friend.avatarUrl) || ""} alt="" className="object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{friend.displayName || friend.username}</p>
                <p className="text-white/40 text-xs">@{friend.username}</p>
              </div>
              <button
                onClick={() => toggleFriend.mutate({ friendId: friend.id, isCurrently: true })}
                className="p-1.5 rounded-full hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const navItems: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "identity", label: "Identidade", icon: Crown },
  { id: "account", label: "Account", icon: Lock },
  { id: "privacy", label: "Privacy", icon: Eye },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "blocked", label: "Bloqueados", icon: Ban },
  { id: "extension", label: "Browser Extension", icon: Puzzle },
];

export function SettingsClient() {
  const { data: session, isPending } = useSession();
  const [section, setSection] = useState<Section>("profile");

  // ── Fetched profile (source of truth for avatarUrl/coverUrl)
  const [profile, setProfile] = useState<any>(null);

  // ── Profile state
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [twitter, setTwitter] = useState("");
  const [instagram, setInstagram] = useState("");
  const [letterboxd, setLetterboxd] = useState("");
  const [imdb, setImdb] = useState("");
  const [bioHeadline, setBioHeadline] = useState("");
  const [bioQuote, setBioQuote] = useState("");
  const [bioQuoteAuthor, setBioQuoteAuthor] = useState("");
  const [bioMoods, setBioMoods] = useState<string[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // ── Account state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  // ── Privacy state
  const [privateAccount, setPrivateAccount] = useState(false);
  const [publicWatchlist, setPublicWatchlist] = useState(true);
  const [publicDiary, setPublicDiary] = useState(true);

  // ── Notifications state
  const [notifFollowers, setNotifFollowers] = useState(true);
  const [notifLikes, setNotifLikes] = useState(true);
  const [notifComments, setNotifComments] = useState(true);
  const [notifDigest, setNotifDigest] = useState(false);

  // ── Image upload state
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [coverLoading, setCoverLoading] = useState(false);
  const [repositionMode, setRepositionMode] = useState(false);
  const [coverPosition, setCoverPosition] = useState("50% 50%");
  const [coverZoom, setCoverZoom] = useState(100);
  const [repositionSaving, setRepositionSaving] = useState(false);
  const dragState = useRef<{ startY: number; startPct: number } | null>(null);


  // ── Identity state
  const [identityData, setIdentityData] = useState<UserIdentity | null>(null);
  const [frames, setFrames] = useState<ProfileFrame[]>([]);
  const [titles, setTitles] = useState<ProfileTitle[]>([]);
  const [identityLoading, setIdentityLoading] = useState(false);
  const [accentColor, setAccentColor] = useState<string>("");
  const [profileTheme, setProfileTheme] = useState<string>("");

  // ── Extension / API Tokens state
  const [tokens, setTokens] = useState<any[]>([]);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [newTokenName, setNewTokenName] = useState("");
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Load API tokens when in extension section
  const { data: tokensData, isLoading: tokensQueryLoading } = useApiTokens(section === "extension");
  useEffect(() => {
    if (tokensData) {
      setTokens(tokensData);
      setTokensLoading(false);
    } else if (tokensQueryLoading && section === "extension") {
      setTokensLoading(true);
    }
  }, [tokensData, tokensQueryLoading, section]);

  // Load identity data when in identity section
  const { data: identityQueryData, isLoading: identityQueryLoading } = useIdentityData(section === "identity");
  useEffect(() => {
    if (identityQueryData) {
      setIdentityData(identityQueryData.identity);
      setFrames(identityQueryData.frames);
      setTitles(identityQueryData.titles);
      setAccentColor(identityQueryData.identity.accentColor ?? "");
      setProfileTheme(identityQueryData.identity.profileTheme ?? "");
      setIdentityLoading(false);
    } else if (identityQueryLoading && section === "identity") {
      setIdentityLoading(true);
    }
  }, [identityQueryData, identityQueryLoading, section]);

  // Load full user profile (social links, cover, bioExtended)
  const { data: profileData } = useUserProfile(!!session?.user);
  const fetchProfile = useCallback(() => {
    // Re-used by image upload/remove handlers; delegates to query invalidation
    // would be ideal, but kept as a direct fetch for local state sync.
    fetch(`${API}/users/me`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data) {
          const u = data.data;
          setProfile(u);
          setCoverPosition(u.coverPosition || "50% 50%");
          setCoverZoom(Number(u.coverZoom) || 100);
          setDisplayName(u.displayName || u.name || "");
          setBio(u.bio || "");
          setLocation(u.location || "");
          setWebsite(u.website || "");
          if (u.socialLinks) {
            setTwitter(u.socialLinks.twitter || "");
            setInstagram(u.socialLinks.instagram || "");
            setLetterboxd(u.socialLinks.letterboxd || "");
            setImdb(u.socialLinks.imdb || "");
          }
          if (u.bioExtended) {
            setBioHeadline(u.bioExtended.headline || "");
            setBioQuote(u.bioExtended.quote?.text || "");
            setBioQuoteAuthor(u.bioExtended.quote?.author || "");
            setBioMoods(u.bioExtended.moods || []);
          }
        }
      });
  }, []);

  // Sync query data → local state fields once when profile data first loads
  useEffect(() => {
    if (!profileData) return;
    const u = profileData;
    setProfile(u);
    setCoverPosition(u.coverPosition || "50% 50%");
    setCoverZoom(Number(u.coverZoom) || 100);
    setDisplayName(u.displayName || u.name || "");
    setBio(u.bio || "");
    setLocation(u.location || "");
    setWebsite(u.website || "");
    if (u.socialLinks) {
      setTwitter(u.socialLinks.twitter || "");
      setInstagram(u.socialLinks.instagram || "");
      setLetterboxd(u.socialLinks.letterboxd || "");
      setImdb(u.socialLinks.imdb || "");
    }
    if (u.bioExtended) {
      setBioHeadline(u.bioExtended.headline || "");
      setBioQuote(u.bioExtended.quote?.text || "");
      setBioQuoteAuthor(u.bioExtended.quote?.author || "");
      setBioMoods(u.bioExtended.moods || []);
    }
  }, [profileData]);

  if (isPending || !session) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-purple-500 animate-spin" />
      </div>
    );
  }

  const u = session.user as any;
  const username = u.username || u.name || "me";

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleRepositionSave = async () => {
    setRepositionSaving(true);
    try {
      const res = await fetch(`${API}/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ coverPosition, coverZoom: String(coverZoom) }),
      });
      if (!res.ok) throw new Error();
      setRepositionMode(false);
      toast.success("Cover position saved");
      fetchProfile();
    } catch {
      toast.error("Failed to save position");
    } finally {
      setRepositionSaving(false);
    }
  };

  const handleCoverDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!repositionMode) return;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const pct = parseFloat(coverPosition.split(" ")[1]) || 50;
    dragState.current = { startY: clientY, startPct: pct };
  };

  const handleCoverDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragState.current || !repositionMode) return;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const delta = clientY - dragState.current.startY;
    // 160px container height — each px of drag maps to ~0.6% shift
    const newPct = Math.min(100, Math.max(0, dragState.current.startPct + (delta / 160) * 100));
    setCoverPosition(`50% ${newPct.toFixed(1)}%`);
  };

  const handleCoverDragEnd = () => {
    dragState.current = null;
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const [profileRes, socialRes] = await Promise.all([
        fetch(`${API}/users/me`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            displayName,
            bio,
            location,
            website,
            bioExtended: {
              headline: bioHeadline || undefined,
              quote: bioQuote ? { text: bioQuote, author: bioQuoteAuthor || undefined } : undefined,
              moods: bioMoods.length > 0 ? bioMoods : undefined,
            },
          }),
        }),
        fetch(`${API}/users/me/social-links`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ twitter, instagram, letterboxd, imdb }),
        }),
      ]);
      if (!profileRes.ok || !socialRes.ok) throw new Error("Failed to save");
      setProfileSaved(true);
      toast.success("Profile updated");
      setTimeout(() => setProfileSaved(false), 2500);
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleImageUpload = async (file: File, type: "avatar" | "cover") => {
    const loadingSetter =
      type === "avatar" ? setAvatarLoading : setCoverLoading;
    loadingSetter(true);

    try {
      const formData = new FormData();
      formData.append(type, file);

      const res = await fetch(`${API}/users/me/${type}`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || `Failed to upload ${type}`);
      }

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} updated`);
      fetchProfile(); // Refresh profile to get new URLs
    } catch (err: any) {
      toast.error(err.message || `Failed to upload ${type}`);
    } finally {
      loadingSetter(false);
    }
  };

  const handleRemoveImage = async (type: "avatar" | "cover") => {
    const loadingSetter =
      type === "avatar" ? setAvatarLoading : setCoverLoading;
    loadingSetter(true);

    try {
      const res = await fetch(`${API}/users/me/${type}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error(`Failed to remove ${type}`);

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} removed`);
      fetchProfile();
    } catch (err: any) {
      toast.error(err.message || `Failed to remove ${type}`);
    } finally {
      loadingSetter(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await fetch(
        `${API.replace("/api/v1", "")}/api/auth/change-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            currentPassword,
            newPassword,
            revokeOtherSessions: false,
          }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to change password");
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSaved(true);
      toast.success("Password changed");
      setTimeout(() => setPasswordSaved(false), 2500);
    } catch (err: any) {
      toast.error(err.message || "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handlePrivacySave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Privacy settings saved");
  };

  const handleNotificationsSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Notification preferences saved");
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName.trim()) return;
    setIsGenerating(true);
    try {
      const res = await fetch(`${API}/activity/tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newTokenName.trim() }),
      });
      if (!res.ok) throw new Error("Failed to create token");
      const data = await res.json();
      setGeneratedToken(data.data.token);
      setTokens([data.data, ...tokens]);
      setNewTokenName("");
      toast.success("Token created successfully");
    } catch {
      toast.error("Failed to create token");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevokeToken = async (tokenId: string) => {
    try {
      const res = await fetch(`${API}/activity/tokens/${tokenId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to revoke token");
      setTokens(tokens.filter((t) => t.id !== tokenId));
      toast.success("Token revoked");
    } catch {
      toast.error("Failed to revoke token");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Page header */}
      <div
        className="border-b border-zinc-800/60"
        style={{ background: "rgba(9,9,11,0.95)" }}
      >
        <div className="container mx-auto px-6 h-14 flex items-center gap-4">
          <Link
            href={`/profile/${username}`}
            className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-200 transition-colors text-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to profile</span>
          </Link>
          <span className="text-zinc-700">·</span>
          <span className="text-sm font-semibold text-white tracking-tight">
            Settings
          </span>
        </div>
      </div>

      {/* Layout */}
      <div className="container mx-auto px-6 py-10">
        <div className="flex gap-10 max-w-4xl mx-auto">
          {/* ── Sidebar ────────────────────────────────────────────────── */}
          <aside className="w-52 flex-shrink-0">
            {/* Avatar block */}
            <div className="flex items-center gap-3 mb-8 px-1">
              <div className="relative w-10 h-10 rounded-xl overflow-hidden ring-1 ring-white/10 flex-shrink-0">
                <Image
                  fill
                  src={
                    resolveImage(profile?.avatarUrl || u.image || u.avatarUrl) ||
                    `https://ui-avatars.com/api/?name=${username}&size=80&background=7c3aed&color=fff`
                  }
                  alt={username}
                  className="object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {u.displayName || u.name || username}
                </p>
                <p className="text-xs text-zinc-500 truncate">@{username}</p>
              </div>
            </div>

            {/* Nav */}
            <nav className="space-y-0.5">
              {navItems.map(({ id, label, icon: Icon }) => {
                const active = section === id;
                return (
                  <button
                    key={id}
                    onClick={() => setSection(id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                      active
                        ? "text-white"
                        : "text-zinc-500 hover:text-zinc-200"
                    }`}
                    style={
                      active
                        ? {
                            background: "rgba(153,24,245,0.08)",
                            borderLeft: "2px solid #9918f5",
                          }
                        : { borderLeft: "2px solid transparent" }
                    }
                  >
                    <Icon
                      className={`h-4 w-4 flex-shrink-0 ${active ? "text-purple-400" : ""}`}
                    />
                    {label}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* ── Content ────────────────────────────────────────────────── */}
          <main className="flex-1 min-w-0">
            {/* ── PROFILE ────────────────────────────────────────────── */}
            {section === "profile" && (
              <>
                <form onSubmit={handleProfileSave} className="space-y-5">
                  <SectionHeader
                    title="Profile"
                    description="Your public-facing identity on PixelReel."
                  />

                  {/* Banner Upload */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3" />
                      Profile Banner
                    </label>
                    <div
                      className={`relative h-40 w-full rounded-2xl overflow-hidden bg-zinc-900 border shadow-2xl transition-all ${
                        repositionMode
                          ? "border-purple-500/60 cursor-ns-resize select-none"
                          : "border-zinc-800 group"
                      }`}
                      onMouseDown={handleCoverDragStart}
                      onMouseMove={handleCoverDragMove}
                      onMouseUp={handleCoverDragEnd}
                      onMouseLeave={handleCoverDragEnd}
                      onTouchStart={handleCoverDragStart}
                      onTouchMove={handleCoverDragMove}
                      onTouchEnd={handleCoverDragEnd}
                    >
                      <Image
                        fill
                        src={
                          resolveImage(profile?.coverUrl || u.coverUrl) ||
                          "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200"
                        }
                        alt="Banner Preview"
                        draggable={false}
                        className={`object-cover transition-[opacity,filter] duration-500 ${coverLoading ? "opacity-40 blur-sm" : ""}`}
                        style={{
                          objectPosition: coverPosition,
                          transform: `scale(${coverZoom / 100})`,
                          transformOrigin: coverPosition,
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                      {/* Reposition mode hint */}
                      {repositionMode && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
                          <div className="flex flex-col items-center gap-1 text-white/80">
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="w-px h-4 bg-white/60" />
                              <div className="w-2 h-2 border-t-2 border-l-2 border-white/60 rotate-45 -mt-1" />
                            </div>
                            <span className="text-xs font-semibold bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">
                              Drag to reposition
                            </span>
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="w-2 h-2 border-b-2 border-r-2 border-white/60 rotate-45 -mb-1" />
                              <div className="w-px h-4 bg-white/60" />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Normal hover controls */}
                      {!repositionMode && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 gap-3">
                          <label className="cursor-pointer h-10 px-4 rounded-xl bg-white text-zinc-950 text-xs font-bold flex items-center gap-2 hover:bg-zinc-200 transition-all shadow-xl">
                            <Camera className="h-3.5 w-3.5" />
                            Change Banner
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(file, "cover");
                              }}
                            />
                          </label>
                          {(profile?.coverUrl || u.coverUrl) && (
                            <>
                              <button
                                type="button"
                                onClick={() => setRepositionMode(true)}
                                className="h-10 px-4 rounded-xl bg-black/60 text-white border border-white/20 text-xs font-bold flex items-center gap-2 hover:bg-black/80 transition-all backdrop-blur-md shadow-xl"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                                Reposition
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveImage("cover")}
                                className="h-10 w-10 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center hover:bg-red-500/30 transition-all backdrop-blur-md"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {coverLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                          <RefreshCw className="h-6 w-6 text-white animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* Reposition action bar */}
                    {repositionMode && (
                      <div className="space-y-2">
                        {/* Zoom slider */}
                        <div className="flex items-center gap-3 px-1">
                          <span className="text-[10px] text-zinc-500 w-8 shrink-0">−</span>
                          <input
                            type="range"
                            min={50}
                            max={200}
                            step={5}
                            value={coverZoom}
                            onChange={(e) => setCoverZoom(Number(e.target.value))}
                            className="flex-1 accent-purple-500 h-1"
                          />
                          <span className="text-[10px] text-zinc-500 w-6 shrink-0">+</span>
                          <span className="text-[10px] text-zinc-500 tabular-nums w-10 text-right">{coverZoom}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleRepositionSave}
                            disabled={repositionSaving}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50"
                            style={{ background: "linear-gradient(135deg, #9918f5 0%, #8600e5 100%)" }}
                          >
                            {repositionSaving ? (
                              <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCoverPosition(profile?.coverPosition || "50% 50%");
                              setCoverZoom(Number(profile?.coverZoom) || 100);
                              setRepositionMode(false);
                            }}
                            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {!repositionMode && (
                      <p className="text-[10px] text-zinc-600">
                        Recommended size: 1920x480px. Max 10MB. Hover to reposition.
                      </p>
                    )}
                  </div>

                  {/* Avatar & Info Row */}
                  <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/50 backdrop-blur-sm">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-2xl overflow-hidden ring-2 ring-purple-500/20 bg-zinc-900 shadow-2xl relative">
                        <Image
                          fill
                          src={
                            resolveImage(profile?.avatarUrl || u.image || u.avatarUrl) ||
                            `https://ui-avatars.com/api/?name=${username}&size=120&background=7c3aed&color=fff`
                          }
                          alt={username}
                          className={`object-cover transition-all duration-500 ${avatarLoading ? "opacity-30 blur-sm" : "group-hover:scale-110"}`}
                        />

                        {/* Avatar Overlay */}
                        <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer">
                          <Camera className="h-6 w-6 text-white" />
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(file, "avatar");
                            }}
                          />
                        </label>

                        {avatarLoading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                            <RefreshCw className="h-5 w-5 text-white animate-spin" />
                          </div>
                        )}
                      </div>

                      {/* Floating Delete Badge */}
                      {(profile?.avatarUrl || u.avatarUrl) && !avatarLoading && (
                        <button
                          type="button"
                          onClick={() => handleRemoveImage("avatar")}
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-lg bg-zinc-900 border border-red-500/30 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white shadow-xl opacity-0 group-hover:opacity-100 transition-all transform scale-75 group-hover:scale-100"
                          title="Remove avatar"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="text-sm font-bold text-white mb-1">
                        Profile Picture
                      </h3>
                      <p className="text-xs text-zinc-500 leading-relaxed max-w-xs">
                        Click the image to upload a new avatar. Square images
                        work best. Max 5 MB. Usuários Ultra podem usar GIFs animados.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <Field
                      label="Display name"
                      icon={User}
                      placeholder="Your name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      maxLength={50}
                    />

                    <Field
                      label="Username"
                      icon={AtSign}
                      value={username}
                      readOnly
                      hint="Username can't be changed yet."
                    />

                    <TextareaField
                      label="Bio"
                      icon={FileText}
                      placeholder="Tell people about yourself…"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      maxLength={200}
                    />

                    {/* Bio Avançada - Pro+ */}
                    <div className="border-t border-zinc-800/60 pt-4 space-y-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3" />
                          Bio Avançada
                          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/20 border border-purple-500/30 text-purple-400">PRO</span>
                        </p>
                        <p className="text-[11px] text-zinc-600 mt-1">Headline, citação, links e seções personalizadas.</p>
                      </div>

                      {/* Headline */}
                      <Field
                        label="Headline"
                        icon={FileText}
                        placeholder="Ex: Cinéfilo apaixonado por ficção científica"
                        value={bioHeadline}
                        onChange={(e) => setBioHeadline(e.target.value)}
                        maxLength={80}
                      />

                      {/* Quote */}
                      <div className="space-y-2">
                        <Field
                          label="Citação"
                          icon={MessageSquare}
                          placeholder="Texto da citação"
                          value={bioQuote}
                          onChange={(e) => setBioQuote(e.target.value)}
                          maxLength={200}
                        />
                        <Field
                          label="Autor da citação"
                          icon={User}
                          placeholder="Ex: Stanley Kubrick"
                          value={bioQuoteAuthor}
                          onChange={(e) => setBioQuoteAuthor(e.target.value)}
                          maxLength={60}
                        />
                      </div>

                      {/* Moods */}
                      <div className="space-y-2">
                        <p className="text-xs text-zinc-500">Moods (até 5)</p>
                        <div className="flex flex-wrap gap-2">
                          {bioMoods.map((mood, i) => (
                            <span
                              key={i}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-zinc-800 border border-zinc-700 text-zinc-300"
                            >
                              {mood}
                              <button
                                type="button"
                                onClick={() => setBioMoods((m) => m.filter((_, j) => j !== i))}
                                className="text-zinc-500 hover:text-red-400"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                          {bioMoods.length < 5 && (
                            <input
                              type="text"
                              placeholder="+ mood"
                              maxLength={20}
                              className="px-2.5 py-1 rounded-full text-xs bg-zinc-900 border border-zinc-700 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-purple-500/60 w-24"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const val = e.currentTarget.value.trim();
                                  if (val && !bioMoods.includes(val)) {
                                    setBioMoods((m) => [...m, val]);
                                    e.currentTarget.value = "";
                                  }
                                }
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    <Field
                      label="Location"
                      icon={MapPin}
                      placeholder="City, Country"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      maxLength={80}
                    />

                    <Field
                      label="Website"
                      icon={Globe}
                      placeholder="https://yoursite.com"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      type="url"
                      maxLength={120}
                    />
                  </div>

                  {/* Social Presence */}
                  <div className="pt-6 mt-2 border-t border-zinc-800/60 space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight">
                        Social Presence
                      </h3>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        Connect your other film-related social profiles.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field
                        label="Twitter / X"
                        icon={Twitter}
                        placeholder="username"
                        value={twitter}
                        onChange={(e) => setTwitter(e.target.value)}
                        maxLength={50}
                      />
                      <Field
                        label="Instagram"
                        icon={Instagram}
                        placeholder="username"
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        maxLength={50}
                      />
                      <Field
                        label="Letterboxd"
                        icon={Clapperboard}
                        placeholder="username"
                        value={letterboxd}
                        onChange={(e) => setLetterboxd(e.target.value)}
                        maxLength={50}
                      />
                      <Field
                        label="IMDb"
                        icon={Film}
                        placeholder="nm0000000"
                        value={imdb}
                        onChange={(e) => setImdb(e.target.value)}
                        maxLength={20}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <SaveButton loading={profileLoading} saved={profileSaved} />
                  </div>
                </form>
              </>
            )}

            {/* ── IDENTITY ───────────────────────────────────────────── */}
            {section === "identity" && (
              <div className="space-y-8">
                <SectionHeader
                  title="Identidade"
                  description="Personalize como você aparece no PixelReel."
                />

                {identityLoading ? (
                  <div className="flex justify-center py-16">
                    <RefreshCw className="h-5 w-5 animate-spin text-zinc-600" />
                  </div>
                ) : (
                  <>
                    {/* Molduras */}
                    <div className="space-y-3">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3" />
                        Moldura do Avatar
                      </p>
                      <div className="grid grid-cols-4 gap-3">
                        {/* Sem moldura */}
                        <button
                          onClick={async () => {
                            await identityApi.setFrame(null);
                            setIdentityData((prev) =>
                              prev ? { ...prev, perks: prev.perks ? { ...prev.perks, frameId: null, frame: null } : null } : prev
                            );
                            toast.success("Moldura removida");
                          }}
                          className={`aspect-square rounded-xl border-2 flex items-center justify-center text-xs text-zinc-500 transition-all ${
                            !identityData?.perks?.frameId
                              ? "border-purple-500 bg-purple-500/10"
                              : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
                          }`}
                        >
                          Nenhuma
                        </button>
                        {frames.map((frame) => (
                          <button
                            key={frame.id}
                            disabled={!frame.isUnlocked}
                            onClick={async () => {
                              if (!frame.isUnlocked) return;
                              await identityApi.setFrame(frame.id);
                              setIdentityData((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      perks: prev.perks
                                        ? { ...prev.perks, frameId: frame.id, frame }
                                        : { userId: "", frameId: frame.id, activeTitleId: null, badgeEnabled: false, verified: false, frame, title: null },
                                    }
                                  : prev
                              );
                              toast.success(`Moldura ${frame.name} ativada`);
                            }}
                            title={frame.isUnlocked ? frame.name : `${frame.name} — requer ${frame.minPlan}`}
                            className={`aspect-square rounded-xl border-2 flex items-center justify-center transition-all relative ${
                              identityData?.perks?.frameId === frame.id
                                ? "border-purple-500 bg-purple-500/10 scale-105"
                                : frame.isUnlocked
                                ? "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
                                : "border-zinc-800/50 bg-zinc-900/50 opacity-40 cursor-not-allowed"
                            }`}
                          >
                            <div
                              className="w-10 h-10 rounded-full border-4"
                              style={{ borderColor: frame.color }}
                            />
                            {!frame.isUnlocked && (
                              <span className="absolute top-1 right-1 text-[8px] font-bold text-zinc-500 uppercase bg-zinc-800 rounded px-1">
                                {frame.minPlan}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-zinc-800/60" />

                    {/* Títulos */}
                    <div className="space-y-3">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                        <Crown className="h-3 w-3" />
                        Título do Perfil
                      </p>
                      <div className="space-y-2">
                        {/* Sem título */}
                        <button
                          onClick={async () => {
                            await identityApi.setTitle(null);
                            setIdentityData((prev) =>
                              prev ? { ...prev, perks: prev.perks ? { ...prev.perks, activeTitleId: null, title: null } : null } : prev
                            );
                            toast.success("Título removido");
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-all ${
                            !identityData?.perks?.activeTitleId
                              ? "border-purple-500 bg-purple-500/10 text-purple-300"
                              : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600"
                          }`}
                        >
                          Nenhum título
                        </button>
                        {titles.map((title) => (
                          <button
                            key={title.id}
                            disabled={!title.isUnlocked}
                            onClick={async () => {
                              if (!title.isUnlocked) return;
                              try {
                                await identityApi.unlockTitle(title.id);
                              } catch {}
                              await identityApi.setTitle(title.id);
                              setIdentityData((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      perks: prev.perks
                                        ? { ...prev.perks, activeTitleId: title.id, title }
                                        : { userId: "", frameId: null, activeTitleId: title.id, badgeEnabled: false, verified: false, frame: null, title },
                                    }
                                  : prev
                              );
                              toast.success(`Título "${title.name}" ativado`);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm border flex items-center justify-between transition-all ${
                              identityData?.perks?.activeTitleId === title.id
                                ? "border-purple-500 bg-purple-500/10"
                                : title.isUnlocked
                                ? "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
                                : "border-zinc-800/50 bg-zinc-900/50 opacity-40 cursor-not-allowed"
                            }`}
                          >
                            <span
                              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                              style={{ backgroundColor: title.bgColor, color: title.textColor }}
                            >
                              {title.name}
                            </span>
                            {!title.isUnlocked && (
                              <span className="text-xs text-zinc-600">
                                {title.source === "xp"
                                  ? `${title.xpRequired} XP`
                                  : title.minPlan
                                  ? `Plano ${title.minPlan}`
                                  : "Achievement"}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-zinc-800/60" />

                    {/* Cor de destaque */}
                    <div className="space-y-3">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                        <Palette className="h-3 w-3" />
                        Cor de Destaque
                      </p>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={accentColor || "#7c3aed"}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="w-10 h-10 rounded-lg border border-zinc-700 bg-zinc-900 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          placeholder="#7c3aed"
                          className="flex-1 px-3.5 py-2.5 rounded-xl text-sm bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500/60"
                        />
                        <button
                          onClick={async () => {
                            await identityApi.updateAppearance({ accentColor: accentColor || null });
                            toast.success("Cor salva");
                          }}
                          className="px-4 py-2.5 rounded-xl text-sm font-bold text-white"
                          style={{ background: "linear-gradient(135deg, #9918f5 0%, #8600e5 100%)" }}
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── ACCOUNT ────────────────────────────────────────────── */}
            {section === "account" && (
              <div className="space-y-8">
                <SectionHeader
                  title="Account"
                  description="Manage your login credentials and account security."
                />

                {/* Email */}
                <div className="space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                    Email address
                  </p>
                  <Field
                    label="Email"
                    icon={Mail}
                    value={u.email || ""}
                    readOnly
                    hint="Contact support to change your email address."
                  />
                </div>

                <div
                  className="border-t border-zinc-800/60"
                  style={{ margin: "0 -1px" }}
                />

                {/* Password */}
                <form onSubmit={handlePasswordSave} className="space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                    Change password
                  </p>

                  <Field
                    label="Current password"
                    icon={KeyRound}
                    type="password"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <Field
                    label="New password"
                    icon={Lock}
                    type="password"
                    placeholder="Min. 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <Field
                    label="Confirm new password"
                    icon={Lock}
                    type="password"
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />

                  <div className="flex justify-end pt-2">
                    <SaveButton
                      loading={passwordLoading}
                      saved={passwordSaved}
                    />
                  </div>
                </form>
              </div>
            )}

            {/* ── PRIVACY ────────────────────────────────────────────── */}
            {section === "privacy" && (
              <form onSubmit={handlePrivacySave} className="space-y-5">
                <SectionHeader
                  title="Privacy"
                  description="Control what others can see on your profile."
                />

                <div
                  className="rounded-2xl border border-zinc-800/60 overflow-hidden"
                  style={{ background: "rgba(24,24,27,0.5)" }}
                >
                  <div className="px-5">
                    <ToggleRow
                      icon={UserX}
                      label="Private account"
                      description="Only approved followers can see your full profile."
                      checked={privateAccount}
                      onChange={setPrivateAccount}
                    />
                    <ToggleRow
                      icon={Clock}
                      label="Show watchlist publicly"
                      description="Anyone can see what's on your watchlist."
                      checked={publicWatchlist}
                      onChange={setPublicWatchlist}
                    />
                    <ToggleRow
                      icon={BookOpen}
                      label="Show diary publicly"
                      description="Others can browse your film diary."
                      checked={publicDiary}
                      onChange={setPublicDiary}
                    />
                  </div>
                </div>

                {/* Close Friends */}
                <CloseFriendsSection />

                <div className="flex justify-end pt-2">
                  <SaveButton loading={false} saved={false} />
                </div>
              </form>
            )}

            {/* ── NOTIFICATIONS ──────────────────────────────────────── */}
            {section === "notifications" && (
              <form onSubmit={handleNotificationsSave} className="space-y-5">
                <SectionHeader
                  title="Notifications"
                  description="Choose what updates you want to receive."
                />

                <div
                  className="rounded-2xl border border-zinc-800/60 overflow-hidden"
                  style={{ background: "rgba(24,24,27,0.5)" }}
                >
                  <div className="px-5">
                    <ToggleRow
                      icon={Users}
                      label="New followers"
                      description="Get notified when someone follows you."
                      checked={notifFollowers}
                      onChange={setNotifFollowers}
                    />
                    <ToggleRow
                      icon={Heart}
                      label="Review likes"
                      description="When someone likes one of your reviews."
                      checked={notifLikes}
                      onChange={setNotifLikes}
                    />
                    <ToggleRow
                      icon={MessageSquare}
                      label="Comments"
                      description="When someone comments on your reviews."
                      checked={notifComments}
                      onChange={setNotifComments}
                    />
                    <ToggleRow
                      icon={Newspaper}
                      label="Weekly digest"
                      description="A curated summary of activity in your network."
                      checked={notifDigest}
                      onChange={setNotifDigest}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <SaveButton loading={false} saved={false} />
                </div>
              </form>
            )}

            {/* ── EXTENSION ────────────────────────────────────────── */}
            {section === "extension" && (
              <div className="space-y-8">
                <SectionHeader
                  title="Browser Extension"
                  description="Manage API tokens for the PixelReel browser extension."
                />

                <div className="p-6 rounded-2xl bg-purple-500/5 border border-purple-500/20">
                  <h3 className="text-white font-bold mb-2">
                    Track Activity Automatically
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                    Install the PixelReel extension on your browser to
                    automatically track what you're watching on Netflix, Prime
                    Video, and Disney+. Generate a token below and paste it into
                    the extension to connect your account.
                  </p>
                  <a
                    href="/extension.zip"
                    download
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500 text-white font-bold text-sm hover:bg-purple-600 transition-colors shadow-lg shadow-purple-500/20"
                  >
                    <Puzzle className="h-4 w-4" />
                    Download Extension
                  </a>
                </div>

                {/* Create Token */}
                <form
                  onSubmit={handleCreateToken}
                  className="space-y-4 pt-4 border-t border-zinc-800/60"
                >
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                    Create new token
                  </p>
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <Field
                        label="Token Name"
                        placeholder="e.g., Chrome Laptop"
                        value={newTokenName}
                        onChange={(e) => setNewTokenName(e.target.value)}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isGenerating || !newTokenName.trim()}
                      className="h-10 px-5 rounded-xl bg-white text-black font-bold text-sm hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center gap-2 mb-1"
                    >
                      {isGenerating ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Generate
                    </button>
                  </div>
                </form>

                {/* Newly Generated Token */}
                {generatedToken && (
                  <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-green-400">
                        Token generated!
                      </p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedToken);
                          toast.success("Copied to clipboard");
                        }}
                        className="flex items-center gap-1.5 text-xs font-semibold text-green-400 hover:text-green-300 transition-colors bg-green-500/10 px-2 py-1 rounded-md"
                      >
                        <Copy className="h-3 w-3" />
                        Copy token
                      </button>
                    </div>
                    <div className="p-3 bg-black/50 rounded-lg border border-black/50 break-all">
                      <code className="text-green-300 font-mono text-sm">
                        {generatedToken}
                      </code>
                    </div>
                    <p className="text-xs text-green-500/70 mt-3 font-medium">
                      Make sure to copy your personal token now. You won't be
                      able to see it again!
                    </p>
                  </div>
                )}

                {/* Active Tokens */}
                <div className="space-y-4 pt-4 border-t border-zinc-800/60">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">
                    Active tokens
                  </p>

                  {tokensLoading ? (
                    <div className="flex justify-center py-8">
                      <RefreshCw className="h-5 w-5 animate-spin text-zinc-600" />
                    </div>
                  ) : tokens.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500 text-sm bg-zinc-900/40 rounded-xl border border-dashed border-zinc-800">
                      No active tokens.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tokens.map((token) => (
                        <div
                          key={token.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800/80"
                        >
                          <div>
                            <p className="font-semibold text-white text-sm">
                              {token.name}
                            </p>
                            <p className="text-xs text-zinc-500 mt-0.5">
                              Created on{" "}
                              {new Date(token.createdAt).toLocaleDateString()}
                              {token.lastUsedAt &&
                                ` · Last used ${new Date(token.lastUsedAt).toLocaleDateString()}`}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRevokeToken(token.id)}
                            className="text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-400/10 px-3 py-1.5 rounded-lg transition-colors border border-transparent shadow-sm"
                          >
                            Revoke
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── BLOCKED USERS ─────────────────────────────────────── */}
            {section === "blocked" && (
              <BlockedUsersSection />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function BlockedUsersSection() {
  const [blocked, setBlocked] = useState<{ id: string; username: string | null; displayName: string | null; avatarUrl: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.blocks.list(1)
      .then((res) => setBlocked(res.data ?? []))
      .catch(() => setError("Falha ao carregar usuários bloqueados."))
      .finally(() => setLoading(false));
  }, []);

  const unblock = async (userId: string) => {
    setUnblocking(userId);
    try {
      await api.blocks.unblock(userId);
      setBlocked((prev) => prev.filter((u) => u.id !== userId));
    } catch {
      setError("Falha ao desbloquear usuário.");
    } finally {
      setUnblocking(null);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Usuários Bloqueados"
        description="Usuários bloqueados não podem ver seu perfil, enviar mensagens ou interagir com você."
      />

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
        </div>
      ) : blocked.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-600 text-sm">
          <Ban className="w-10 h-10 mb-3 opacity-30" />
          <p>Nenhum usuário bloqueado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {blocked.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5"
            >
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden relative">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName ?? user.username ?? ""}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-bold text-zinc-400">
                    {(user.displayName ?? user.username)?.[0]?.toUpperCase() ?? "?"}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {user.displayName || user.username || "Usuário desconhecido"}
                </p>
                {user.username && (
                  <p className="text-xs text-zinc-500 truncate">@{user.username}</p>
                )}
              </div>
              <button
                onClick={() => unblock(user.id)}
                disabled={unblocking === user.id}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-300 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {unblocking === user.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                Desbloquear
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
