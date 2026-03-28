export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative">
      <div className="fixed inset-0 bg-gradient-to-br from-black via-purple-900/20 to-black -z-10" />

      {/* Banner */}
      <div className="relative h-64 lg:h-80 w-full bg-zinc-900 animate-pulse" />

      {/* Profile Content */}
      <div className="container mx-auto px-6 relative z-10 -mt-24 lg:-mt-28">
        <div className="flex flex-col md:flex-row gap-5 items-start animate-pulse">

          {/* Avatar */}
          <div className="shrink-0 mt-auto">
            <div className="w-[88px] h-[88px] rounded-full bg-zinc-800 ring-4 ring-zinc-950" />
          </div>

          {/* User info */}
          <div className="flex-1 min-w-0 pb-2 pt-10 md:pt-12 space-y-3">
            {/* Name */}
            <div className="h-9 bg-zinc-800 rounded-lg w-48" />
            {/* Username + location */}
            <div className="flex items-center gap-3">
              <div className="h-4 bg-zinc-800 rounded w-24" />
              <div className="h-4 bg-zinc-800 rounded w-20" />
            </div>
            {/* Bio */}
            <div className="space-y-1.5">
              <div className="h-4 bg-zinc-800 rounded w-full max-w-sm" />
              <div className="h-4 bg-zinc-800 rounded w-3/4 max-w-xs" />
            </div>
            {/* Social / meta */}
            <div className="flex items-center gap-4">
              <div className="h-3.5 bg-zinc-800 rounded w-20" />
              <div className="h-3.5 bg-zinc-800 rounded w-16" />
            </div>
          </div>

          {/* Action buttons */}
          <div className="shrink-0 pt-10 md:pt-12 flex items-center gap-2.5 animate-pulse">
            <div className="h-10 w-28 bg-zinc-800 rounded-xl" />
            <div className="h-10 w-28 bg-zinc-800 rounded-xl" />
            <div className="h-10 w-10 bg-zinc-800 rounded-xl" />
          </div>
        </div>

        {/* Highlights row */}
        <div className="mt-8 flex gap-5 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800" />
              <div className="h-2.5 bg-zinc-800 rounded w-12" />
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-6 pt-5 border-t border-white/5 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="h-4 bg-zinc-800 rounded w-8" />
              <div className="h-4 bg-zinc-800 rounded w-12" />
            </div>
          ))}
        </div>
      </div>

      {/* Tabs bar */}
      <div className="container mx-auto px-6 mt-8 animate-pulse">
        <div className="flex gap-1 border-b border-white/5 pb-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 w-20 bg-zinc-800/60 rounded-t-lg" />
          ))}
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-zinc-800 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
