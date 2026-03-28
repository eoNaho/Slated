"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import {
  Users,
  MessageSquare,
  Calendar,
  Bookmark,
  BarChart2,
  Globe,
  Lock,
  ChevronLeft,
  Settings,
  Loader2,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import type {
  Club,
  ClubPost,
  ClubEvent,
  ClubWatchlistItem,
  ClubPoll,
  ClubMember,
} from "@/lib/queries/clubs";
import {
  ClubInfoWidget,
  NextSessionWidget,
  TopPollWidget,
  WatchlistSpotlightWidget,
} from "./sidebar-widgets";
import {
  apiFetch,
  Avatar,
  ROLE_BADGE,
} from "./shared/club-ui";
import { getCategoryLabel } from "@/lib/constants/club-categories";
import { DiscussionsTab } from "./tabs/discussions-tab";
import { SessionsTab } from "./tabs/sessions-tab";
import { WatchlistTab } from "./tabs/watchlist-tab";
import { PollsTab } from "./tabs/polls-tab";
import { MembersTab } from "./tabs/members-tab";
import { ManageTab } from "./tabs/manage-tab";

const TABS = [
  { value: "posts", label: "Discussions", icon: MessageSquare },
  { value: "events", label: "Sessions", icon: Calendar },
  { value: "watchlist", label: "Watchlist", icon: Bookmark },
  { value: "polls", label: "Polls", icon: BarChart2 },
  { value: "members", label: "Members", icon: Users },
];

export interface ClubHubProps {
  club: Club;
  posts: ClubPost[];
  events: ClubEvent[];
  watchlist: ClubWatchlistItem[];
  polls: ClubPoll[];
  members: ClubMember[];
}

