import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Users, ChevronLeft } from "lucide-react";
import type { Credit } from "@/types";
import { getMovie } from "@/lib/queries/media";

function groupCrewByDepartment(crew: Credit[]): Record<string, Credit[]> {
  const groups: Record<string, Credit[]> = {};

  const departmentOrder = [
    "Director",
    "Producer",
    "Executive Producer",
    "Writer",
    "Screenplay",
    "Story",
    "Cinematography",
    "Director of Photography",
    "Editor",
    "Composer",
    "Original Music Composer",
    "Production Design",
    "Art Direction",
    "Costume Design",
    "Makeup",
    "Visual Effects",
    "Sound",
    "Casting",
    "Stunts",
  ];

  crew.forEach((credit) => {
    const key = credit.job || credit.department || "Other";
    if (!groups[key]) groups[key] = [];
    groups[key].push(credit);
  });

  const sortedGroups: Record<string, Credit[]> = {};
  departmentOrder.forEach((dept) => {
    if (groups[dept]) sortedGroups[dept] = groups[dept];
  });
  Object.keys(groups).forEach((dept) => {
    if (!sortedGroups[dept]) sortedGroups[dept] = groups[dept];
  });

  return sortedGroups;
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const movie = await getMovie(slug);
  const title = movie?.title ?? slug.replace(/-/g, " ");
  return {
    title: `${title} — Crew | PixelReel`,
    description: `Full crew list for ${title}.`,
  };
}

export default async function CrewPage({ params }: PageProps) {
  const { slug } = await params;
  const movie = await getMovie(slug);

  if (!movie) notFound();

  const crew = movie.credits?.filter((c) => c.creditType === "crew") || [];
  const groupedCrew = groupCrewByDepartment(crew);
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-white/10 bg-zinc-900/50">
        <div className="container mx-auto px-4 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link
              href={`/movies/${slug}`}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>

            <div className="flex items-center gap-4">
              {movie.posterPath && (
                <div className="w-12 h-18 rounded overflow-hidden flex-shrink-0">
                  <Image
                    src={movie.posterPath}
                    alt={movie.title}
                    width={48}
                    height={72}
                    className="object-cover"
                  />
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-white">
                  {movie.title}{" "}
                  {year && <span className="text-zinc-400">({year})</span>}
                </h1>
                <p className="text-sm text-zinc-400">Crew</p>
              </div>
            </div>
          </div>

          <nav className="flex gap-6 mt-6 -mb-px">
            <Link href={`/movies/${slug}`} className="pb-3 text-sm font-medium text-zinc-500 hover:text-white transition-colors">Overview</Link>
            <Link href={`/movies/${slug}/cast`} className="pb-3 text-sm font-medium text-zinc-500 hover:text-white transition-colors">Cast</Link>
            <Link href={`/movies/${slug}/crew`} className="pb-3 text-sm font-medium text-white border-b-2 border-purple-500">Crew</Link>
            <Link href={`/movies/${slug}/reviews`} className="pb-3 text-sm font-medium text-zinc-500 hover:text-white transition-colors">Reviews</Link>
          </nav>
        </div>
      </div>

      {/* Crew by Department */}
      <div className="container mx-auto px-4 lg:px-8 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Users className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold text-white">Crew ({crew.length})</h2>
        </div>

        {Object.keys(groupedCrew).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(groupedCrew).map(([department, members]) => (
              <section key={department}>
                <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-white/10">
                  {department}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {members.map((credit) => (
                    <Link
                      key={credit.id}
                      href={`/people/${credit.person.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/50 border border-white/5 hover:border-purple-500/30 hover:bg-zinc-800/50 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0">
                        {credit.person.profilePath ? (
                          <Image
                            src={credit.person.profilePath}
                            alt={credit.person.name}
                            width={40}
                            height={40}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600">
                            👤
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white group-hover:text-purple-400 transition-colors truncate">
                          {credit.person.name}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500">No crew information available.</p>
          </div>
        )}
      </div>
    </div>
  );
}
