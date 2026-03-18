"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { useSession, authClient } from "@/lib/auth-client";
import { resolveImage } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type Section = "profile" | "account" | "privacy" | "notifications";

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

function SaveButton({
  loading,
  saved,
}: {
  loading: boolean;
  saved: boolean;
}) {
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

const navItems: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "account", label: "Account", icon: Lock },
  { id: "privacy", label: "Privacy", icon: Eye },
  { id: "notifications", label: "Notifications", icon: Bell },
];

export function SettingsClient() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [section, setSection] = useState<Section>("profile");

  // ── Profile state
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
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
  const [lastUpdated, setLastUpdated] = useState<number>(0);

  // Pre-fill from session
  useEffect(() => {
    if (session?.user) {
      const u = session.user as any;
      setDisplayName(u.displayName || u.name || "");
      setBio(u.bio || "");
      setLocation(u.location || "");
      setWebsite(u.website || "");
    }
  }, [session]);

  // Redirect if not logged in
  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/sign-in");
    }
  }, [isPending, session, router]);

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

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const res = await fetch(`${API}/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ displayName, bio, location, website }),
      });
      if (!res.ok) throw new Error("Failed to save");
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
    const loadingSetter = type === "avatar" ? setAvatarLoading : setCoverLoading;
    loadingSetter(true);

    try {
      const formData = new FormData();
      formData.append(type, file);

      const res = await fetch(`${API}/users/me/${type}`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) throw new Error(`Failed to upload ${type}`);

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} updated`);
      await authClient.getSession(); // Refresh session to get new URL
      setLastUpdated(Date.now()); // Force refresh images
    } catch (err: any) {
      toast.error(err.message || `Failed to upload ${type}`);
    } finally {
      loadingSetter(false);
    }
  };

  const handleRemoveImage = async (type: "avatar" | "cover") => {
    const loadingSetter = type === "avatar" ? setAvatarLoading : setCoverLoading;
    loadingSetter(true);

    try {
      const res = await fetch(`${API}/users/me/${type}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error(`Failed to remove ${type}`);

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} removed`);
      await authClient.getSession();
      setLastUpdated(Date.now());
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
                  <img
                    src={`${
                      resolveImage(u.image || u.avatarUrl) ||
                      `https://ui-avatars.com/api/?name=${username}&size=80&background=7c3aed&color=fff`
                    }${lastUpdated ? `?v=${lastUpdated}` : ""}`}
                    alt={username}
                    className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/10"
                  />
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
                  <div className="relative h-40 w-full rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 group shadow-2xl">
                    <img
                      src={`${
                        resolveImage(u.coverUrl) ||
                        "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200"
                      }${lastUpdated ? `?v=${lastUpdated}` : ""}`}
                      alt="Banner Preview"
                      className={`w-full h-full object-cover transition-all duration-500 ${coverLoading ? "opacity-40 blur-sm" : "group-hover:scale-105"}`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
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
                      {u.coverUrl && (
                        <button
                          type="button"
                          onClick={() => handleRemoveImage("cover")}
                          className="h-10 w-10 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center hover:bg-red-500/30 transition-all backdrop-blur-md"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {coverLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                        <RefreshCw className="h-6 w-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-600">
                    Recommended size: 1920x480px. Max 10MB.
                  </p>
                </div>

                {/* Avatar & Info Row */}
                <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/50 backdrop-blur-sm">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden ring-2 ring-purple-500/20 bg-zinc-900 shadow-2xl relative">
                      <img
                        src={`${
                          resolveImage(u.image || u.avatarUrl) ||
                          `https://ui-avatars.com/api/?name=${username}&size=120&background=7c3aed&color=fff`
                        }${lastUpdated ? `?v=${lastUpdated}` : ""}`}
                        alt={username}
                        className={`w-full h-full object-cover transition-all duration-500 ${avatarLoading ? "opacity-30 blur-sm" : "group-hover:scale-110"}`}
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
                    {u.avatarUrl && !avatarLoading && (
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
                      Click the image to upload a new avatar. Square images work best. Max 5MB.
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

                <div className="flex justify-end pt-2">
                  <SaveButton loading={profileLoading} saved={profileSaved} />
                </div>
              </form>
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
          </main>
        </div>
      </div>
    </div>
  );
}