export function ClubHub({
  club,
  posts: initialPosts,
  events: initialEvents,
  watchlist: initialWatchlist,
  polls: initialPolls,
  members: initialMembers,
}: ClubHubProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("posts");
  const [joinLoading, setJoinLoading] = useState(false);
  const [myRole, setMyRole] = useState<string | null>(club.myRole ?? null);
  const [members, setMembers] = useState<ClubMember[]>(initialMembers);

  const isMember = !!myRole;
  const isAdmin = myRole === "owner" || myRole === "moderator";

  const tabs = [
    ...TABS,
    ...(isAdmin ? [{ value: "manage", label: "Manage", icon: Settings }] : []),
  ];

  async function handleJoin() {
    if (!session?.user) {
      toast.error("Sign in to join the club");
      router.push("/sign-in");
      return;
    }
    setJoinLoading(true);
    try {
      if (club.allowJoinRequests && !club.isPublic) {
        await apiFetch(`/clubs/${club.id}/join-request`, { method: "POST" });
        toast.success("Request sent! Awaiting approval.");
      } else {
        await apiFetch(`/clubs/${club.id}/join`, { method: "POST" });
        toast.success("You joined the club!");
        setMyRole("member");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setJoinLoading(false);
    }
  }

  async function handleLeave() {
    if (!confirm("Are you sure you want to leave the club?")) return;
    try {
      await apiFetch(`/clubs/${club.id}/leave`, { method: "DELETE" });
      toast.success("You left the club.");
      setMyRole(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An unexpected error occurred");
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 selection:bg-purple-500/30 selection:text-purple-100 relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-black via-purple-900/5 to-black -z-10" />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative">
        {/* Banner */}
        <div className="relative h-64 lg:h-80 w-full overflow-hidden bg-zinc-950">
          {club.coverUrl ? (
            <Image
              fill
              src={club.coverUrl}
              alt={club.name}
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full relative overflow-hidden bg-gradient-to-br from-zinc-900 via-purple-950/40 to-black">
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage:
                    "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
                  backgroundSize: "60px 60px",
                }}
              />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/10 blur-[120px] rounded-full animate-pulse" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
          <div className="absolute inset-0 bg-black/20" />
        </div>

        {/* Profile Content */}
        <div className="container mx-auto px-6 relative z-10 -mt-24 lg:-mt-28">
          <Link
            href="/clubs"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-purple-400 transition-all mb-8 group"
          >
            <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Clubs
          </Link>

          <div className="flex flex-col md:flex-row gap-8 items-center md:items-end">
            {/* Avatar */}
            <div className="relative shrink-0 group">
              <div className="absolute -inset-4 bg-purple-500/20 rounded-[2rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="relative w-36 h-36 lg:w-40 lg:h-40 rounded-[2rem] overflow-hidden bg-zinc-900 border border-white/10 shadow-2xl">
                <div
                  className="w-full h-full flex items-center justify-center text-7xl font-black text-white bg-gradient-to-br from-purple-500 to-indigo-600"
                  style={{ textShadow: "0 4px 20px rgba(0,0,0,0.3)" }}
                >
                  {club.name[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,#fff_2px,#fff_3px)]" />
              </div>
            </div>

            <div className="flex-1 min-w-0 flex flex-col gap-6">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                <div className="flex-1 min-w-0">
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2 mb-6">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-lg border backdrop-blur-md ${
                        club.isPublic
                          ? "text-zinc-400 border-white/5 bg-white/5"
                          : "text-purple-400 border-purple-500/20 bg-purple-500/10"
                      }`}
                    >
                      {club.isPublic ? (
                        <Globe className="h-3 w-3" />
                      ) : (
                        <Lock className="h-3 w-3" />
                      )}
                      {club.isPublic ? "Public" : "Private"}
                    </span>
                    {club.categories.map((cat) => (
                      <span
                        key={cat}
                        className="text-xs font-medium text-zinc-500 px-3 py-1 rounded-lg border border-white/5 bg-zinc-900/50"
                      >
                        {getCategoryLabel(cat)}
                      </span>
                    ))}
                  </div>

                  <h1
                    className="text-4xl lg:text-5xl font-bold text-white leading-[1.2] tracking-tight mb-4"
                    style={{ textShadow: "0 10px 40px rgba(0,0,0,0.5)" }}
                  >
                    {club.name}
                  </h1>

                  <div className="flex flex-wrap items-center gap-4">
                    {/* Founder */}
                    <div className="h-10 px-4 flex items-center gap-3 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md group/founder transition-all hover:bg-white/[0.08]">
                      <span className="text-xs text-zinc-500">
                        Founded by
                      </span>
                      <div className="flex items-center gap-2">
                        <Avatar
                          src={club.owner.avatarUrl}
                          name={
                            club.owner.displayName ?? club.owner.username ?? "?"
                          }
                          size="sm"
                        />
                        <Link
                          href={`/profile/${club.owner.username}`}
                          className="text-sm font-bold text-zinc-300 hover:text-purple-400 transition-colors"
                        >
                          {club.owner.displayName ?? club.owner.username}
                        </Link>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-8 py-1">
                      {[
                        { value: club.memberCount, label: "Members" },
                        { value: initialPosts.length, label: "Discussions" },
                        { value: initialEvents.length, label: "Sessions" },
                      ].map(({ value, label }) => (
                        <div key={label} className="group/stat cursor-default">
                          <div className="text-lg font-bold text-white tabular-nums group-hover/stat:text-purple-400 transition-colors">
                            {value}
                          </div>
                          <div className="text-xs text-zinc-500 group-hover/stat:text-zinc-400 transition-colors">
                            {label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 shrink-0 pb-1">
                  {isMember ? (
                    <>
                      {myRole &&
                        (() => {
                          const badge =
                            ROLE_BADGE[myRole as keyof typeof ROLE_BADGE] ??
                            ROLE_BADGE.member;
                          const BadgeIcon = badge.icon;
                          return (
                            <div
                              className={`h-9 px-4 flex items-center gap-2 rounded-lg border backdrop-blur-md shadow-xl transition-transform hover:scale-105 ${badge.color}`}
                            >
                              <BadgeIcon className="h-3.5 w-3.5" />
                              <span className="text-xs font-semibold">
                                {badge.label}
                              </span>
                            </div>
                          );
                        })()}
                      {isAdmin && (
                        <Link
                          href={`/clubs/${club.slug}/settings`}
                          className="h-9 px-4 rounded-lg text-sm font-medium flex items-center gap-2 border border-white/10 text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 transition-all shadow-xl hover:scale-105 active:scale-95"
                        >
                          <Settings className="h-4 w-4" /> Settings
                        </Link>
                      )}
                      {myRole !== "owner" && (
                        <button
                          onClick={handleLeave}
                          className="h-9 px-4 rounded-lg text-sm font-medium border border-white/10 text-zinc-500 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 transition-all"
                        >
                          Leave
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={handleJoin}
                      disabled={
                        joinLoading ||
                        (!club.isPublic && !club.allowJoinRequests)
                      }
                      className="group relative h-11 px-8 rounded-xl overflow-hidden shadow-2xl transition-all hover:scale-[1.05] active:scale-[0.98] disabled:opacity-40"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 group-hover:from-purple-500 group-hover:to-indigo-500" />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.2),transparent)] opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span className="relative z-10 flex items-center gap-2 text-sm font-semibold text-white">
                        {joinLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : club.isPublic ? (
                          <>
                            Join Club{" "}
                            <ChevronLeft className="h-3.5 w-3.5 rotate-180" />
                          </>
                        ) : club.allowJoinRequests ? (
                          "Request to Join"
                        ) : (
                          <>
                            <Lock className="h-3 w-3" /> Closed Club
                          </>
                        )}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {club.description && (
                <p className="text-zinc-400 text-sm leading-relaxed font-bold max-w-2xl opacity-80">
                  {club.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ─────────────────────────────────────────────── */}
      <div className="sticky top-14 z-20 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-6">
          <div className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden gap-1 py-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`group relative flex items-center gap-2 px-4 py-3.5 transition-all duration-300 ${isActive ? "text-purple-400" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  <Icon
                    className={`h-4 w-4 transition-transform group-hover:scale-110 ${isActive ? "text-purple-400" : "text-zinc-500 group-hover:text-zinc-400"}`}
                  />
                  <span className="text-sm font-medium">
                    {tab.label}
                  </span>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="container mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-8">
            {activeTab === "posts" && (
              <DiscussionsTab
                club={club}
                isMember={isMember}
                isAdmin={isAdmin}
                session={session}
                initialPosts={initialPosts}
              />
            )}
            {activeTab === "events" && (
              <SessionsTab
                clubId={club.id}
                isMember={isMember}
                isAdmin={isAdmin}
                initialEvents={initialEvents}
              />
            )}
            {activeTab === "watchlist" && (
              <WatchlistTab
                clubId={club.id}
                isMember={isMember}
                isAdmin={isAdmin}
                sessionUserId={session?.user?.id}
                initialWatchlist={initialWatchlist}
              />
            )}
            {activeTab === "polls" && (
              <PollsTab
                clubId={club.id}
                isMember={isMember}
                isAdmin={isAdmin}
                sessionUserId={session?.user?.id}
                initialPolls={initialPolls}
              />
            )}
            {activeTab === "members" && (
              <MembersTab members={members} />
            )}
            {activeTab === "manage" && isAdmin && (
              <ManageTab
                clubId={club.id}
                isPublic={club.isPublic}
                allowJoinRequests={club.allowJoinRequests}
                myRole={myRole as "owner" | "moderator" | null}
                sessionUserId={session?.user?.id}
                members={members}
                onMembersChange={setMembers}
              />
            )}
          </div>

          {/* Sidebar Widgets */}
          <aside className="lg:col-span-4 sticky top-10 space-y-8 flex flex-col pb-10">
            <ClubInfoWidget club={club} />
            <NextSessionWidget event={initialEvents[0]} />
            <TopPollWidget
              poll={initialPolls[0]}
              onViewAll={() => setActiveTab("polls")}
            />
            <WatchlistSpotlightWidget
              item={initialWatchlist[initialWatchlist.length - 1]}
              onViewWatchlist={() => setActiveTab("watchlist")}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}
