import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Calendar,
  MapPin,
  Link2,
  Share2,
  MoreHorizontal,
  Star,
  Check,
  Settings,
  Twitter,
  Instagram,
  Clapperboard,
  Film,
} from "lucide-react";
import type { UserProfile, FavoriteFilm, UserIdentity } from "@/types";
import { resolveImage, cn } from "@/lib/utils";
import { api } from "@/lib/api";
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

interface ProfileHeaderProps {
  profile: UserProfile;
  favorites: FavoriteFilm[];
  isOwnProfile?: boolean;
  initialIsFollowing?: boolean;
  watchingNow?: any;
  stories?: Story[];
  highlights?: StoryHighlight[];
  identity?: UserIdentity | null;
}

export function ProfileHeader({
  profile,
  favorites,
  isOwnProfile,
  initialIsFollowing = false,
  watchingNow = null,
  stories = [],
  highlights = [],
  identity = null,
}: ProfileHeaderProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isPending, startTransition] = useTransition();
  const [followDialog, setFollowDialog] = useState<"followers" | "following" | null>(null);
  const [activeStoryGroup, setActiveStoryGroup] = useState<Story[] | null>(
    null,
  );

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
                <button className="h-10 w-10 flex items-center justify-center rounded-xl bg-zinc-800/60 text-zinc-300 border border-white/10 hover:bg-zinc-700 transition-all">
                  <Share2 className="h-4 w-4" />
                </button>
                <button className="h-10 w-10 flex items-center justify-center rounded-xl bg-zinc-800/60 text-zinc-300 border border-white/10 hover:bg-zinc-700 transition-all">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-zinc-400 text-sm leading-relaxed mt-3 max-w-xl line-clamp-2">
                {profile.bio}
              </p>
            )}

            {/* Bio Extended */}
            {(profile as any).bioExtended && (
              <div className="mt-2 space-y-1.5 max-w-xl">
                {(profile as any).bioExtended.headline && (
                  <p className="text-sm font-semibold text-zinc-200">
                    {(profile as any).bioExtended.headline}
                  </p>
                )}
                {(profile as any).bioExtended.moods?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(profile as any).bioExtended.moods.map(
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
                {(profile as any).bioExtended.quote?.text && (
                  <blockquote className="border-l-2 border-purple-500/40 pl-3 mt-1">
                    <p className="text-xs italic text-zinc-500 line-clamp-2">
                      &ldquo;{(profile as any).bioExtended.quote.text}&rdquo;
                    </p>
                    {(profile as any).bioExtended.quote.author && (
                      <p className="text-[10px] text-zinc-600 mt-0.5">
                        &mdash; {(profile as any).bioExtended.quote.author}
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
    </div>
  );
}
