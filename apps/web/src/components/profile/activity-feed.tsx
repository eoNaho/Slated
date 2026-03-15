import Link from "next/link";
import {
  Play,
  Star,
  List,
  Heart,
  UserPlus,
  Activity as ActivityIcon,
} from "lucide-react";
import { RatingStars } from "./rating-stars";
import type { Activity } from "@/types";

interface ActivityFeedProps {
  activities: Activity[];
}

const activityIcons = {
  watch: Play,
  review: Star,
  list: List,
  like: Heart,
  follow: UserPlus,
  achievement: Star,
};

const activityColors = {
  watch: "text-green-500 bg-green-500/10",
  review: "text-yellow-500 bg-yellow-500/10",
  list: "text-purple-500 bg-purple-500/10",
  like: "text-red-500 bg-red-500/10",
  follow: "text-blue-500 bg-blue-500/10",
  achievement: "text-orange-500 bg-orange-500/10",
};

const activityLabels = {
  watch: "Watched",
  review: "Reviewed",
  list: "Created list",
  like: "Liked",
  follow: "Followed",
  achievement: "Unlocked",
};

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-16">
        <ActivityIcon className="h-16 w-16 text-zinc-700 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">No activity yet</h3>
        <p className="text-zinc-500">
          Activity will appear here as you use PixelReel.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => {
        const Icon = activityIcons[activity.type];
        const colorClass = activityColors[activity.type];
        const label = activityLabels[activity.type];

        return (
          <div
            key={activity.id}
            className="flex items-start gap-4 p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-colors group"
          >
            {/* Activity Icon */}
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}
            >
              <Icon className="h-5 w-5" />
            </div>

            {/* Poster (if applicable) */}
            {activity.data?.posterPath && (
              <Link
                href="#"
                className="flex-shrink-0 w-12 h-16 rounded overflow-hidden bg-zinc-800"
              >
                <img
                  src={activity.data.posterPath}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </Link>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-zinc-400 text-sm">{label}</span>
                {activity.data?.title && (
                  <Link
                    href="#"
                    className="font-bold text-white hover:text-purple-400 transition-colors"
                  >
                    {activity.data.title}
                  </Link>
                )}
                {activity.data?.username && (
                  <Link
                    href={`/profile/${activity.data.username}`}
                    className="font-bold text-white hover:text-purple-400 transition-colors"
                  >
                    @{activity.data.username}
                  </Link>
                )}
              </div>

              {/* Rating */}
              {activity.data?.rating && (
                <div className="mt-1">
                  <RatingStars rating={activity.data.rating} size="xs" />
                </div>
              )}

              {/* Review Preview */}
              {activity.data?.content && (
                <p className="text-zinc-500 text-sm mt-1 line-clamp-1">
                  {activity.data.content}
                </p>
              )}

              {/* Time */}
              <p className="text-zinc-600 text-xs mt-2">
                {formatTimeAgo(activity.createdAt)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
