import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, MapPin, Star, Film, Tv, ChevronLeft } from "lucide-react";
import { mediaApi } from "@/lib/api";
import type { Person, Credit } from "@/types";

// Fetch person by ID - using the credits data we already have
async function getPerson(id: string): Promise<{
  person: Person;
  credits: Credit[];
} | null> {
  try {
    // For now, we'll try to get person info from any media they're in
    // In a full implementation, there would be a /people/:id endpoint
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1"}/people/${id}`
    );
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

// Calculate age
function calculateAge(birthDate: string, deathDate?: string | null): number {
  const birth = new Date(birthDate);
  const end = deathDate ? new Date(deathDate) : new Date();
  let age = end.getFullYear() - birth.getFullYear();
  const monthDiff = end.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PersonPage({ params }: PageProps) {
  const { id } = await params;
  const personData = await getPerson(id);

  if (!personData) {
    notFound();
  }

  const { person, credits = [] } = personData;

  // Separate movie and series credits
  const movieCredits = credits.filter((c) => c.mediaId && c.creditType);
  const castCredits = movieCredits.filter((c) => c.creditType === "cast");
  const crewCredits = movieCredits.filter((c) => c.creditType === "crew");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header with gradient */}
      <div className="relative bg-gradient-to-b from-purple-900/20 to-zinc-950 pt-8 pb-12">
        <div className="container mx-auto px-4 lg:px-8">
          {/* Back button */}
          <Link
            href="javascript:history.back()"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Link>

          <div className="flex flex-col md:flex-row gap-8">
            {/* Profile Photo */}
            <div className="flex-shrink-0">
              <div className="w-48 md:w-64 aspect-[2/3] relative rounded-xl overflow-hidden bg-zinc-800 ring-1 ring-white/10">
                {person.profilePath ? (
                  <Image
                    src={person.profilePath}
                    alt={person.name}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-6xl text-zinc-600">
                    👤
                  </div>
                )}
              </div>
            </div>

            {/* Person Info */}
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                {person.name}
              </h1>

              {person.knownFor && (
                <p className="text-lg text-zinc-400 mb-4">
                  Known for {person.knownFor}
                </p>
              )}

              {/* Stats */}
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/50 border border-white/5">
                  <Film className="h-4 w-4 text-purple-400" />
                  <span className="text-sm text-white font-medium">
                    {castCredits.length} Acting Credits
                  </span>
                </div>
                {crewCredits.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/50 border border-white/5">
                    <Tv className="h-4 w-4 text-blue-400" />
                    <span className="text-sm text-white font-medium">
                      {crewCredits.length} Crew Credits
                    </span>
                  </div>
                )}
              </div>

              {/* Personal Info - placeholder for when API provides more data */}
              <div className="space-y-2 text-sm text-zinc-400">
                <p className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-400" />
                  TMDB ID: {person.tmdbId}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filmography */}
      <div className="container mx-auto px-4 lg:px-8 py-8">
        {/* Acting Credits */}
        {castCredits.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Film className="h-5 w-5 text-purple-400" />
              Acting
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {castCredits.map((credit, index) => (
                <div key={`${credit.id}-${index}`} className="group">
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800 mb-2 ring-1 ring-white/10">
                    <div className="h-full w-full flex items-center justify-center">
                      <Film className="h-8 w-8 text-zinc-600" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-white truncate">
                    Media #{credit.mediaId?.slice(0, 8)}
                  </p>
                  {credit.character && (
                    <p className="text-xs text-zinc-500 truncate">
                      as {credit.character}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Crew Credits */}
        {crewCredits.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Tv className="h-5 w-5 text-blue-400" />
              Crew
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {crewCredits.map((credit, index) => (
                <div
                  key={`${credit.id}-${index}`}
                  className="p-4 rounded-lg bg-zinc-900/50 border border-white/5"
                >
                  <p className="text-sm font-medium text-white">
                    Media #{credit.mediaId?.slice(0, 8)}
                  </p>
                  <p className="text-xs text-zinc-500">{credit.job}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {castCredits.length === 0 && crewCredits.length === 0 && (
          <div className="text-center py-12">
            <Film className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500">No filmography available.</p>
          </div>
        )}
      </div>
    </div>
  );
}
