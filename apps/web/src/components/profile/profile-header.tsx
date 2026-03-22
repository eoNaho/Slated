import { useState, useMemo, useTransition, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Calendar,
  MapPin,
  Link2,
  Share2,
  MoreHorizontal,
  Star,
  Settings,
  Twitter,
  Instagram,
  Clapperboard,
  Film,
  Flag,
  Ban,
} from "lucide-react";
import type {
  UserProfile,
  FavoriteFilm,
  UserIdentity,
  CurrentActivity,
} from "@/types";
import { resolveImage } from "@/lib/utils";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import { FollowListDialog } from "./follow-list-dialog";
import { WatchingNow } from "./watching-now";
import { FramedAvatar } from "./framed-avatar";
import { TitleBadge } from "./title-badge";
import { SupporterBadge, VerifiedBadge } from "./identity-badges";
import { Story } from "@/types/stories";
import { StoryViewer } from "@/components/stories/StoryViewer";
import { HighlightsRow } from "@/components/stories/HighlightsRow";
import { Portal } from "@/components/ui/portal";
import type { StoryHighlight } from "@/lib/api";
import { ReportModal } from "@/components/moderation/report-modal";

interface ProfileHeaderProps {
  profile: UserProfile;
  favorites: FavoriteFilm[];
  isOwnProfile?: boolean;
  currentUserId?: string;
  initialIsFollowing?: boolean;
  watchingNow?: CurrentActivity | null;
  stories?: Story[];
  highlights?: StoryHighlight[];
  identity?: UserIdentity | null;
}

