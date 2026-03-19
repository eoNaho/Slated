import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Link2,
  Share2,
  MoreHorizontal,
  Star,
  Check,
  Settings,
} from "lucide-react";
import type { UserProfile, FavoriteFilm } from "@/types";
import { resolveImage } from "@/lib/utils";
import { WatchingNow } from "./watching-now";

interface ProfileHeaderProps {
  profile: UserProfile; // Keep original type
  favorites: FavoriteFilm[]; // Keep original type
  isOwnProfile?: boolean;
  watchingNow?: any;
}

export function ProfileHeader({
  profile,
  favorites,
  isOwnProfile,
  watchingNow = null,
}: ProfileHeaderProps) {
  const [isFollowing, setIsFollowing] = useState(false);

  // Use coverUrl as banner, fallback to first favorite poster
  const bannerUrl =
    resolveImage(profile.coverUrl) || // Use resolveImage here
    favorites[0]?.posterPath ||
    "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920";

  return (
    <div className="relative">
      {/* Banner */}
      <div className="relative h-64 lg:h-80 w-full overflow-hidden">
        <img
          src={bannerUrl}
          alt="Banner"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />
      </div>

      {/* Profile Content */}
      <div className="container mx-auto px-6 relative z-10 -mt-24 lg:-mt-28">
        <div className="flex flex-col md:flex-row gap-5 items-start md:items-end">
          {/* Avatar - Square */}
          <div className="relative shrink-0">
            <div className="w-36 h-36 lg:w-40 lg:h-40 rounded-2xl bg-zinc-950 p-0.5 shadow-2xl ring-1 ring-white/10">
              <img
                src={
                  resolveImage(profile.avatarUrl) || // Use resolveImage here
                  `https://ui-avatars.com/api/?name=${profile.username}&size=160&background=7c3aed&color=fff`
                }
                alt={profile.displayName || profile.username}
                className="w-full h-full object-cover rounded-[14px]"
              />
            </div>
            {profile.isPremium && (
              <div className="absolute -top-2 -right-2 z-20">
                <span className="relative flex h-8 w-8">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-25"></span>
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
                  {profile.isVerified && (
                    <div className="shrink-0 p-1 rounded-full bg-blue-500/10 border border-blue-500/30">
                      <Check className="h-4 w-4 text-blue-400" />
                    </div>
                  )}
                </div>
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
                    onClick={() => setIsFollowing(!isFollowing)}
                    className={`h-10 px-6 rounded-xl font-semibold text-sm transition-all ${
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
          <div className="flex items-center gap-1.5 text-sm">
            <span className="font-semibold text-white">
              {profile.stats.followersCount.toLocaleString()}
            </span>
            <span className="text-zinc-500">followers</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="font-semibold text-white">
              {profile.stats.followingCount}
            </span>
            <span className="text-zinc-500">following</span>
          </div>
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
    </div>
  );
}
