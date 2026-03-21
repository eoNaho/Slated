"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Tv2,
  Users,
  Send,
  Copy,
  CircleDot,
  Clock,
  XCircle,
  CheckCircle2,
  Wifi,
  WifiOff,
  Radio,
  MonitorOff,
  Monitor,
  Square,
} from "lucide-react";
import type { WatchPartyRoom } from "@/lib/api";
import { resolveImage } from "@/lib/utils";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
const WS_URL = API_URL.replace(/^http/, "ws");

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

const SOURCE_META: Record<
  string,
  { label: string; color: string; bg: string; url: string }
> = {
  netflix: {
    label: "Netflix",
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
    url: "https://netflix.com",
  },
  disney: {
    label: "Disney+",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    url: "https://disneyplus.com",
  },
  max: {
    label: "Max",
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/20",
    url: "https://max.com",
  },
  prime: {
    label: "Prime Video",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10 border-cyan-500/20",
    url: "https://primevideo.com",
  },
};

interface Member {
  userId: string;
  username: string;
  avatarUrl: string | null;
  ready: boolean;
  isHost: boolean;
}

interface ChatMsg {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  content: string;
  createdAt: string;
}

// WS message shape — the server is the source of truth for fields
interface WsMsg {
  type: string;
  room?: { status?: string; hostUserId?: string; streamActive?: boolean };
  members?: Member[];
  recentMessages?: ChatMsg[];
  isHost?: boolean;
  userId?: string;
  username?: string;
  avatarUrl?: string | null;
  ready?: boolean;
  newHostUserId?: string;
  id?: string;
  content?: string;
  createdAt?: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  fromUserId?: string;
  viewerId?: string;
}

