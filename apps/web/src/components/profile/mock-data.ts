import type {
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

// Mock Profile
const MOCK_STATS: UserStats = {
  userId: "1",
  moviesWatched: 847,
  seriesWatched: 156,
  watchTimeMins: 125400,
  reviewsCount: 234,
  listsCount: 18,
  followersCount: 1247,
  followingCount: 892,
  xp: 8750,
  level: 42,
  thisYearCount: 127,
  averageRating: 7.8,
};

export const MOCK_PROFILE: UserProfile = {
  id: "1",
  username: "cinephile_master",
  displayName: "Alex Rivera",
  email: "alex@example.com",
  bio: "Film enthusiast 🎬 | Horror & Sci-Fi lover | Letterboxd refugee | Currently watching everything A24 produces",
  avatarUrl:
    "https://fastly.picsum.photos/id/237/536/354.jpg?hmac=i0yVXW1ORpyCZpQ-CknuyV-jbtU7_x9EBQVhvT5aRr0",
  coverUrl:
    "https://image.tmdb.org/t/p/original/628Dep6AxEtDxjZoGP78TsOxYbK.jpg",
  location: "Los Angeles, CA",
  website: "https://cinephile.blog",
  isVerified: true,
  isPremium: true,
  role: "user",
  status: "active",
  createdAt: "2023-06-15",
  stats: MOCK_STATS,
};

// Mock Favorite Genres
export const MOCK_FAVORITE_GENRES = [
  "Sci-Fi",
  "Horror",
  "Drama",
  "Thriller",
  "Animation",
  "Mystery",
];

// Mock Favorites
export const MOCK_FAVORITES: FavoriteFilm[] = [
  {
    id: "1",
    title: "The Godfather",
    posterPath:
      "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
    year: 1972,
  },
  {
    id: "2",
    title: "Pulp Fiction",
    posterPath:
      "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
    year: 1994,
  },
  {
    id: "3",
    title: "Fight Club",
    posterPath:
      "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    year: 1999,
  },
  {
    id: "4",
    title: "Interstellar",
    posterPath:
      "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    year: 2014,
  },
];

// Mock Diary Entries
export const MOCK_DIARY: DiaryEntry[] = [
  {
    id: "1",
    userId: "1",
    mediaId: "1",
    watchedAt: "2024-01-04",
    rating: 4.5,
    isRewatch: false,
    createdAt: "2024-01-04",
    media: {
      id: "1",
      tmdbId: 872585,
      type: "movie",
      title: "Oppenheimer",
      posterPath:
        "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
      year: 2023,
    },
  },
  {
    id: "2",
    userId: "1",
    mediaId: "2",
    watchedAt: "2024-01-03",
    rating: 4,
    isRewatch: false,
    createdAt: "2024-01-03",
    media: {
      id: "2",
      tmdbId: 792307,
      type: "movie",
      title: "Poor Things",
      posterPath:
        "https://image.tmdb.org/t/p/w500/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg",
      year: 2023,
    },
  },
  {
    id: "3",
    userId: "1",
    mediaId: "3",
    watchedAt: "2024-01-02",
    rating: 3.5,
    isRewatch: false,
    createdAt: "2024-01-02",
    media: {
      id: "3",
      tmdbId: 840430,
      type: "movie",
      title: "The Holdovers",
      posterPath:
        "https://image.tmdb.org/t/p/w500/VHSzNBTwxV8vh7wylo7O9CLdac.jpg",
      year: 2023,
    },
  },
  {
    id: "4",
    userId: "1",
    mediaId: "4",
    watchedAt: "2024-01-01",
    rating: 5,
    isRewatch: true,
    notes: "Even better the second time!",
    createdAt: "2024-01-01",
    media: {
      id: "4",
      tmdbId: 666277,
      type: "movie",
      title: "Past Lives",
      posterPath:
        "https://image.tmdb.org/t/p/original/k3waqVXSnvCZWfJYNtdamTgTtTA.jpg",
      year: 2023,
    },
  },
  {
    id: "5",
    userId: "1",
    mediaId: "5",
    watchedAt: "2023-12-30",
    rating: 4,
    isRewatch: false,
    createdAt: "2023-12-30",
    media: {
      id: "5",
      tmdbId: 467244,
      type: "movie",
      title: "The Zone of Interest",
      posterPath:
        "https://image.tmdb.org/t/p/original/hUu9zyZmDd8VZegKi1iK1Vk0RYS.jpg",
      year: 2023,
    },
  },
  {
    id: "6",
    userId: "1",
    mediaId: "6",
    watchedAt: "2023-12-28",
    rating: 4.5,
    isRewatch: false,
    createdAt: "2023-12-28",
    media: {
      id: "6",
      tmdbId: 915935,
      type: "movie",
      title: "Anatomy of a Fall",
      posterPath:
        "https://image.tmdb.org/t/p/w500/kQs6keheMwCxJxrzV83VUwFtHkB.jpg",
      year: 2023,
    },
  },
  {
    id: "7",
    userId: "1",
    mediaId: "7",
    watchedAt: "2023-12-25",
    rating: 3,
    isRewatch: false,
    createdAt: "2023-12-25",
    media: {
      id: "7",
      tmdbId: 930564,
      type: "movie",
      title: "Saltburn",
      posterPath:
        "https://image.tmdb.org/t/p/w500/qjhahNLSZ705B5JP92YMEYPocPz.jpg",
      year: 2023,
    },
  },
  {
    id: "8",
    userId: "1",
    mediaId: "8",
    watchedAt: "2023-12-22",
    rating: 4.5,
    isRewatch: true,
    createdAt: "2023-12-22",
    media: {
      id: "8",
      tmdbId: 800158,
      type: "movie",
      title: "The Killer",
      posterPath:
        "https://image.tmdb.org/t/p/w500/e7Jvsry47v0o6ijG0lD4gSK1RGs.jpg",
      year: 2023,
    },
  },
];

// Mock Reviews
export const MOCK_REVIEWS: Review[] = [
  {
    id: "1",
    userId: "1",
    mediaId: "1",
    content:
      "Christopher Nolan delivers a masterpiece. The IMAX sequences are breathtaking, and Cillian Murphy gives the performance of a lifetime. This film haunts you long after the credits roll. The way Nolan weaves together the different timelines is nothing short of genius.",
    rating: 5,
    likesCount: 234,
    commentsCount: 45,
    containsSpoilers: false,
    createdAt: "2024-01-04",
    updatedAt: "2024-01-04",
    media: {
      id: "1",
      tmdbId: 872585,
      type: "movie",
      title: "Oppenheimer",
      posterPath:
        "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
      year: 2023,
    },
  },
  {
    id: "2",
    userId: "1",
    mediaId: "2",
    content:
      "Emma Stone is absolutely phenomenal. Lanthimos creates a bizarre, beautiful world that somehow makes you laugh and cry at the same time. The production design is unreal.",
    rating: 4,
    likesCount: 156,
    commentsCount: 28,
    containsSpoilers: false,
    createdAt: "2024-01-03",
    updatedAt: "2024-01-03",
    media: {
      id: "2",
      tmdbId: 792307,
      type: "movie",
      title: "Poor Things",
      posterPath:
        "https://image.tmdb.org/t/p/w500/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg",
      year: 2023,
    },
  },
  {
    id: "3",
    userId: "1",
    mediaId: "4",
    content:
      "A quiet, devastating film about connection and what-ifs. The performances are understated but powerful. One of the best of the year.",
    rating: 5,
    likesCount: 312,
    commentsCount: 67,
    containsSpoilers: false,
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    media: {
      id: "4",
      tmdbId: 666277,
      type: "movie",
      title: "Past Lives",
      posterPath:
        "https://image.tmdb.org/t/p/original/k3waqVXSnvCZWfJYNtdamTgTtTA.jpg",
      year: 2023,
    },
  },
  {
    id: "4",
    userId: "1",
    mediaId: "5",
    content:
      "The sound design is the real star here. Glazer creates a film that's almost impossible to watch but even more impossible to look away from.",
    rating: 4,
    likesCount: 89,
    commentsCount: 23,
    containsSpoilers: true,
    createdAt: "2023-12-30",
    updatedAt: "2023-12-30",
    media: {
      id: "5",
      tmdbId: 467244,
      type: "movie",
      title: "The Zone of Interest",
      posterPath:
        "https://image.tmdb.org/t/p/original/hUu9zyZmDd8VZegKi1iK1Vk0RYS.jpg",
      year: 2023,
    },
  },
];

// Mock Lists
export const MOCK_LISTS: List[] = [
  {
    id: "1",
    userId: "1",
    name: "Top 50 Films of All Time",
    description:
      "My personal ranking of the greatest films ever made. Updated regularly as I discover new favorites.",
    itemsCount: 50,
    likesCount: 892,
    isPublic: true,
    isRanked: true,
    viewsCount: 12500,
    coverImages: [
      "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
      "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
      "https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
      "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    ],
    createdAt: "2023-08-15",
  },
  {
    id: "2",
    userId: "1",
    name: "Best Horror of 2023",
    description: "The scariest, most unsettling films released this year.",
    itemsCount: 15,
    likesCount: 234,
    isPublic: true,
    isRanked: true,
    viewsCount: 4500,
    coverImages: [
      "https://image.tmdb.org/t/p/w500/t2Ew8NZ8Ci2kqMjsPqnZJfJPDmF.jpg",
      "https://image.tmdb.org/t/p/w500/gOnmaxHo0412UVr1QM5Nekv1xPi.jpg",
    ],
    createdAt: "2023-12-01",
  },
  {
    id: "3",
    userId: "1",
    name: "A24 Essentials",
    description: "The best films from the best indie studio right now.",
    itemsCount: 28,
    likesCount: 567,
    isPublic: true,
    isRanked: false,
    viewsCount: 8900,
    coverImages: [
      "https://image.tmdb.org/t/p/w500/w46Vw536HwNnEzOa7J24YH9DPRS.jpg",
      "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
      "https://image.tmdb.org/t/p/w500/8oWOxfuLGFj8OAlKqjBL9AXsNCH.jpg",
    ],
    createdAt: "2023-09-20",
  },
  {
    id: "4",
    userId: "1",
    name: "Weekend Watchlist",
    description: "Films I'm planning to watch this weekend.",
    itemsCount: 5,
    likesCount: 12,
    isPublic: false,
    isRanked: false,
    viewsCount: 0,
    coverImages: [],
    createdAt: "2024-01-02",
  },
];

// Mock Watchlist
export const MOCK_WATCHLIST: WatchlistItem[] = [
  {
    id: "1",
    userId: "1",
    mediaId: "1",
    createdAt: "2024-01-03",
    addedAt: "2024-01-03",
    priority: "high",
    media: {
      id: "1",
      tmdbId: 466420,
      type: "movie",
      title: "Killers of the Flower Moon",
      posterPath:
        "https://image.tmdb.org/t/p/w500/dB6Krk806zeqd0YNp2ngQ9zXteH.jpg",
      year: 2023,
    },
  },
  {
    id: "2",
    userId: "1",
    mediaId: "2",
    createdAt: "2024-01-02",
    addedAt: "2024-01-02",
    priority: "high",
    media: {
      id: "2",
      tmdbId: 1029575,
      type: "movie",
      title: "The Iron Claw",
      posterPath:
        "https://image.tmdb.org/t/p/w500/nfs7DCYhgrEIgxKYbITHTzKsggf.jpg",
      year: 2023,
    },
  },
  {
    id: "3",
    userId: "1",
    mediaId: "3",
    createdAt: "2024-01-01",
    addedAt: "2024-01-01",
    priority: "medium",
    media: {
      id: "3",
      tmdbId: 926393,
      type: "movie",
      title: "American Fiction",
      posterPath:
        "https://image.tmdb.org/t/p/w500/46sp1Z9b2PPTgCRAtpKrPCEC0sV.jpg",
      year: 2023,
    },
  },
  {
    id: "4",
    userId: "1",
    mediaId: "4",
    createdAt: "2023-12-28",
    addedAt: "2023-12-28",
    priority: "medium",
    media: {
      id: "4",
      tmdbId: 508883,
      type: "movie",
      title: "The Boy and the Heron",
      posterPath:
        "https://image.tmdb.org/t/p/w500/cNtAslrDhk1i3IOZ16vF7df6LMy.jpg",
      year: 2023,
    },
  },
  {
    id: "5",
    userId: "1",
    mediaId: "5",
    createdAt: "2023-12-25",
    addedAt: "2023-12-25",
    priority: "low",
    media: {
      id: "5",
      tmdbId: 822119,
      type: "movie",
      title: "Ferrari",
      posterPath:
        "https://image.tmdb.org/t/p/w500/r7DuyYFhkmfrpjqVmPNAFWaFSoG.jpg",
      year: 2023,
    },
  },
  {
    id: "6",
    userId: "1",
    mediaId: "6",
    createdAt: "2023-12-20",
    addedAt: "2023-12-20",
    priority: "low",
    media: {
      id: "6",
      tmdbId: 753342,
      type: "movie",
      title: "Napoleon",
      posterPath:
        "https://image.tmdb.org/t/p/w500/jE5o7y9K6pZtWNNMEw3IdpHuncR.jpg",
      year: 2023,
    },
  },
];

// Mock Likes
export const MOCK_LIKES: LikeItem[] = [
  {
    id: "1",
    userId: "1",
    mediaId: "1",
    likedAt: "2024-01-04",
    media: {
      id: "1",
      tmdbId: 872585,
      type: "movie",
      title: "Oppenheimer",
      posterPath:
        "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
      year: 2023,
    },
  },
  {
    id: "2",
    userId: "1",
    mediaId: "2",
    likedAt: "2024-01-02",
    media: {
      id: "2",
      tmdbId: 346698,
      type: "movie",
      title: "Barbie",
      posterPath:
        "https://image.tmdb.org/t/p/w500/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg",
      year: 2023,
    },
  },
  {
    id: "3",
    userId: "1",
    mediaId: "3",
    likedAt: "2024-01-01",
    media: {
      id: "3",
      tmdbId: 666277,
      type: "movie",
      title: "Past Lives",
      posterPath:
        "https://image.tmdb.org/t/p/original/k3waqVXSnvCZWfJYNtdamTgTtTA.jpg",
      year: 2023,
    },
  },
  {
    id: "4",
    userId: "1",
    mediaId: "4",
    likedAt: "2023-12-28",
    media: {
      id: "4",
      tmdbId: 569094,
      type: "movie",
      title: "Spider-Man: Across the Spider-Verse",
      posterPath:
        "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
      year: 2023,
    },
  },
  {
    id: "5",
    userId: "1",
    mediaId: "5",
    likedAt: "2023-12-25",
    media: {
      id: "5",
      tmdbId: 840430,
      type: "movie",
      title: "The Holdovers",
      posterPath:
        "https://image.tmdb.org/t/p/w500/VHSzNBTwxV8vh7wylo7O9CLdac.jpg",
      year: 2023,
    },
  },
  {
    id: "6",
    userId: "1",
    mediaId: "6",
    likedAt: "2023-12-20",
    media: {
      id: "6",
      tmdbId: 915935,
      type: "movie",
      title: "Anatomy of a Fall",
      posterPath:
        "https://image.tmdb.org/t/p/w500/kQs6keheMwCxJxrzV83VUwFtHkB.jpg",
      year: 2023,
    },
  },
  {
    id: "7",
    userId: "1",
    mediaId: "7",
    likedAt: "2023-12-15",
    media: {
      id: "7",
      tmdbId: 800158,
      type: "movie",
      title: "The Killer",
      posterPath:
        "https://image.tmdb.org/t/p/w500/e7Jvsry47v0o6ijG0lD4gSK1RGs.jpg",
      year: 2023,
    },
  },
  {
    id: "8",
    userId: "1",
    mediaId: "8",
    likedAt: "2023-12-10",
    media: {
      id: "8",
      tmdbId: 840430,
      type: "movie",
      title: "Priscilla",
      posterPath:
        "https://image.tmdb.org/t/p/w500/p7cugRnPYzE12pDQWLLT8Y4P9Fx.jpg",
      year: 2023,
    },
  },
];

// Mock Activity
export const MOCK_ACTIVITY: Activity[] = [
  {
    id: "1",
    userId: "1",
    type: "watch",
    createdAt: "2024-01-04T14:30:00",
    data: {
      title: "Oppenheimer",
      posterPath:
        "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
      rating: 4.5,
    },
  },
  {
    id: "2",
    userId: "1",
    type: "review",
    createdAt: "2024-01-04T15:00:00",
    data: {
      title: "Oppenheimer",
      posterPath:
        "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
      content: "Christopher Nolan delivers a masterpiece...",
    },
  },
  {
    id: "3",
    userId: "1",
    type: "like",
    createdAt: "2024-01-03T20:00:00",
    data: {
      title: "Poor Things",
      posterPath:
        "https://image.tmdb.org/t/p/w500/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg",
    },
  },
  {
    id: "4",
    userId: "1",
    type: "list",
    createdAt: "2024-01-02T10:00:00",
    data: { title: "Weekend Watchlist" },
  },
  {
    id: "5",
    userId: "1",
    type: "follow",
    createdAt: "2024-01-01T18:00:00",
    data: { username: "film_critic_jane" },
  },
  {
    id: "6",
    userId: "1",
    type: "watch",
    createdAt: "2024-01-01T22:00:00",
    data: {
      title: "Past Lives",
      posterPath:
        "https://image.tmdb.org/t/p/original/k3waqVXSnvCZWfJYNtdamTgTtTA.jpg",
      rating: 5,
    },
  },
  {
    id: "7",
    userId: "1",
    type: "like",
    createdAt: "2023-12-30T16:00:00",
    data: {
      title: "The Zone of Interest",
      posterPath:
        "https://image.tmdb.org/t/p/original/hUu9zyZmDd8VZegKi1iK1Vk0RYS.jpg",
    },
  },
  {
    id: "8",
    userId: "1",
    type: "review",
    createdAt: "2023-12-28T14:00:00",
    data: {
      title: "Anatomy of a Fall",
      posterPath:
        "https://image.tmdb.org/t/p/w500/kQs6keheMwCxJxrzV83VUwFtHkB.jpg",
      content: "A courtroom drama like no other...",
    },
  },
];
