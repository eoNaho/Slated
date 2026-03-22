"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, BadgeCheck, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { resolveImage } from "@/lib/utils";

interface UserRow {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified?: boolean;
}

type Tab = "verified" | "followers" | "following";

interface FollowListDialogProps {
  username: string;
  displayName: string | null;
  initialTab?: "followers" | "following";
  onClose: () => void;
}

function UserItem({ user, onClose }: { user: UserRow; onClose: () => void }) {
  return (
    <Link
      href={`/profile/${user.username}`}
      onClick={onClose}
      className="flex items-center gap-3 py-3 px-2 -mx-2 rounded-xl hover:bg-white/5 transition-colors group"
    >
      {user.avatarUrl ? (
        <Image
          src={resolveImage(user.avatarUrl) ?? user.avatarUrl}
          alt=""
          width={44}
          height={44}
          className="w-11 h-11 rounded-full object-cover flex-shrink-0 ring-1 ring-white/10"
        />
      ) : (
        <div className="w-11 h-11 rounded-full bg-zinc-800 flex-shrink-0 ring-1 ring-white/10" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-white truncate group-hover:text-zinc-200 transition-colors">
            {user.displayName || user.username}
          </p>
          {user.isVerified && (
            <BadgeCheck className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          )}
        </div>
        <p className="text-xs text-zinc-500 truncate">@{user.username}</p>
      </div>
    </Link>
  );
}

export function FollowListDialog({
  username,
  displayName,
  initialTab = "followers",
  onClose,
}: FollowListDialogProps) {
  const [activeTab, setActiveTab] = useState<Tab>(
    initialTab === "following" ? "following" : "followers",
  );
  const [followers, setFollowers] = useState<UserRow[]>([]);
  const [following, setFollowing] = useState<UserRow[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [fetchedFollowers, setFetchedFollowers] = useState(false);
  const [fetchedFollowing, setFetchedFollowing] = useState(false);

  const loadFollowers = useCallback(async () => {
    if (fetchedFollowers) return;
    setLoadingFollowers(true);
    try {
      const res = await api.users.getFollowers(username, 1);
      setFollowers((res as any).data ?? []);
      setFetchedFollowers(true);
    } finally {
      setLoadingFollowers(false);
    }
  }, [username, fetchedFollowers]);

  const loadFollowing = useCallback(async () => {
    if (fetchedFollowing) return;
    setLoadingFollowing(true);
    try {
      const res = await api.users.getFollowing(username, 1);
      setFollowing((res as any).data ?? []);
      setFetchedFollowing(true);
    } finally {
      setLoadingFollowing(false);
    }
  }, [username, fetchedFollowing]);

  useEffect(() => {
    if (activeTab === "followers" || activeTab === "verified") {
      loadFollowers();
    } else {
      loadFollowing();
    }
  }, [activeTab, loadFollowers, loadFollowing]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const verifiedFollowers = followers.filter((u) => u.isVerified);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "verified", label: "Verificados", count: verifiedFollowers.length },
    { key: "followers", label: "Seguidores", count: followers.length },
    { key: "following", label: "Seguindo", count: following.length },
  ];

  const currentList =
    activeTab === "verified"
      ? verifiedFollowers
      : activeTab === "followers"
        ? followers
        : following;

  const isLoading =
    (activeTab === "followers" || activeTab === "verified")
      ? loadingFollowers
      : loadingFollowing;

  const emptyMessages: Record<Tab, string> = {
    verified: "Nenhum seguidor verificado.",
    followers: "Nenhum seguidor ainda.",
    following: "Não está seguindo ninguém ainda.",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative z-10 w-full sm:max-w-md bg-zinc-900 border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[75vh]">
        {/* Handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-zinc-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
          <p className="font-semibold text-white text-sm">
            {displayName || `@${username}`}
          </p>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 text-xs font-semibold transition-colors relative ${
                activeTab === tab.key
                  ? "text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <span>{tab.label}</span>
              {fetchedFollowers && tab.key !== "following" && tab.count > 0 && (
                <span className="ml-1 text-[10px] text-zinc-600">
                  {tab.count}
                </span>
              )}
              {fetchedFollowing && tab.key === "following" && tab.count > 0 && (
                <span className="ml-1 text-[10px] text-zinc-600">
                  {tab.count}
                </span>
              )}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-white rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-4 py-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
            </div>
          ) : currentList.length === 0 ? (
            <p className="text-center text-zinc-500 text-sm py-16">
              {emptyMessages[activeTab]}
            </p>
          ) : (
            <div>
              {currentList.map((user) => (
                <UserItem key={user.id} user={user} onClose={onClose} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