export function ProfileHeader({
  profile,
  isOwnProfile,
  initialIsFollowing = false,
  watchingNow = null,
  stories = [],
  highlights = [],
  identity = null,
}: ProfileHeaderProps) {
  const { data: session } = useSession();
  const sessionUserId = session?.user?.id;

  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isPending, startTransition] = useTransition();
  const [followDialog, setFollowDialog] = useState<
    "followers" | "following" | null
  >(null);
  const [activeStoryGroup, setActiveStoryGroup] = useState<Story[] | null>(
    null,
  );
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [blockFeedback, setBlockFeedback] = useState<string | null>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });

  const openMoreMenu = () => {
    if (moreButtonRef.current) {
      const rect = moreButtonRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      });
    }
    setShowMoreMenu(true);
  };

  const { activeStories, hasUnseen } = useMemo(() => {
    const active = stories
      .filter((s) => !s.isExpired && !s.isPinned)
      .map((s) => ({
        ...s,
        user: {
          id: s.user?.id ?? profile.id,
          username: s.user?.username ?? profile.username,
          displayName: s.user?.displayName ?? profile.displayName ?? null,
          avatarUrl: s.user?.avatarUrl ?? profile.avatarUrl ?? null,
        },
      }));
    const unseen = active.some((s) => !s.hasViewed);
    return { activeStories: active, hasUnseen: unseen };
  }, [stories, profile]);

  const bannerUrl =
    resolveImage(profile.coverUrl) ||
    "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920";

  return (
    <div className="relative">
      {/* Banner */}
      <div className="relative h-64 lg:h-80 w-full overflow-hidden bg-zinc-900">
        {/* Blurred ambient backdrop */}
        <div
          className="absolute inset-0 scale-110 blur-2xl opacity-70"
          style={{
            backgroundImage: `url(${bannerUrl})`,
            backgroundSize: "cover",
            backgroundPosition: profile.coverPosition || "50% 50%",
          }}
        />
        {/* Main image */}
        <Image
          fill
          src={bannerUrl}
          alt="Banner"
          className="object-cover"
          style={{
            objectPosition: profile.coverPosition || "50% 50%",
            transform: `scale(${(Number(profile.coverZoom) || 100) / 100})`,
            transformOrigin: profile.coverPosition || "50% 50%",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
      </div>

      {/* Profile Content */}
      <div className="container mx-auto px-6 relative z-10 -mt-24 lg:-mt-28">
        <div className="flex flex-col md:flex-row gap-5 items-start md:items-end">
          {/* Avatar with frame, story ring and premium badge */}
          <div className="relative shrink-0">
            <FramedAvatar
              avatarUrl={profile.avatarUrl}
              username={profile.username}
              frame={identity?.perks?.frame}
              hasUnseen={hasUnseen}
              size="xl"
              onClick={
                activeStories.length > 0
                  ? () => setActiveStoryGroup(activeStories)
                  : undefined
              }
            />
            {/* Premium pulsing star badge */}
            {profile.isPremium && (
              <div className="absolute top-0 -right-2 z-20">
                <span className="relative flex h-8 w-8">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-25" />
                  <span className="relative inline-flex rounded-full h-8 w-8 bg-zinc-900 border border-purple-500/40 items-center justify-center">
                    <Star className="h-4 w-4 text-purple-400 fill-purple-400" />
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0 pb-2">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-4xl lg:text-5xl font-bold text-white truncate">
                    {profile.displayName || profile.username}
                  </h1>
                  {identity?.perks?.verified && <VerifiedBadge />}
                  {profile.isPremium && identity?.perks?.badgeEnabled && (
                    <SupporterBadge />
                  )}
                </div>
                {identity?.perks?.title && (
                  <div className="mb-1">
                    <TitleBadge title={identity.perks.title} />
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm text-zinc-400">
                  <span>@{profile.username}</span>
                  {profile.location && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-zinc-600" />
                      <span className="flex items-center gap-1 text-zinc-500">
                        <MapPin className="h-3 w-3" />
                        {profile.location}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 shrink-0">
                {isOwnProfile ? (
                  <Link
                    href="/settings"
                    className="h-10 px-4 rounded-xl font-semibold text-sm bg-zinc-800 text-zinc-300 border border-white/10 hover:bg-zinc-700 transition-all flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Edit Profile
                  </Link>
                ) : (
                  <button
                    onClick={() => {
                      startTransition(async () => {
                        try {
                          if (isFollowing) {
                            await api.users.unfollow(profile.id);
                          } else {
                            await api.users.follow(profile.id);
                          }
                          setIsFollowing(!isFollowing);
                        } catch {
                          // silently ignore — UI stays unchanged
                        }
                      });
                    }}
                    disabled={isPending}
                    className={`h-10 px-6 rounded-xl font-semibold text-sm transition-all disabled:opacity-60 ${
                      isFollowing
                        ? "bg-zinc-800 text-zinc-300 hover:bg-red-500/10 hover:text-red-400 border border-white/10"
                        : "bg-white text-zinc-950 hover:bg-zinc-200"
                    }`}
                  >
                    {isFollowing ? "Unfollow" : "Follow"}
                  </button>
                )}
                <div className="relative">
                  <button
                    ref={moreButtonRef}
                    onClick={openMoreMenu}
                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-zinc-800/60 text-zinc-300 border border-white/10 hover:bg-zinc-700 transition-all"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-zinc-400 text-sm leading-relaxed mt-3 max-w-xl line-clamp-2">
                {profile.bio}
              </p>
            )}

            {/* Bio Extended */}
            {profile.bioExtended && (
              <div className="mt-2 space-y-1.5 max-w-xl">
                {profile.bioExtended.headline && (
                  <p className="text-sm font-semibold text-zinc-200">
                    {profile.bioExtended.headline}
                  </p>
                )}
                {(profile.bioExtended.moods?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {profile.bioExtended.moods!.map(
                      (mood: string, i: number) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-full text-[11px] bg-zinc-800/80 border border-white/8 text-zinc-400"
                        >
                          {mood}
                        </span>
                      ),
                    )}
                  </div>
                )}
                {profile.bioExtended.quote?.text && (
                  <blockquote className="border-l-2 border-purple-500/40 pl-3 mt-1">
                    <p className="text-xs italic text-zinc-500 line-clamp-2">
                      &ldquo;{profile.bioExtended.quote.text}&rdquo;
                    </p>
                    {profile.bioExtended.quote.author && (
                      <p className="text-[10px] text-zinc-600 mt-0.5">
                        &mdash; {profile.bioExtended.quote.author}
                      </p>
                    )}
                  </blockquote>
                )}
              </div>
            )}

            {/* Meta Links */}
            <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-purple-400 hover:text-purple-300"
                >
                  <Link2 className="h-3 w-3" />
                  {profile.website.replace(/^https?:\/\//, "")}
                </a>
              )}

              {/* Social Links */}
              {profile.socialLinks?.twitter && (
                <a
                  href={
                    profile.socialLinks.twitter.startsWith("http")
                      ? profile.socialLinks.twitter
                      : `https://twitter.com/${profile.socialLinks.twitter}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
                  title="Twitter / X"
                >
                  <Twitter className="h-3 w-3" />
                </a>
              )}
              {profile.socialLinks?.instagram && (
                <a
                  href={
                    profile.socialLinks.instagram.startsWith("http")
                      ? profile.socialLinks.instagram
                      : `https://instagram.com/${profile.socialLinks.instagram}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
                  title="Instagram"
                >
                  <Instagram className="h-3 w-3" />
                </a>
              )}
              {profile.socialLinks?.letterboxd && (
                <a
                  href={
                    profile.socialLinks.letterboxd.startsWith("http")
                      ? profile.socialLinks.letterboxd
                      : `https://letterboxd.com/${profile.socialLinks.letterboxd}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
                  title="Letterboxd"
                >
                  <Clapperboard className="h-3 w-3" />
                </a>
              )}
              {profile.socialLinks?.imdb && (
                <a
                  href={
                    profile.socialLinks.imdb.startsWith("http")
                      ? profile.socialLinks.imdb
                      : `https://imdb.com/name/${profile.socialLinks.imdb}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
                  title="IMDb"
                >
                  <Film className="h-3 w-3" />
                </a>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Joined{" "}
                {new Date(profile.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>

          <div className="mt-8 md:mt-0 md:ml-auto shrink-0">
            {watchingNow && watchingNow.status !== "finished" && (
              <WatchingNow
                item={{
                  title: watchingNow.title,
                  season: watchingNow.season ?? undefined,
                  episode: watchingNow.episode ?? undefined,
                  progress: watchingNow.progress ?? 0,
                  source: watchingNow.source ?? "unknown",
                  status: watchingNow.status,
                  timestamp: new Date(
                    watchingNow.updatedAt,
                  ).toLocaleTimeString(),
                }}
              />
            )}
          </div>
        </div>

        {/* Highlights Section */}
        {(highlights.length > 0 || isOwnProfile) && (
          <div className="mt-8">
            <HighlightsRow
              highlights={highlights}
              isOwnProfile={!!isOwnProfile}
            />
          </div>
        )}

        {/* Stats Row - Inline */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-6 pt-5 border-t border-white/5">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="font-semibold text-white">
              {profile.stats.moviesWatched}
            </span>
            <span className="text-zinc-500">films</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="font-semibold text-white">
              {profile.stats.thisYearCount || 0}
            </span>
            <span className="text-zinc-500">this year</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="font-semibold text-white">
              {profile.stats.listsCount}
            </span>
            <span className="text-zinc-500">lists</span>
          </div>
          <button
            onClick={() => setFollowDialog("followers")}
            className="flex items-center gap-1.5 text-sm hover:text-white transition-colors"
          >
            <span className="font-semibold text-white">
              {profile.stats.followersCount.toLocaleString()}
            </span>
            <span className="text-zinc-500">seguidores</span>
          </button>
          <button
            onClick={() => setFollowDialog("following")}
            className="flex items-center gap-1.5 text-sm hover:text-white transition-colors"
          >
            <span className="font-semibold text-white">
              {profile.stats.followingCount}
            </span>
            <span className="text-zinc-500">seguindo</span>
          </button>
          {profile.stats.averageRating && (
            <div className="flex items-center gap-1.5 text-sm">
              <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
              <span className="font-semibold text-white">
                {profile.stats.averageRating}
              </span>
              <span className="text-zinc-500">avg</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-sm">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-violet-600 text-[10px] font-bold text-white leading-none">
              {profile.stats.level}
            </span>
            <span className="font-semibold text-white">
              {profile.stats.xp.toLocaleString()}
            </span>
            <span className="text-zinc-500">XP</span>
          </div>
        </div>
      </div>

      {/* Story Viewer — rendered via portal to escape stacking context */}
      {activeStoryGroup && (
        <Portal>
          <StoryViewer
            stories={activeStoryGroup}
            onClose={() => setActiveStoryGroup(null)}
          />
        </Portal>
      )}

      {/* Follow List Dialog */}
      {followDialog && (
        <Portal>
          <FollowListDialog
            username={profile.username}
            displayName={profile.displayName ?? null}
            initialTab={followDialog}
            onClose={() => setFollowDialog(null)}
          />
        </Portal>
      )}

      {/* Report Modal */}
      {showReport && (
        <Portal>
          <ReportModal
            targetType="user"
            targetId={profile.id}
            onClose={() => setShowReport(false)}
          />
        </Portal>
      )}

      {/* Block Confirm Modal */}
      {showBlockConfirm && (
        <Portal>
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowBlockConfirm(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-950 p-6 space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                  <Ban className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {isBlocked ? "Desbloquear usuário?" : "Bloquear usuário?"}
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
                    {isBlocked
                      ? `${profile.displayName || profile.username} poderá ver seu perfil e interagir com você novamente.`
                      : `${profile.displayName || profile.username} não poderá ver seu perfil, seguir você ou interagir com seu conteúdo.`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowBlockConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-zinc-400 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    setBlockLoading(true);
                    try {
                      if (isBlocked) {
                        await api.blocks.unblock(profile.id);
                        setIsBlocked(false);
                        setBlockFeedback("Usuário desbloqueado.");
                      } else {
                        await api.blocks.block(profile.id);
                        setIsBlocked(true);
                        setBlockFeedback("Usuário bloqueado.");
                      }
                      setTimeout(() => setBlockFeedback(null), 3000);
                    } catch {
                      setBlockFeedback("Falha ao executar ação.");
                      setTimeout(() => setBlockFeedback(null), 3000);
                    } finally {
                      setBlockLoading(false);
                      setShowBlockConfirm(false);
                    }
                  }}
                  disabled={blockLoading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-orange-500/80 hover:bg-orange-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {blockLoading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : isBlocked ? (
                    "Desbloquear"
                  ) : (
                    "Bloquear"
                  )}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Block feedback toast */}
      {blockFeedback && (
        <Portal>
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] px-4 py-2.5 rounded-xl bg-zinc-800 border border-white/10 text-sm text-white shadow-2xl">
            {blockFeedback}
          </div>
        </Portal>
      )}

      {/* More menu dropdown — rendered via Portal to escape the z-10 stacking context */}
      {showMoreMenu && (
        <Portal>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMoreMenu(false)}
          />
          <div
            className="fixed z-50 w-48 rounded-xl border border-white/10 bg-zinc-900 shadow-2xl py-1"
            style={{ top: menuPos.top, right: menuPos.right }}
            onClick={(e) => e.stopPropagation()}
          >
            {!isOwnProfile && sessionUserId && sessionUserId !== profile.id && (
              <>
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    setShowReport(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-zinc-300 hover:bg-white/5 transition-colors"
                >
                  <Flag className="w-4 h-4 text-red-400" /> Denunciar usuário
                </button>
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    setShowBlockConfirm(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-zinc-300 hover:bg-white/5 transition-colors"
                >
                  <Ban className="w-4 h-4 text-orange-400" />
                  {isBlocked ? "Desbloquear" : "Bloquear"} usuário
                </button>
              </>
            )}
            <button
              onClick={() => {
                setShowMoreMenu(false);
                navigator.clipboard
                  .writeText(window.location.href)
                  .catch(() => {});
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-zinc-300 hover:bg-white/5 transition-colors"
            >
              <Share2 className="w-4 h-4 text-zinc-400" /> Copiar link do perfil
            </button>
          </div>
        </Portal>
      )}
    </div>
  );
}
