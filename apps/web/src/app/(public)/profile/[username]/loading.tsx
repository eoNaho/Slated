export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 animate-pulse">
      {/* Cover skeleton */}
      <div className="h-48 md:h-64 bg-zinc-900" />

      <div className="max-w-5xl mx-auto px-4">
        {/* Avatar + header */}
        <div className="flex items-end gap-4 -mt-12 mb-6">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-zinc-800 border-4 border-zinc-950 shrink-0" />
          <div className="pb-2 space-y-2 flex-1">
            <div className="h-6 bg-zinc-800 rounded w-40" />
            <div className="h-4 bg-zinc-800 rounded w-24" />
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-5 bg-zinc-800 rounded w-8" />
              <div className="h-3 bg-zinc-800 rounded w-14" />
            </div>
          ))}
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-zinc-800 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
