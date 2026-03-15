"use client";

import React, { useState } from "react";
import {
  Star,
  Heart,
  MessageCircle,
  Calendar,
  MapPin,
  Link2,
  MoreHorizontal,
  ChevronRight,
  Film,
  BookOpen,
  List,
  Clock,
  Check,
  Tv,
  Share2,
  PlayCircle,
  BarChart2,
  Filter,
} from "lucide-react";

// ==================== MOCK DATA ====================

const MOCK_PROFILE = {
  id: "1",
  username: "cinephile_master",
  displayName: "Alex Rivera",
  bio: "Visual storyteller. Horror aficionado. Exploring the boundaries of sci-fi. Currently obsessed with A24's cinematography.",
  avatarUrl:
    "https://fastly.picsum.photos/id/237/536/354.jpg?hmac=i0yVXW1ORpyCZpQ-CknuyV-jbtU7_x9EBQVhvT5aRr0",
  bannerUrl:
    "https://image.tmdb.org/t/p/original/628Dep6AxEtDxjZoGP78TsOxYbK.jpg", // Dune backdrop for mood
  location: "Los Angeles, CA",
  website: "cinephile.blog",
  isVerified: true,
  isPro: true,
  joinedDate: "June 2023",
  stats: {
    films: 847,
    thisYear: 127,
    lists: 18,
    hours: 2090,
    following: 892,
    followers: 1247,
    averageRating: 7.8,
  },
  favoriteGenres: [
    "Sci-Fi",
    "Horror",
    "Drama",
    "Thriller",
    "Animation",
    "Mystery",
  ],
};

const MOCK_FAVORITES = [
  {
    id: "1",
    title: "The Godfather",
    year: 1972,
    poster: "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
    director: "Francis Ford Coppola",
  },
  {
    id: "2",
    title: "Pulp Fiction",
    year: 1994,
    poster: "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
    director: "Quentin Tarantino",
  },
  {
    id: "3",
    title: "Fight Club",
    year: 1999,
    poster: "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    director: "David Fincher",
  },
  {
    id: "4",
    title: "Interstellar",
    year: 2014,
    poster: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    director: "Christopher Nolan",
  },
];

const MOCK_RECENT = [
  {
    id: "1",
    title: "Oppenheimer",
    year: 2023,
    rating: 4.5,
    liked: true,
    type: "movie",
    date: "4h ago",
    poster: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
  },
  {
    id: "2",
    title: "Poor Things",
    year: 2023,
    rating: 4,
    liked: false,
    type: "movie",
    date: "1d ago",
    poster: "https://image.tmdb.org/t/p/w500/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg",
  },
  {
    id: "3",
    title: "The Holdovers",
    year: 2023,
    rating: 3.5,
    liked: false,
    type: "movie",
    date: "3d ago",
    poster: "https://image.tmdb.org/t/p/w500/VHSzNBTwxV8vh7wylo7O9CLdac.jpg",
  },
  {
    id: "4",
    title: "Past Lives",
    year: 2023,
    rating: 5,
    liked: true,
    rewatch: true,
    type: "movie",
    date: "1w ago",
    poster: "https://image.tmdb.org/t/p/original/k3waqVXSnvCZWfJYNtdamTgTtTA.jpg",
  },
  {
    id: "5",
    title: "The Bear",
    year: 2023,
    rating: 4.5,
    liked: true,
    type: "series",
    date: "2w ago",
    poster: "https://image.tmdb.org/t/p/w500/sHFlbKS1WZw4VG2nDooQBcr6vTe.jpg",
  },
];

const MOCK_REVIEWS = [
  {
    id: "1",
    movie: {
      title: "Oppenheimer",
      year: 2023,
      poster: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
      backdrop:
        "https://image.tmdb.org/t/p/original/fm6KqXpk3M2HVveHwvkHIeHY72D.jpg",
    },
    rating: 5,
    liked: true,
    content:
      "Christopher Nolan delivers a masterpiece. The IMAX sequences are breathtaking, and Cillian Murphy gives the performance of a lifetime. This film haunts you long after the credits roll.",
    likes: 234,
    comments: 45,
    date: "Jan 04",
    tags: ["Masterpiece", "Cinematography", "Sound Design"],
  },
  {
    id: "2",
    movie: {
      title: "Poor Things",
      year: 2023,
      poster: "https://image.tmdb.org/t/p/w500/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg",
      backdrop:
        "https://image.tmdb.org/t/p/original/bQLrHIRNEkE3PdMWCO0svKCWu6T.jpg",
    },
    rating: 4,
    liked: true,
    content:
      "Emma Stone is absolutely phenomenal. Lanthimos creates a bizarre, beautiful world that somehow makes you laugh and cry at the same time.",
    likes: 156,
    comments: 28,
    date: "Jan 03",
    tags: ["Surreal", "Acting"],
  },
];

