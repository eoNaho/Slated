// Components
export { ProfileHeader } from "./profile-header";
export { FavoriteFilms } from "./favorite-films";
export { FavoriteGenres } from "./favorite-genres";
export { RecentWatches } from "./recent-watches";
export { ReviewsList } from "./reviews-list";
export { UserLists } from "./user-lists";
export { WatchlistGrid } from "./watchlist-grid";
export { LikesGrid } from "./likes-grid";
export { ActivityFeed } from "./activity-feed";
export { ActivitySidebar } from "./activity-sidebar";
export { FilmsDiary } from "./films-diary";
export { FilmsGrid } from "./films-grid";
export { RatingStars } from "./rating-stars";
export { WatchingNow } from "./watching-now";
export { ScrobblesHistory } from "./scrobbles-history";
export { ScrobblesStats } from "./scrobbles-stats";

// Mock Data
export * from "./mock-data";

// Re-export types from central location for convenience
export type {
  UserProfile,
  UserStats,
  DiaryEntry,
  Review,
  List,
  WatchlistItem,
  LikeItem,
  Activity,
  FavoriteFilm,
} from "@/types";
