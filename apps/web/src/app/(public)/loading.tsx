export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">
          Carregando
        </span>
      </div>
    </div>
  );
}
