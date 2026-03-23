export default function SeriesLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 animate-pulse">
      {/* Backdrop skeleton */}
      <div className="h-[50vh] bg-zinc-900" />

      <div className="max-w-6xl mx-auto px-4 -mt-32 relative z-10 pb-16">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Poster skeleton */}
          <div className="w-48 md:w-64 h-72 md:h-96 rounded-2xl bg-zinc-800 shrink-0" />

          {/* Info skeleton */}
          <div className="flex-1 pt-4 space-y-4">
            <div className="h-8 bg-zinc-800 rounded-lg w-3/4" />
            <div className="h-4 bg-zinc-800 rounded w-1/3" />
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-6 w-16 bg-zinc-800 rounded-full" />
              ))}
            </div>
            <div className="space-y-2 pt-2">
              <div className="h-3 bg-zinc-800 rounded w-full" />
              <div className="h-3 bg-zinc-800 rounded w-full" />
              <div className="h-3 bg-zinc-800 rounded w-5/6" />
            </div>
            {/* Seasons bar skeleton */}
            <div className="flex gap-2 pt-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-8 w-20 bg-zinc-800 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