const MOCK_LISTS = [
  {
    id: "1",
    name: "Top 50 Films of All Time",
    itemCount: 50,
    likes: 892,
    color: "from-blue-600 to-cyan-500",
    posters: [
      "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
      "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
      "https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
    ],
  },
  {
    id: "2",
    name: "A24 Essentials",
    itemCount: 32,
    likes: 567,
    color: "from-purple-600 to-pink-500",
    posters: [
      "https://image.tmdb.org/t/p/w500/w46Vw536HwNnEzOa7J24YH9DPRS.jpg",
      "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
      "https://image.tmdb.org/t/p/w500/g4yJTzMtOBUTAR2Qnmj8TYIcFVq.jpg",
    ],
  },
];

// ==================== UI HELPERS ====================

const RatingStars = ({
  rating,
  size = "sm",
  className = "",
}: {
  rating: number;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) => {
  const sizes = {
    xs: "h-3 w-3",
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`${sizes[size]} ${
            i < fullStars
              ? "fill-emerald-400 text-emerald-400"
              : i === fullStars && hasHalf
                ? "fill-emerald-400/50 text-emerald-400"
                : "text-zinc-700"
          }`}
        />
      ))}
    </div>
  );
};

const SectionHeading = ({ title, icon: Icon, action }: any) => (
  <div className="flex items-center justify-between mb-6">
    <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
      {Icon && <Icon className="h-5 w-5 text-purple-400" />}
      {title}
    </h2>
    {action && (
      <a
        href="#"
        className="text-sm font-medium text-zinc-500 hover:text-white transition-colors flex items-center gap-1 group"
      >
        View all
        <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-white transition-colors" />
      </a>
    )}
  </div>
);

