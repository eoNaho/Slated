import { UserLists } from "@/components/profile/user-lists";

// Dados de exemplo
const mockLists = [
  {
    id: "1",
    userId: "user_1",
    name: "Best Sci-Fi Movies of 2024",
    slug: "best-sci-fi-movies-of-2024",
    description:
      "A curated collection of the most mind-bending science fiction films",
    itemsCount: 25,
    likesCount: 1432,
    viewsCount: 12050,
    isPublic: true,
    isRanked: false,
    createdAt: "2024-01-15T12:00:00Z",
    coverImages: [
      "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
      "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
      "https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
      "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
      "https://image.tmdb.org/t/p/w500/gOnmaxHo0412UVr1QM5Nekv1xPi.jpg",
    ],
    user: {
      id: "user_1",
      username: "cinephile_pro",
      avatarUrl: "/avatars/user1.jpg",
      isVerified: true,
      isPremium: false,
      role: "user" as const,
      status: "active" as const,
      createdAt: "2023-01-01T00:00:00Z",
    },
  },
  {
    id: "2",
    userId: "user_2",
    name: "Action Movies Collection",
    slug: "action-movies-collection",
    description: "The most explosive action films",
    itemsCount: 30,
    likesCount: 890,
    viewsCount: 8200,
    isPublic: true,
    isRanked: false,
    createdAt: "2024-02-01T12:00:00Z",
    coverImages: [
      "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
      "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
      "https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
      "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
      "https://image.tmdb.org/t/p/w500/gOnmaxHo0412UVr1QM5Nekv1xPi.jpg",
    ],
    user: {
      id: "user_2",
      username: "movie_buff",
      avatarUrl: "/avatars/user2.jpg",
      isVerified: false,
      isPremium: true,
      role: "user" as const,
      status: "active" as const,
      createdAt: "2023-03-01T00:00:00Z",
    },
  },
];

export default function ListsExample() {
  return (
    <div className="bg-zinc-950 min-h-screen p-8 space-y-16">
      {/* LARGE 01 - Lista grande horizontal (padrão) */}
      <div>
        <h3 className="text-2xl font-bold text-white mb-4">
          Large 01 (Default)
        </h3>
        <UserLists lists={mockLists} variant="lg01" limit={3} />
      </div>

      {/* MEDIUM 01 - Lista média com título à direita */}
      <div>
        <h3 className="text-2xl font-bold text-white mb-4">
          Medium 01 (Title Right)
        </h3>
        <UserLists lists={mockLists} variant="md01" limit={3} />
      </div>

      {/* MEDIUM 02 - Lista média com título à direita (alternativa) */}
      <div>
        <h3 className="text-2xl font-bold text-white mb-4">
          Medium 02 (Title Right Alt)
        </h3>
        <UserLists lists={mockLists} variant="md02" limit={3} />
      </div>

      {/* EXTRA LARGE - Lista extra grande com mais slots */}
      <div>
        <h3 className="text-2xl font-bold text-white mb-4">
          Extra Large (8 slots)
        </h3>
        <UserLists lists={mockLists} variant="xlg" limit={2} />
      </div>

      {/* SMALL - Listas pequenas */}
      <div>
        <h3 className="text-2xl font-bold text-white mb-4">Small</h3>
        <UserLists lists={mockLists} variant="sm" limit={4} />
      </div>

      {/* EXTRA SMALL - Listas extra pequenas */}
      <div>
        <h3 className="text-2xl font-bold text-white mb-4">Extra Small</h3>
        <UserLists lists={mockLists} variant="xsm" limit={4} />
      </div>

      {/* CARD GRID - Grid de cards */}
      <div>
        <h3 className="text-2xl font-bold text-white mb-4">Card Grid</h3>
        <UserLists
          lists={mockLists}
          variant="card"
          gridLayout={true}
          limit={8}
        />
      </div>

      {/* LARGE 02 - Cards grandes */}
      <div>
        <h3 className="text-2xl font-bold text-white mb-4">Large 02 Grid</h3>
        <UserLists
          lists={mockLists}
          variant="lg02"
          gridLayout={true}
          limit={6}
        />
      </div>

      {/* THUMBNAIL EXTRA LARGE - Thumbnails extra grandes com overlay (NOVO) */}
      <div>
        <h3 className="text-2xl font-bold text-white mb-4">
          Thumbnail Extra Large (Overlay)
        </h3>
        <UserLists
          lists={mockLists}
          variant="thumbnail-xlg"
          gridLayout={true}
          limit={6}
        />
      </div>

      {/* THUMBNAIL LARGE - Thumbnails grandes com overlay */}
      <div>
        <h3 className="text-2xl font-bold text-white mb-4">
          Thumbnail Large (Overlay)
        </h3>
        <UserLists
          lists={mockLists}
          variant="thumbnail-lg"
          gridLayout={true}
          limit={6}
        />
      </div>

      {/* THUMBNAIL MEDIUM - Thumbnails médios com overlay */}
      <div>
        <h3 className="text-2xl font-bold text-white mb-4">
          Thumbnail Medium (Overlay)
        </h3>
        <UserLists
          lists={mockLists}
          variant="thumbnail-md"
          gridLayout={true}
          limit={8}
        />
      </div>

      {/* THUMBNAIL SMALL - Thumbnails pequenos com overlay */}
      <div>
        <h3 className="text-2xl font-bold text-white mb-4">
          Thumbnail Small (Overlay)
        </h3>
        <UserLists
          lists={mockLists}
          variant="thumbnail-sm"
          gridLayout={true}
          limit={10}
        />
      </div>

      {/* THUMBNAIL WIDE - Thumbnails largos horizontais com overlay (NOVO) */}
      <div>
        <h3 className="text-2xl font-bold text-white mb-4">
          Thumbnail Wide (Horizontal Overlay)
        </h3>
        <UserLists
          lists={mockLists}
          variant="thumbnail-wide"
          gridLayout={true}
          limit={4}
        />
      </div>
    </div>
  );
}
