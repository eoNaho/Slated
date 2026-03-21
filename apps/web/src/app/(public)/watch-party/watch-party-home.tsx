"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Users, ArrowRight, Clock, Play, Tv2 } from "lucide-react";
import type { WatchPartyRoom } from "@/lib/api";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

const SOURCES = [
  { value: "netflix", label: "Netflix", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  { value: "disney", label: "Disney+", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  { value: "max", label: "Max", color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
  { value: "prime", label: "Prime Video", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
] as const;

type Source = "netflix" | "disney" | "max" | "prime";

function sourceLabel(source: string | null) {
  return SOURCES.find((s) => s.value === source)?.label ?? source ?? "—";
}

function sourceColor(source: string | null) {
  return SOURCES.find((s) => s.value === source)?.color ?? "text-zinc-400";
}

function statusLabel(status: string) {
  if (status === "waiting") return "Aguardando";
  if (status === "active") return "Ao vivo";
  return "Encerrada";
}

function statusDot(status: string) {
  if (status === "active") return "bg-green-400 animate-pulse";
  if (status === "waiting") return "bg-yellow-400";
  return "bg-zinc-600";
}

async function apiFetch<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro" }));
    throw new Error(err.error ?? "Erro");
  }
  return res.json();
}

interface Props {
  myRooms: WatchPartyRoom[];
}

export function WatchPartyHome({ myRooms }: Props) {
  const router = useRouter();

  // Create form
  const [title, setTitle] = useState("");
  const [mediaSource, setMediaSource] = useState<Source>("netflix");
  const [mediaTitle, setMediaTitle] = useState("");
  const [creating, setCreating] = useState(false);

  // Join form
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast.error("Dê um nome para a sua sala."); return; }

    setCreating(true);
    try {
      const room = await apiFetch<{ code: string }>("/watch-party/rooms", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          mediaSource,
          mediaTitle: mediaTitle.trim() || undefined,
        }),
      });
      toast.success("Sala criada!");
      router.push(`/watch-party/${room.code}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar sala.");
      setCreating(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) { toast.error("O código deve ter 6 caracteres."); return; }

    setJoining(true);
    try {
      // Just check the room exists, then navigate
      await apiFetch(`/watch-party/rooms/${code}`);
      router.push(`/watch-party/${code}`);
    } catch {
      toast.error("Sala não encontrada.");
      setJoining(false);
    }
  }

  const activeRooms = myRooms.filter((r) => r.status !== "ended");
  const pastRooms = myRooms.filter((r) => r.status === "ended");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-black via-purple-900/10 to-black -z-10" />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="relative border-b border-white/5 bg-zinc-900/20 backdrop-blur-md">
        <div className="container mx-auto px-6 pt-16 pb-12">
          <div className="relative">
            <div className="absolute -left-12 -top-12 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl -z-10 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-purple-400 mb-4 flex items-center gap-2">
              <span className="w-8 h-px bg-purple-500/30" />
              Sincronizado
            </p>
            <h1
              className="font-black text-white leading-none mb-6"
              style={{ fontSize: "clamp(3rem, 9vw, 6rem)", letterSpacing: "-0.05em" }}
            >
              Watch Party
            </h1>
            <p className="text-zinc-400 text-base max-w-lg leading-relaxed font-medium">
              Assista junto com seus amigos em sincronia perfeita. Play, pause e
              seek sincronizados em tempo real na Netflix, Disney+, Max e Prime Video.
            </p>
          </div>
        </div>
      </div>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl">

          {/* ── Create Room ──────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-sm p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Tv2 className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="font-bold text-white text-lg leading-tight">Criar sala</h2>
                <p className="text-zinc-500 text-sm">Você será o host</p>
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Nome da sala
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Maratona de Stranger Things"
                  maxLength={100}
                  className="w-full bg-zinc-800/60 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500/50 focus:bg-zinc-800/80 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Plataforma
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SOURCES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setMediaSource(s.value)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        mediaSource === s.value
                          ? `${s.bg} ${s.color} border-current/30`
                          : "bg-zinc-800/40 border-white/5 text-zinc-400 hover:border-white/10 hover:text-zinc-300"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${s.color.replace("text-", "bg-")} opacity-80`} />
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Título da mídia <span className="text-zinc-600 normal-case font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={mediaTitle}
                  onChange={(e) => setMediaTitle(e.target.value)}
                  placeholder="Ex: Stranger Things S4"
                  maxLength={200}
                  className="w-full bg-zinc-800/60 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500/50 focus:bg-zinc-800/80 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="group relative w-full flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold text-white uppercase tracking-wider rounded-xl overflow-hidden transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 group-hover:from-purple-500 group-hover:to-indigo-500 transition-all" />
                <span className="relative flex items-center gap-2">
                  {creating ? (
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {creating ? "Criando..." : "Criar sala"}
                </span>
              </button>
            </form>
          </div>

          {/* ── Join Room ─────────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-sm p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="font-bold text-white text-lg leading-tight">Entrar em sala</h2>
                <p className="text-zinc-500 text-sm">Use o código de 6 caracteres</p>
              </div>
            </div>

            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Código da sala
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="XKMP2Q"
                  maxLength={6}
                  className="w-full bg-zinc-800/60 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500/50 focus:bg-zinc-800/80 transition-colors font-mono text-center text-lg tracking-widest uppercase"
                />
              </div>

              <div className="pt-2 pb-4 space-y-3">
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Para sincronizar o vídeo, você precisará da
                  extensão PixelReel instalada na mesma plataforma que o host.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SOURCES.map((s) => (
                    <span
                      key={s.value}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${s.bg} ${s.color}`}
                    >
                      {s.label}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={joining || joinCode.length !== 6}
                className="group relative w-full flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold text-white uppercase tracking-wider rounded-xl overflow-hidden transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 group-hover:from-purple-500 group-hover:to-indigo-500 transition-all" />
                <span className="relative flex items-center gap-2">
                  {joining ? (
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  {joining ? "Entrando..." : "Entrar"}
                </span>
              </button>
            </form>
          </div>
        </div>

        {/* ── My rooms ───────────────────────────────────────────────────── */}
        {myRooms.length > 0 && (
          <div className="mt-12 max-w-4xl">
            {activeRooms.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500 mb-4 flex items-center gap-2">
                  <span className="w-5 h-px bg-zinc-700" />
                  Salas ativas
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeRooms.map((room) => (
                    <RoomCard key={room.id} room={room} />
                  ))}
                </div>
              </div>
            )}

            {pastRooms.length > 0 && (
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500 mb-4 flex items-center gap-2">
                  <span className="w-5 h-px bg-zinc-700" />
                  Histórico
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pastRooms.slice(0, 6).map((room) => (
                    <RoomCard key={room.id} room={room} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RoomCard({ room }: { room: WatchPartyRoom }) {
  const isEnded = room.status === "ended";

  return (
    <Link
      href={isEnded ? "#" : `/watch-party/${room.code}`}
      className={`group flex items-center gap-4 p-4 rounded-xl border transition-all ${
        isEnded
          ? "border-white/5 bg-zinc-900/20 pointer-events-none opacity-50"
          : "border-white/5 bg-zinc-900/40 hover:border-purple-500/20 hover:bg-zinc-900/60"
      }`}
    >
      <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
        <Tv2 className="w-4 h-4 text-zinc-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{room.title}</p>
        <p className="text-xs text-zinc-500 flex items-center gap-2 mt-0.5">
          <span className={`w-1.5 h-1.5 rounded-full ${statusDot(room.status)}`} />
          <span className={sourceColor(room.mediaSource)}>{sourceLabel(room.mediaSource)}</span>
          <span>·</span>
          <span>{statusLabel(room.status)}</span>
        </p>
      </div>
      {!isEnded && (
        <div className="font-mono text-xs text-zinc-500 bg-zinc-800/60 border border-white/5 rounded-lg px-2.5 py-1 shrink-0">
          {room.code}
        </div>
      )}
      {room.status === "waiting" && (
        <Clock className="w-4 h-4 text-zinc-600 shrink-0" />
      )}
    </Link>
  );
}