// ==================== MAIN COMPONENT ====================

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [isFollowing, setIsFollowing] = useState(false);
  const profile = MOCK_PROFILE;

  const tabs = [
    { value: "profile", label: "Overview", icon: BarChart2 },
    { value: "films", label: "Films", icon: Film },
    { value: "reviews", label: "Reviews", icon: Star },
    { value: "lists", label: "Lists", icon: List },
    { value: "watchlist", label: "Watchlist", icon: Clock },
    { value: "likes", label: "Likes", icon: Heart },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-purple-500/30 relative">
      {/* Background Gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-purple-900/20 to-black -z-10" />

      {/* ===== PROFILE HEADER ===== */}
      <div className="relative">
        {/* Banner */}
        <div className="relative h-64 lg:h-80 w-full overflow-hidden">
          <img
            src={profile.bannerUrl}
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
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="w-full h-full object-cover rounded-[14px]"
                />
              </div>
              {profile.isPro && (
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
                      {profile.displayName}
                    </h1>
                    {profile.isVerified && (
                      <div className="shrink-0 p-1 rounded-full bg-blue-500/10 border border-blue-500/30">
                        <Check className="h-4 w-4 text-blue-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-zinc-400">
                    <span>@{profile.username}</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-600" />
                    <span className="flex items-center gap-1 text-zinc-500">
                      <MapPin className="h-3 w-3" />
                      {profile.location}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2.5 shrink-0">
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
                  <button className="h-10 w-10 flex items-center justify-center rounded-xl bg-zinc-800/60 text-zinc-300 border border-white/10 hover:bg-zinc-700 transition-all">
                    <Share2 className="h-4 w-4" />
                  </button>
                  <button className="h-10 w-10 flex items-center justify-center rounded-xl bg-zinc-800/60 text-zinc-300 border border-white/10 hover:bg-zinc-700 transition-all">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Bio */}
              <p className="text-zinc-400 text-sm leading-relaxed mt-3 max-w-xl line-clamp-2">
                {profile.bio}
              </p>

              {/* Meta Links */}
              <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                {profile.website && (
                  <a
                    href={`https://${profile.website}`}
                    className="flex items-center gap-1 text-purple-400 hover:text-purple-300"
                  >
                    <Link2 className="h-3 w-3" />
                    {profile.website}
                  </a>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Joined {profile.joinedDate}
                </span>
              </div>
            </div>
          </div>

          {/* Stats Row - Inline, cleaner */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-6 pt-5 border-t border-white/5">
            <div className="flex items-center gap-1.5 text-sm">
              <span className="font-semibold text-white">
                {profile.stats.films}
              </span>
              <span className="text-zinc-500">films</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="font-semibold text-white">
                {profile.stats.thisYear}
              </span>
              <span className="text-zinc-500">this year</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="font-semibold text-white">
                {profile.stats.lists}
              </span>
              <span className="text-zinc-500">lists</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="font-semibold text-white">
                {profile.stats.followers.toLocaleString()}
              </span>
              <span className="text-zinc-500">followers</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="font-semibold text-white">
                {profile.stats.following}
              </span>
              <span className="text-zinc-500">following</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
              <span className="font-semibold text-white">
                {profile.stats.averageRating}
              </span>
              <span className="text-zinc-500">avg</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== NAVIGATION TABS ===== */}
      <div className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5 mt-8">
        <div className="container mx-auto px-6">
          <nav className="flex gap-8 overflow-x-auto scrollbar-hide">
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
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="container mx-auto px-6 py-10 min-h-[500px]">
        {activeTab === "profile" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* LEFT COLUMN (Main Content) */}
            <div className="lg:col-span-8 space-y-12">
              {/* Favorites Grid - Designed like a shelf */}
              <section>
                <SectionHeading title="Favorite Films" icon={Heart} />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {MOCK_FAVORITES.map((film) => (
                    <a key={film.id} href="#" className="group relative block">
                      <div className="aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 shadow-lg ring-1 ring-white/10 group-hover:ring-purple-500/50 transition-all duration-300 relative z-10 group-hover:-translate-y-2">
                        <img
                          src={film.poster}
                          alt={film.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                          <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">
                            Directed by
                          </p>
                          <p className="text-sm font-medium text-white">
                            {film.director}
                          </p>
                        </div>
                      </div>
                      {/* Reflection Effect */}
                      <div className="absolute top-full left-0 right-0 h-10 bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-20 scale-y-[-1] blur-sm transition-all duration-300 transform translate-y-2 pointer-events-none" />
                    </a>
                  ))}
                </div>
              </section>

              {/* Recent Reviews - Blog Style */}
              <section>
                <SectionHeading
                  title="Recent Reviews"
                  icon={Star}
                  action={true}
                />
                <div className="space-y-6">
                  {MOCK_REVIEWS.map((review) => (
                    <div
                      key={review.id}
                      className="group relative rounded-2xl bg-zinc-900/40 hover:bg-zinc-900/80 border border-white/5 hover:border-zinc-700 transition-all duration-300 overflow-hidden"
                    >
                      <div className="flex flex-col sm:flex-row">
                        {/* Poster Column */}
                        <div className="sm:w-32 md:w-40 shrink-0 relative">
                          <div className="aspect-[2/3] sm:h-full w-full relative">
                            <img
                              src={review.movie.poster}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 sm:bg-gradient-to-r sm:from-transparent sm:to-zinc-900/90" />
                          </div>
                        </div>

                        {/* Content Column */}
                        <div className="flex-1 p-6 relative">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">
                                {review.movie.title}{" "}
                                <span className="text-zinc-500 font-normal text-base ml-1">
                                  {review.movie.year}
                                </span>
                              </h3>
                              <div className="flex items-center gap-3 mt-2">
                                <RatingStars rating={review.rating} size="sm" />
                                <span className="text-xs text-zinc-500 font-medium px-2 py-0.5 rounded bg-white/5 border border-white/5">
                                  Rewatched
                                </span>
                              </div>
                            </div>
                            <span className="text-zinc-500 text-xs font-medium uppercase tracking-wide">
                              {review.date}
                            </span>
                          </div>

                          <p className="text-zinc-300 text-sm leading-relaxed mb-4 line-clamp-3">
                            "{review.content}"
                          </p>

                          <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-auto">
                            <div className="flex items-center gap-4 text-xs text-zinc-500 font-medium">
                              <button className="flex items-center gap-1.5 hover:text-red-400 transition-colors">
                                <Heart className="h-3.5 w-3.5" /> {review.likes}
                              </button>
                              <button className="flex items-center gap-1.5 hover:text-blue-400 transition-colors">
                                <MessageCircle className="h-3.5 w-3.5" />{" "}
                                {review.comments}
                              </button>
                            </div>
                            <div className="flex gap-2">
                              {review.tags?.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] text-zinc-500 px-2 py-1 rounded-full bg-zinc-800 border border-white/5"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* RIGHT COLUMN (Sidebar) */}
            <div className="lg:col-span-4 space-y-10">
              {/* Favorite Genres */}
              {profile.favoriteGenres && profile.favoriteGenres.length > 0 && (
                <section className="bg-zinc-900/20 rounded-3xl p-6 border border-white/5 backdrop-blur-sm">
                  <h3 className="font-bold text-white flex items-center gap-2 mb-5">
                    <Film className="h-4 w-4 text-pink-400" />
                    Favorite Genres
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.favoriteGenres.map((genre) => (
                      <span
                        key={genre}
                        className="px-3 py-1.5 text-xs font-medium rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-300 border border-purple-500/20 hover:border-purple-500/50 hover:bg-purple-500/20 transition-all cursor-pointer"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Recent Activity Timeline - Clean List */}
              <section className="bg-zinc-900/20 rounded-3xl p-6 border border-white/5 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-400" /> Activity
                  </h3>
                  <Filter className="h-4 w-4 text-zinc-600 cursor-pointer hover:text-white" />
                </div>

                <div className="space-y-5 relative">
                  {/* Vertical Line */}
                  <div className="absolute left-3.5 top-2 bottom-2 w-px bg-zinc-800" />

                  {MOCK_RECENT.map((item, idx) => (
                    <div
                      key={item.id}
                      className="relative flex items-start gap-4 group"
                    >
                      <div className="relative z-10 shrink-0 mt-0.5">
                        <div className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center group-hover:border-purple-500 transition-colors">
                          {item.liked ? (
                            <Heart className="h-3 w-3 text-red-500 fill-red-500" />
                          ) : (
                            <Eye className="h-3 w-3 text-zinc-500" />
                          )}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 bg-zinc-900/50 p-3 rounded-xl border border-white/5 hover:bg-zinc-800 hover:border-white/10 transition-all cursor-pointer">
                        <div className="flex gap-3">
                          <img
                            src={item.poster}
                            className="w-10 h-14 object-cover rounded shadow-sm"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <p className="text-sm font-medium text-white truncate pr-2">
                                {item.title}
                              </p>
                              <span className="text-[10px] text-zinc-500">
                                {item.date}
                              </span>
                            </div>
                            <div className="mt-1">
                              <RatingStars rating={item.rating} size="xs" />
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded ${item.type === "movie" ? "bg-purple-500/10 text-purple-400" : "bg-pink-500/10 text-pink-400"}`}
                              >
                                {item.type === "movie" ? "Film" : "Series"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Lists - Stacked Cards */}
              <section>
                <SectionHeading
                  title="Curated Lists"
                  icon={List}
                  action={true}
                />
                <div className="space-y-4">
                  {MOCK_LISTS.map((list) => (
                    <a key={list.id} href="#" className="group block">
                      <div className="relative h-40 rounded-2xl overflow-hidden shadow-lg border border-white/5">
                        {/* Background Blur */}
                        <div className="absolute inset-0">
                          <img
                            src={list.posters[0]}
                            className="w-full h-full object-cover opacity-30 blur-xl scale-110"
                          />
                        </div>
                        <div className="absolute inset-0 bg-black/40" />

                        {/* Content */}
                        <div className="relative z-10 p-5 h-full flex flex-col justify-between">
                          <div className="flex justify-between items-start">
                            <div
                              className={`w-8 h-8 rounded-lg bg-gradient-to-br ${list.color} flex items-center justify-center shadow-lg`}
                            >
                              <List className="h-4 w-4 text-white" />
                            </div>
                            <div className="px-2 py-1 rounded-md bg-black/40 backdrop-blur-md text-xs font-medium text-white border border-white/10">
                              {list.itemCount} items
                            </div>
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-lg group-hover:text-purple-300 transition-colors">
                              {list.name}
                            </h4>
                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex -space-x-2">
                                {list.posters.map((p, i) => (
                                  <img
                                    key={i}
                                    src={p}
                                    className="w-6 h-6 rounded-full border border-zinc-900 object-cover"
                                  />
                                ))}
                              </div>
                              <span className="text-xs text-zinc-400 flex items-center gap-1">
                                <Heart className="h-3 w-3" /> {list.likes}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            </div>
          </div>
        ) : (
          /* Placeholder for other tabs */
          <div
            className="flex flex-col items-center justify-center py-24 text-center opacity-0 animate-fade-in-up"
            style={{ animationFillMode: "forwards" }}
          >
            <div className="w-20 h-20 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6 shadow-2xl">
              {React.createElement(
                tabs.find((t) => t.value === activeTab)?.icon || Star,
                { className: "w-8 h-8 text-zinc-600" }
              )}
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              {tabs.find((t) => t.value === activeTab)?.label}
            </h3>
            <p className="text-zinc-500 max-w-md">
              This section is under construction. Check back soon for more
              cinematic goodness.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Simple Icon for Activity Log
function Eye({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
