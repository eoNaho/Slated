"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Users, UserCircle } from "lucide-react";
import { useUserRecommendations } from "@/hooks/queries/use-recommendations";
import { useSession } from "@/lib/auth-client";
import { api } from "@/lib/api";
import { toast } from "sonner";

function SuggestedUserRow({
  user,
}: {
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    mutualFollows?: number;
    similarity?: number;
  };
}) {
  const [followed, setFollowed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (loading || followed) return;
    setLoading(true);
    try {
      await api.users.follow(user.id);
      setFollowed(true);
      toast.success(`Now following ${user.displayName ?? user.username}`);
    } catch {
      toast.error("Failed to follow");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 py-2.5">
      <Link href={`/profile/${user.username}`} className="flex-shrink-0">
        <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-800 border border-white/10">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={user.displayName ?? user.username ?? ""}
              width={36}
              height={36}
              className="object-cover w-full h-full"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <UserCircle className="w-5 h-5 text-zinc-600" />
            </div>
          )}
        </div>
      </Link>

      <div className="flex-1 min-w-0">
        <Link href={`/profile/${user.username}`}>
          <p className="text-sm font-medium text-zinc-200 hover:text-purple-400 transition-colors truncate leading-tight">
            {user.displayName ?? user.username}
          </p>
        </Link>
        <p className="text-xs text-zinc-600 truncate">
          {user.mutualFollows && user.mutualFollows > 0
            ? `${user.mutualFollows} mutual`
            : user.similarity != null
              ? `${Math.round(user.similarity * 100)}% match`
              : `@${user.username}`}
        </p>
      </div>

      <button
        onClick={handleFollow}
        disabled={loading || followed}
        className={`flex-shrink-0 text-xs font-medium px-3 py-1 rounded-full border transition-colors ${
          followed
            ? "border-zinc-700 text-zinc-500 cursor-default"
            : "border-purple-500/60 text-purple-400 hover:bg-purple-500/10 disabled:opacity-60"
        }`}
      >
        {followed ? "Following" : loading ? "..." : "Follow"}
      </button>
    </div>
  );
}

export function FeedSidebar() {
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { data, isLoading } = useUserRecommendations(
    { limit: 5 },
    !!session?.user,
  );

  const users = data?.data ?? [];

  return (
    <aside className="sticky top-20 space-y-6">
      {/* People you may know */}
      {mounted && session?.user && (
        <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-zinc-200">
              Who to follow
            </h3>
          </div>

          {isLoading ? (
            <div className="space-y-3 mt-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-zinc-800 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-24 bg-zinc-800 rounded" />
                    <div className="h-2.5 w-16 bg-zinc-800 rounded" />
                  </div>
                  <div className="h-6 w-14 bg-zinc-800 rounded-full" />
                </div>
              ))}
            </div>
          ) : users.length > 0 ? (
            <div className="divide-y divide-white/[0.04]">
              {users.map((u) => (
                <SuggestedUserRow key={u.id} user={u} />
              ))}
            </div>
          ) : null}

          {users.length > 0 && (
            <Link
              href="/discover/users"
              className="block mt-3 text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              See more suggestions →
            </Link>
          )}
        </div>
      )}

      {/* Footer links */}
      <div className="text-xs text-zinc-700 space-y-1 px-1">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <Link href="/about" className="hover:text-zinc-400 transition-colors">
            About
          </Link>
          <Link href="/privacy" className="hover:text-zinc-400 transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-zinc-400 transition-colors">
            Terms
          </Link>
        </div>
        <p suppressHydrationWarning>© {new Date().getFullYear()} PixelReel</p>
      </div>
    </aside>
  );
}
