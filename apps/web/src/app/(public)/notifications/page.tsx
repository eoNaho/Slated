"use client";

import { useState } from "react";
import { Bell, Check, Trophy, Heart, MessageSquare, Users, Zap, Loader2, ShieldAlert, EyeOff, Eye, UserX } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { formatDistanceToNow } from "date-fns";
import { useNotifications } from "@/hooks/queries/use-notifications";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  data: Record<string, any> | null;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  achievement: Trophy,
  follow: Users,
  like: Heart,
  comment: MessageSquare,
  story_reaction: Zap,
  system: Bell,
  moderation_warning: ShieldAlert,
  content_hidden: EyeOff,
  content_restored: Eye,
  account_suspended: UserX,
};

const TYPE_COLORS: Record<string, string> = {
  achievement: "text-amber-400 bg-amber-500/10",
  follow: "text-blue-400 bg-blue-500/10",
  like: "text-pink-400 bg-pink-500/10",
  comment: "text-green-400 bg-green-500/10",
  story_reaction: "text-purple-400 bg-purple-500/10",
  system: "text-zinc-400 bg-zinc-700/40",
  moderation_warning: "text-orange-400 bg-orange-500/10",
  content_hidden: "text-red-400 bg-red-500/10",
  content_restored: "text-emerald-400 bg-emerald-500/10",
  account_suspended: "text-red-500 bg-red-500/15",
};

export default function NotificationsPage() {
  const { data: session } = useSession();
  const user = session?.user;

  const { data: fetchedNotifications = [], isLoading: loading } = useNotifications(!!user);
  const [readOverrides, setReadOverrides] = useState<Set<string>>(new Set());
  const [markingAll, setMarkingAll] = useState(false);

  const notifications = fetchedNotifications.map((n) =>
    readOverrides.has(n.id) ? { ...n, isRead: true } : n,
  );

  const markRead = async (id: string) => {
    await fetch(`${API_URL}/notifications/${id}/read`, {
      method: "PATCH",
      credentials: "include",
    });
    setReadOverrides((prev) => new Set(prev).add(id));
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await fetch(`${API_URL}/notifications/read-all`, {
        method: "POST",
        credentials: "include",
      });
      setReadOverrides(new Set(fetchedNotifications.map((n) => n.id)));
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">
        Sign in to see your notifications.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-zinc-400" />
            <h1 className="text-2xl font-bold text-white">Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={markingAll}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {markingAll ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Mark all as read
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-5">
              <Bell className="h-7 w-7 text-zinc-600" />
            </div>
            <p className="text-zinc-500 text-sm">No notifications here.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {notifications.map((n) => {
              const Icon = TYPE_ICONS[n.type] ?? Bell;
              const colorClass = TYPE_COLORS[n.type] ?? TYPE_COLORS.system;

              return (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && markRead(n.id)}
                  className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                    n.isRead
                      ? "bg-transparent border-transparent hover:bg-white/3"
                      : "bg-white/3 border-white/5 hover:bg-white/5"
                  }`}
                >
                  {/* Icon */}
                  <div className={`shrink-0 p-2.5 rounded-xl ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${n.isRead ? "text-zinc-400" : "text-white"}`}>
                      {n.title}
                    </p>
                    {n.message && (
                      <p className="text-sm text-zinc-500 mt-0.5 line-clamp-2">{n.message}</p>
                    )}
                    <p className="text-xs text-zinc-600 mt-1">
                      {formatDistanceToNow(new Date(n.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!n.isRead && (
                    <div className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-purple-500" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