async function apiFetch<T>(
  endpoint: string,
  init?: RequestInit,
): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export function RoomClient({ room: initialRoom }: { room: WatchPartyRoom }) {
  const router = useRouter();
  const [room, setRoom] = useState(initialRoom);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [wsStatus, setWsStatus] = useState<
    "connecting" | "connected" | "disconnected" | "no-auth"
  >("connecting");
  const [streamActive, setStreamActive] = useState(false);
  const [isHostUser, setIsHostUser] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [ending, setEnding] = useState(false);

  // Stable refs
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);
  const activeRef = useRef(true);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const hostIdRef = useRef<string>(initialRoom.hostUserId);
  const isHostRef = useRef(false);

  // WebRTC — viewer side
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // WebRTC — host side
  const localStreamRef = useRef<MediaStream | null>(null);
  const hostPeersRef = useRef(new Map<string, RTCPeerConnection>());

  // Scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── WebRTC viewer helpers ──────────────────────────────────────────────────

  function closePeer() {
    peerRef.current?.close();
    peerRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  function initPeer(ws: WebSocket) {
    closePeer();
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerRef.current = pc;

    pc.ontrack = (event) => {
      if (videoRef.current && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "webrtc_ice",
            targetUserId: hostIdRef.current,
            candidate: candidate.toJSON(),
          }),
        );
      }
    };

    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === "failed" ||
        pc.connectionState === "disconnected"
      ) {
        closePeer();
        setStreamActive(false);
      }
    };

    ws.send(JSON.stringify({ type: "webrtc_viewer_ready" }));
  }

  // ── WebRTC host helpers ────────────────────────────────────────────────────

  function createHostPeer(ws: WebSocket, viewerId: string) {
    hostPeersRef.current.get(viewerId)?.close();
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    hostPeersRef.current.set(viewerId, pc);

    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    }

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "webrtc_ice",
            targetUserId: viewerId,
            candidate: candidate.toJSON(),
          }),
        );
      }
    };

    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === "failed" ||
        pc.connectionState === "closed"
      ) {
        hostPeersRef.current.delete(viewerId);
      }
    };

    pc.createOffer()
      .then((offer) => {
        pc.setLocalDescription(offer);
        ws.send(
          JSON.stringify({
            type: "webrtc_offer",
            targetUserId: viewerId,
            offer: { type: offer.type, sdp: offer.sdp },
          }),
        );
      })
      .catch(() => {});
  }

  async function startStreaming() {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      toast.error("Não conectado à sala.");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
    } catch {
      toast.error("Permissão de captura de tela negada ou cancelada.");
      return;
    }

    localStreamRef.current = stream;
    setBroadcasting(true);
    setStreamActive(true);
    ws.send(JSON.stringify({ type: "webrtc_stream_start" }));

    // When the user manually stops sharing via the browser
    stream.getVideoTracks()[0]?.addEventListener("ended", stopStreaming);
  }

  function stopStreaming() {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    for (const [, pc] of hostPeersRef.current) pc.close();
    hostPeersRef.current.clear();

    setBroadcasting(false);
    setStreamActive(false);

    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "webrtc_stream_end" }));
    }
  }

  // ── WebSocket connection ───────────────────────────────────────────────────

  useEffect(() => {
    if (initialRoom.status === "ended") {
      setWsStatus("disconnected");
      return;
    }

    activeRef.current = true;

    async function connect() {
      if (!activeRef.current) return;

      const tokenData = await apiFetch<{ token: string }>(
        "/watch-party/ws-token",
      );
      if (!tokenData?.token) {
        setWsStatus("no-auth");
        return;
      }
      if (!activeRef.current) return;

      const url = `${WS_URL}/watch-party/ws?token=${encodeURIComponent(tokenData.token)}&room=${encodeURIComponent(initialRoom.code)}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;
      setWsStatus("connecting");

      ws.onopen = () => {
        attemptsRef.current = 0;
        setWsStatus("connected");
      };

      ws.onmessage = async (event) => {
        let msg: WsMsg;
        try {
          msg = JSON.parse(event.data as string) as WsMsg;
        } catch {
          return;
        }

        switch (msg.type) {
          case "room_state": {
            const host = msg.isHost ?? false;
            isHostRef.current = host;
            setIsHostUser(host);
            setRoom((r) => ({
              ...r,
              status: (msg.room?.status ?? r.status) as typeof r.status,
            }));
            setMembers(msg.members ?? []);
            hostIdRef.current =
              msg.room?.hostUserId ?? initialRoom.hostUserId;
            if (msg.recentMessages?.length)
              setMessages(msg.recentMessages);
            // Late joiner: stream already active
            if (msg.room?.streamActive) {
              setStreamActive(true);
              if (!host) initPeer(ws); // viewers init peer; host just updates UI
            }
            break;
          }

          case "member_joined":
            setMembers((prev) => {
              const rest = prev.filter((m) => m.userId !== msg.userId);
              return [
                ...rest,
                {
                  userId: msg.userId ?? "",
                  username: msg.username ?? "",
                  avatarUrl: msg.avatarUrl ?? null,
                  ready: false,
                  isHost: false,
                },
              ];
            });
            break;

          case "member_left":
            setMembers((prev) =>
              prev.filter((m) => m.userId !== msg.userId),
            );
            break;

          case "member_ready":
            setMembers((prev) =>
              prev.map((m) =>
                m.userId === msg.userId
                  ? { ...m, ready: msg.ready ?? false }
                  : m,
              ),
            );
            break;

          case "host_changed":
            hostIdRef.current = msg.newHostUserId ?? hostIdRef.current;
            setMembers((prev) =>
              prev.map((m) => ({
                ...m,
                isHost: m.userId === msg.newHostUserId,
              })),
            );
            break;

          case "chat_message":
            setMessages((prev) => [
              ...prev.slice(-49),
              {
                id: msg.id ?? "",
                userId: msg.userId ?? "",
                username: msg.username ?? "",
                avatarUrl: msg.avatarUrl ?? null,
                content: msg.content ?? "",
                createdAt: msg.createdAt ?? new Date().toISOString(),
              },
            ]);
            break;

          // ── WebRTC ───────────────────────────────────────────────────────

          case "webrtc_stream_started":
            // Viewers init peer; host already set streamActive via startStreaming()
            if (!isHostRef.current) {
              setStreamActive(true);
              initPeer(ws);
            }
            break;

          case "webrtc_stream_ended":
            if (!isHostRef.current) {
              setStreamActive(false);
              closePeer();
            }
            break;

          case "webrtc_viewer_ready":
            // Host receives: a viewer is ready for the stream
            if (isHostRef.current && msg.viewerId) {
              createHostPeer(ws, msg.viewerId);
            }
            break;

          case "webrtc_offer": {
            // Viewer receives offer from host
            if (isHostRef.current) break;
            const pc = peerRef.current;
            if (!pc || !msg.offer) break;
            await pc.setRemoteDescription(
              new RTCSessionDescription(msg.offer),
            );
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws.send(
              JSON.stringify({
                type: "webrtc_answer",
                answer: { type: answer.type, sdp: answer.sdp },
              }),
            );
            break;
          }

          case "webrtc_answer":
            // Host receives answer from a viewer
            if (isHostRef.current && msg.answer && msg.fromUserId) {
              const pc = hostPeersRef.current.get(msg.fromUserId);
              pc
                ?.setRemoteDescription(new RTCSessionDescription(msg.answer))
                .catch(() => {});
            }
            break;

          case "webrtc_ice":
            if (isHostRef.current) {
              // ICE from a viewer → apply to the viewer's peer
              const pc = hostPeersRef.current.get(msg.fromUserId ?? "");
              if (pc && msg.candidate) {
                pc.addIceCandidate(
                  new RTCIceCandidate(msg.candidate),
                ).catch(() => {});
              }
            } else {
              // ICE from the host → apply to our viewer peer
              if (peerRef.current && msg.candidate) {
                peerRef.current
                  .addIceCandidate(new RTCIceCandidate(msg.candidate))
                  .catch(() => {});
              }
            }
            break;

          case "room_ended":
            setRoom((r) => ({ ...r, status: "ended" }));
            closePeer();
            ws.close();
            break;
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (!activeRef.current) return;
        setWsStatus("disconnected");
        attemptsRef.current++;
        if (attemptsRef.current > 10) return;
        const delay = Math.min(
          1000 * Math.pow(2, attemptsRef.current - 1),
          30_000,
        );
        reconnectRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      activeRef.current = false;
      closePeer();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      for (const [, pc] of hostPeersRef.current) pc.close();
      hostPeersRef.current.clear();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRoom.code, initialRoom.status]);

  function sendChat() {
    const content = chatInput.trim();
    if (!content || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "chat", content }));
    setChatInput("");
  }

  function copyCode() {
    navigator.clipboard.writeText(room.code);
    toast.success("Código copiado!");
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copiado!");
  }

  async function handleEndRoom() {
    if (!confirm("Encerrar a sala? Todos serão desconectados.")) return;
    setEnding(true);
    const res = await apiFetch<{ ok: boolean }>(
      `/watch-party/rooms/${room.code}/end`,
      { method: "POST" },
    );
    if (res?.ok) {
      toast.success("Sala encerrada.");
      router.push("/watch-party");
    } else {
      toast.error("Erro ao encerrar a sala.");
      setEnding(false);
    }
  }

  const sourceMeta = room.mediaSource
    ? (SOURCE_META[room.mediaSource] ?? null)
    : null;
  const isEnded = room.status === "ended";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-black via-purple-900/10 to-black -z-10" />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="relative border-b border-white/5 bg-zinc-900/20 backdrop-blur-md">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <Link
                href="/watch-party"
                className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                Watch Party
              </Link>
              <span className="text-zinc-700">/</span>
              <div className="flex items-center gap-3 min-w-0">
                {room.status === "active" ? (
                  <span className="flex items-center gap-1.5 shrink-0">
                    <CircleDot className="w-3.5 h-3.5 text-green-400 animate-pulse" />
                    <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">
                      Ao vivo
                    </span>
                  </span>
                ) : room.status === "waiting" ? (
                  <span className="flex items-center gap-1.5 shrink-0">
                    <Clock className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">
                      Aguardando
                    </span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 shrink-0">
                    <XCircle className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      Encerrada
                    </span>
                  </span>
                )}
                <h1 className="font-bold text-white text-base truncate">
                  {room.title}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span
                title={wsStatus === "connected" ? "Conectado" : "Reconectando…"}
              >
                {wsStatus === "connected" ? (
                  <Wifi className="w-4 h-4 text-green-400" />
                ) : (
                  <WifiOff className="w-4 h-4 text-zinc-500 animate-pulse" />
                )}
              </span>

              <button
                onClick={copyCode}
                className="group flex items-center gap-2 px-3 py-2 rounded-xl border border-white/5 bg-zinc-900/60 hover:border-purple-500/30 hover:bg-zinc-900/80 transition-all"
                title="Copiar código"
              >
                <span className="font-mono text-sm font-bold text-white tracking-widest">
                  {room.code}
                </span>
                <Copy className="w-3.5 h-3.5 text-zinc-500 group-hover:text-purple-400 transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="container mx-auto px-6 py-8">
        {isEnded ? (
          <div className="rounded-2xl border border-white/5 bg-zinc-900/20 p-10 text-center max-w-md mx-auto">
            <XCircle className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400 font-medium">
              Esta sala foi encerrada.
            </p>
            <Link
              href="/watch-party"
              className="mt-4 inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para Watch Party
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6 max-w-6xl">
            {/* ── Left: video + chat ─────────────────────────────────────── */}
            <div className="flex flex-col gap-4 min-w-0">
              {/* Video player */}
              <div className="rounded-2xl border border-white/5 bg-zinc-900/40 overflow-hidden">
                <div
                  className="relative w-full"
                  style={{ aspectRatio: "16/9" }}
                >
                  {/* Host: broadcasting overlay */}
                  {isHostUser && broadcasting && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-zinc-900/90">
                      <Radio className="w-10 h-10 text-red-400 animate-pulse" />
                      <div className="text-center">
                        <p className="text-white font-semibold text-sm">
                          Você está transmitindo
                        </p>
                        <p className="text-zinc-500 text-xs mt-1">
                          Viewers estão assistindo em tempo real
                        </p>
                      </div>
                      <button
                        onClick={stopStreaming}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 transition-all text-sm font-semibold text-red-400"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                        Parar transmissão
                      </button>
                    </div>
                  )}

                  {/* Host: start streaming button */}
                  {isHostUser && !broadcasting && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-zinc-900/80">
                      <Monitor className="w-10 h-10 text-zinc-500" />
                      <div className="text-center">
                        <p className="text-white font-semibold text-sm">
                          Pronto para transmitir
                        </p>
                        <p className="text-zinc-500 text-xs mt-1">
                          Compartilhe sua tela para que os viewers possam assistir
                        </p>
                      </div>
                      <button
                        onClick={startStreaming}
                        disabled={wsStatus !== "connected"}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:pointer-events-none transition-all text-sm font-semibold text-white shadow-lg shadow-purple-900/30"
                      >
                        <Radio className="w-4 h-4" />
                        Iniciar transmissão
                      </button>
                    </div>
                  )}

                  {/* Viewer: waiting placeholder */}
                  {!isHostUser && !streamActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900/60">
                      <MonitorOff className="w-10 h-10 text-zinc-600" />
                      <p className="text-sm text-zinc-500">
                        Aguardando o host iniciar a transmissão…
                      </p>
                    </div>
                  )}

                  {/* Live indicator for viewers */}
                  {!isHostUser && streamActive && (
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/90 backdrop-blur-sm">
                      <Radio className="w-3 h-3 text-white animate-pulse" />
                      <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                        Ao vivo
                      </span>
                    </div>
                  )}

                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className={`w-full h-full object-contain bg-black transition-opacity ${!isHostUser && streamActive ? "opacity-100" : "opacity-0"}`}
                  />
                </div>
              </div>

              {/* Chat */}
              <div
                className="rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-sm flex flex-col"
                style={{ height: "320px" }}
              >
                <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2 shrink-0">
                  <Send className="w-4 h-4 text-purple-400" />
                  <span className="font-bold text-white text-sm">Chat</span>
                  <span className="text-xs text-zinc-600 ml-auto">
                    Mensagens não são salvas
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
                  {wsStatus === "no-auth" ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                      <p className="text-sm text-zinc-400">
                        Faça login para participar do chat.
                      </p>
                      <a
                        href="/login"
                        className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        Entrar na conta →
                      </a>
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="text-xs text-zinc-600 text-center pt-8">
                      Nenhuma mensagem ainda. Diga oi! 👋
                    </p>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id} className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center shrink-0 overflow-hidden mt-0.5">
                          {msg.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={msg.avatarUrl}
                              alt={msg.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[10px] font-bold text-zinc-400">
                              {msg.username.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-purple-400 mr-2">
                            {msg.username}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {new Date(msg.createdAt).toLocaleTimeString(
                              "pt-BR",
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </span>
                          <p className="text-sm text-zinc-200 mt-0.5 leading-relaxed">
                            {msg.content}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="px-4 py-3 border-t border-white/5 shrink-0">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendChat();
                        }
                      }}
                      placeholder={
                        wsStatus === "connected"
                          ? "Digite uma mensagem…"
                          : wsStatus === "no-auth"
                            ? "Faça login para chatear"
                            : "Conectando…"
                      }
                      disabled={wsStatus !== "connected"}
                      maxLength={500}
                      className="flex-1 bg-zinc-800/60 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500/50 transition-colors disabled:opacity-40"
                    />
                    <button
                      onClick={sendChat}
                      disabled={wsStatus !== "connected" || !chatInput.trim()}
                      className="w-10 h-10 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center transition-colors shrink-0"
                    >
                      <Send className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right: room info + members + actions ───────────────────── */}
            <div className="space-y-4">
              {/* Room info */}
              <div className="rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-sm p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
                    <Tv2 className="w-5 h-5 text-zinc-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm leading-tight truncate">
                      {room.title}
                    </p>
                    {room.mediaTitle && (
                      <p className="text-xs text-zinc-500 mt-0.5 truncate">
                        {room.mediaTitle}
                      </p>
                    )}
                    {sourceMeta && (
                      <span
                        className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${sourceMeta.bg} ${sourceMeta.color}`}
                      >
                        {sourceMeta.label}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={copyCode}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-800/60 border border-white/5 hover:border-purple-500/20 transition-colors group text-left"
                >
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                      Código
                    </p>
                    <p className="font-mono font-bold text-white tracking-widest">
                      {room.code}
                    </p>
                  </div>
                  <Copy className="w-3.5 h-3.5 text-zinc-500 group-hover:text-purple-400 transition-colors" />
                </button>

                <button
                  onClick={copyLink}
                  className="w-full mt-2 flex items-center gap-2 px-3 py-2 rounded-xl border border-white/5 bg-zinc-800/40 hover:border-purple-500/20 transition-all text-xs text-zinc-400 hover:text-zinc-300"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copiar link da sala
                </button>
              </div>

              {/* Members */}
              <div className="rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-purple-400" />
                    Membros
                  </h3>
                  <span className="text-xs text-zinc-500">
                    {members.length}/{room.maxMembers ?? 8}
                  </span>
                </div>

                {members.length > 0 ? (
                  <ul className="space-y-2">
                    {members.map((m) => (
                      <li key={m.userId} className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center shrink-0 overflow-hidden">
                          {m.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={resolveImage(m.avatarUrl)!}
                              alt={m.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[10px] font-bold text-zinc-400">
                              {m.username.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white font-medium truncate">
                            {m.username}
                          </p>
                          {m.isHost && (
                            <p className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider">
                              Host
                            </p>
                          )}
                        </div>
                        {m.ready && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-zinc-600 text-center py-3">
                    Aguardando membros…
                  </p>
                )}
              </div>

              {/* End room */}
              <button
                onClick={handleEndRoom}
                disabled={ending}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/30 transition-all text-sm font-semibold text-red-400 disabled:opacity-50 disabled:pointer-events-none"
              >
                {ending ? (
                  <span className="w-4 h-4 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                {ending ? "Encerrando…" : "Encerrar sala"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
