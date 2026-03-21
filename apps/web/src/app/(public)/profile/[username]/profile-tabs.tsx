"use client";

import { useState, useEffect } from "react";
import {
  Film,
  Star,
  List,
  Heart,
  BookOpen,
  Clock,
  Activity as ActivityIcon,
  BarChart2,
  Lock,
  Users,
  History,
  Plus,
} from "lucide-react";
import { CreateListModal } from "@/components/lists/CreateListModal";
import {
  ProfileHeader,
  FavoriteFilms,
  FavoriteGenres,
  ActivitySidebar,
  ReviewsList,
  UserLists,
  WatchlistGrid,
  LikesGrid,
  ActivityFeed,
  FilmsDiary,
  FilmsGrid,
  ScrobblesHistory,
  ScrobblesStats,
} from "@/components/profile";
import { ClubCard } from "@/components/clubs/club-card";
import type { Club } from "@/lib/queries/clubs";
import { Story } from "@/types/stories";
import type {
  UserProfile,
  FavoriteFilm,
  Review,
  List as ListType,
  DiaryEntry,
  WatchlistItem,
  LikeItem,
  Activity,
  CurrentActivity,
  Scrobble,
} from "@/types";

interface ProfileTabsProps {
  profile: UserProfile;
  username: string;
  isOwnProfile: boolean;
  currentUserId?: string;
  favorites: FavoriteFilm[];
  reviews: Review[];
  lists: ListType[];
  stories?: Story[];
  // These are empty for public viewing, populated for own profile
  diary?: DiaryEntry[];
  watchlist?: WatchlistItem[];
  likes?: LikeItem[];
  activity?: Activity[];
  watchingNow?: CurrentActivity | null;
  scrobbles?: Scrobble[];
}

const tabs = [
  { value: "overview", label: "Overview", icon: BarChart2 },
  { value: "films", label: "Films", icon: Film },
  { value: "diary", label: "Diary", icon: BookOpen },
  { value: "reviews", label: "Reviews", icon: Star },
  { value: "lists", label: "Lists", icon: List },
  { value: "clubs", label: "Clubs", icon: Users },
  { value: "watchlist", label: "Watchlist", icon: Clock },
  { value: "likes", label: "Likes", icon: Heart },
  { value: "activity", label: "Activity", icon: ActivityIcon },
  { value: "scrobbles", label: "Scrobbles", icon: History },
];

const PRIVATE_TABS = ["diary", "watchlist", "likes", "activity"];

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export function ProfileTabs({
  profile,
  username,
  isOwnProfile,
  currentUserId,
  favorites,
  reviews,
  lists,
  diary = [],
  watchlist = [],
  likes = [],
  activity = [],
  stories = [],
  watchingNow = null,
  scrobbles = [],
}: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [clubs, setClubs] = useState<Club[]>([]);
  const [clubsLoaded, setClubsLoaded] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);

  useEffect(() => {
    if (activeTab !== "clubs" || clubsLoaded) return;
    fetch(`${API_URL}/users/${username}/clubs`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((json) => {
        setClubs(json.data ?? []);
        setClubsLoaded(true);
      })
      .catch(() => setClubsLoaded(true));
  }, [activeTab, clubsLoaded, username]);

  const isPrivateTab = PRIVATE_TABS.includes(activeTab) && !isOwnProfile;

  return (
    <>
      {/* Profile Header */}
      <ProfileHeader
        profile={profile}
        favorites={favorites}
        isOwnProfile={isOwnProfile}
        watchingNow={watchingNow}
        stories={stories}
      />

      {/* Tabs Navigation */}
      <div className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5 mt-6">
        <div className="container mx-auto px-6">
          <nav className="flex gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex items-center gap-2 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-all ${
                  activeTab === tab.value
                    ? "border-purple-500 text-white"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <tab.icon
                  className={`h-4 w-4 ${activeTab === tab.value ? "text-purple-500" : ""}`}
                />
                {tab.label}
                {/* Count badge */}
                {tab.value === "reviews" && reviews.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-zinc-500">
                    {profile.stats.reviewsCount}
                  </span>
                )}
                {tab.value === "lists" && lists.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-zinc-500">
                    {profile.stats.listsCount}
                  </span>
                )}
                {tab.value === "clubs" && (profile.stats.clubsCount || (clubsLoaded && clubs.length > 0)) && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-zinc-500">
                    {profile.stats.clubsCount || clubs.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="container mx-auto px-6 py-10 min-h-[500px]">
        {/* Private tab guard */}
        {isPrivateTab ? (
          <PrivateTabGuard username={profile.username} tab={activeTab} />
        ) : (
          <>
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 space-y-12">
                  <FavoriteFilms films={favorites} isEditable={isOwnProfile} />
                  <ReviewsList reviews={reviews} limit={3} currentUserId={currentUserId} />
                </div>
                <div className="lg:col-span-4 space-y-10">
                  <FavoriteGenres genres={[]} />
                  <ActivitySidebar entries={diary} limit={5} />
                  <UserLists lists={lists} limit={2} />
                </div>
              </div>
            )}

            {activeTab === "films" && <FilmsGrid entries={diary} />}
            {activeTab === "diary" && <FilmsDiary entries={diary} />}
            {activeTab === "reviews" &&
              (reviews.length > 0 ? (
                <ReviewsList reviews={reviews} showViewAll={false} currentUserId={currentUserId} />
              ) : (
                <EmptyState icon={Star} message="No reviews yet." />
              ))}
            {activeTab === "lists" &&
              (lists.length > 0 || isOwnProfile ? (
                <UserLists 
                  lists={lists} 
                  showViewAll={false} 
                  variant="lg01" 
                  isOwnProfile={isOwnProfile}
                  onCreateClick={() => setShowCreateList(true)}
                />
              ) : (
                <EmptyState icon={List} message="No lists yet." />
              ))}
            {activeTab === "clubs" &&
              (!clubsLoaded ? (
                <div className="flex justify-center py-20">
                  <div className="w-6 h-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                </div>
              ) : clubs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {clubs.map((club) => (
                    <ClubCard key={club.id} club={club} />
                  ))}
                </div>
              ) : (
                <EmptyState icon={Users} message="Nenhum club ainda." />
              ))}
            {activeTab === "watchlist" && <WatchlistGrid items={watchlist} />}
            {activeTab === "likes" && <LikesGrid items={likes} />}
            {activeTab === "activity" && <ActivityFeed activities={activity} />}
            {activeTab === "scrobbles" && (
              <div className="space-y-12">
                <ScrobblesStats userId={profile.id} />
                <ScrobblesHistory scrobbles={scrobbles} />
              </div>
            )}
          </>
        )}
      </div>

      {showCreateList && (
        <CreateListModal 
          onClose={() => setShowCreateList(false)}
          onSuccess={() => {
            // Refresh logic - in a real app we might use a router refresh or a global state update
            window.location.reload();
          }}
        />
      )}
    </>
  );
}

function PrivateTabGuard({ username, tab }: { username: string; tab: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-5">
        <Lock className="h-7 w-7 text-zinc-600" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2 capitalize">{tab}</h3>
      <p className="text-zinc-500 text-sm max-w-xs">
        This section is only visible to{" "}
        <span className="text-zinc-300">@{username}</span>.
      </p>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  message,
}: {
  icon: React.ElementType;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-5">
        <Icon className="h-7 w-7 text-zinc-600" />
      </div>
      <p className="text-zinc-500 text-sm">{message}</p>
    </div>
  );
}
