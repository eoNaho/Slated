import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { StoryArchiveGrid } from "@/components/stories/StoryArchiveGrid";

const AUTH_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") || "http://localhost:3001";

async function getSession(cookieHeader: string) {
  try {
    const res = await fetch(`${AUTH_BASE}/api/auth/get-session`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function ArchivePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const session = await getSession(cookieHeader);
  const sessionUsername = session?.user?.username;

  // Only own profile can view their archive
  if (sessionUsername !== username) {
    redirect(`/profile/${username}`);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="fixed inset-0 bg-gradient-to-br from-black via-purple-900/10 to-black -z-10" />

      {/* Header */}
      <div className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href={`/profile/${username}`}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-white/60" />
          </Link>
          <div>
            <h1 className="text-white font-semibold">Arquivo</h1>
            <p className="text-white/40 text-xs">@{username}</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-0 max-w-xl">
        <StoryArchiveGrid />
      </div>
    </div>
  );
}
