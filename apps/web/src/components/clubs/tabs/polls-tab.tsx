"use client";

import { useState } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { BarChart2, Plus, Trash2, Loader2, X } from "lucide-react";
import type { ClubPoll } from "@/lib/queries/clubs";
import {
  apiFetch,
  inputCls,
  btnPrimaryCls,
  btnGhostCls,
  EmptyState,
  formatDate,
} from "../shared/club-ui";

interface PollsTabProps {
  clubId: string;
  isMember: boolean;
  isAdmin: boolean;
  sessionUserId?: string | null;
  initialPolls: ClubPoll[];
}

export function PollsTab({
  clubId,
  isMember,
  isAdmin,
  sessionUserId,
  initialPolls,
}: PollsTabProps) {
  const [polls, setPolls] = useState<ClubPoll[]>(initialPolls);
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [expiry, setExpiry] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const opts = options.filter((o) => o.trim());
    if (!question.trim() || opts.length < 2) {
      toast.error("Pergunta e mínimo 2 opções são obrigatórias.");
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch(`/clubs/${clubId}/polls`, {
        method: "POST",
        body: JSON.stringify({
          question,
          expiresAt: expiry || undefined,
          options: opts.map((text) => ({ text })),
        }),
      });
      setPolls((prev) => [
        {
          ...data.data,
          myVote: null,
          totalVotes: 0,
          options: (data.data.options ?? []).map((o: { id: string; text: string; mediaId: string | null; mediaPosterPath: string | null }) => ({
            ...o,
            votesCount: 0,
          })),
        },
        ...prev,
      ]);
      setQuestion("");
      setOptions(["", ""]);
      setExpiry("");
      setShowForm(false);
      toast.success("Enquete criada!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar enquete");
    } finally {
      setLoading(false);
    }
  }

  async function handleVote(pollId: string, optionId: string) {
    if (!sessionUserId) {
      toast.error("Faça login para votar");
      return;
    }
    try {
      await apiFetch(`/clubs/${clubId}/polls/${pollId}/vote`, {
        method: "POST",
        body: JSON.stringify({ optionId }),
      });
      setPolls((prev) =>
        prev.map((p) =>
          p.id === pollId
            ? {
                ...p,
                myVote: optionId,
                totalVotes: p.myVote ? p.totalVotes : p.totalVotes + 1,
                options: p.options.map((o) =>
                  o.id === optionId
                    ? { ...o, votesCount: o.votesCount + 1 }
                    : o,
                ),
              }
            : p,
        ),
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  }

  async function handleDelete(pollId: string) {
    if (!confirm("Excluir esta enquete?")) return;
    try {
      await apiFetch(`/clubs/${clubId}/polls/${pollId}`, { method: "DELETE" });
      setPolls((prev) => prev.filter((p) => p.id !== pollId));
      toast.success("Enquete excluída.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir");
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      {isMember && (
        <div className="mb-6">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="group relative flex items-center gap-4 w-full text-left px-6 py-5 rounded-2xl border border-white/5 bg-zinc-900/40 hover:bg-zinc-800/60 transition-all text-sm font-medium overflow-hidden backdrop-blur-md"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 border border-purple-500/20 transition-all">
                <Plus className="h-5 w-5 text-purple-400" />
              </div>
              <span className="relative z-10 text-zinc-400 group-hover:text-zinc-200 transition-colors">
                Criar uma enquete...
              </span>
            </button>
          ) : (
            <div
              className="rounded-xl border border-white/8 overflow-hidden"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
                <span className="text-sm font-semibold text-zinc-400">
                  Nova Enquete
                </span>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-zinc-600 hover:text-zinc-400 p-0.5 rounded-md hover:bg-white/5 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-5 space-y-4">
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  required
                  minLength={5}
                  maxLength={300}
                  placeholder="Qual é a sua pergunta?"
                  className={inputCls}
                />
                <div className="space-y-2">
                  <label className="text-xs text-zinc-500">
                    Opções (mín. 2, máx. 10)
                  </label>
                  {options.map((opt, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={opt}
                        onChange={(e) =>
                          setOptions((prev) =>
                            prev.map((o, j) => (j === i ? e.target.value : o)),
                          )
                        }
                        placeholder={`Opção ${i + 1}`}
                        className={`${inputCls} flex-1`}
                      />
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() =>
                            setOptions((prev) => prev.filter((_, j) => j !== i))
                          }
                          className="p-2 rounded-lg text-zinc-700 hover:text-red-400 hover:bg-red-950/20 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {options.length < 10 && (
                    <button
                      type="button"
                      onClick={() => setOptions((prev) => [...prev, ""])}
                      className="text-xs font-medium text-zinc-600 hover:text-zinc-300 transition-colors flex items-center gap-1.5 mt-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> Adicionar opção
                    </button>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">
                    Expiração (opcional)
                  </label>
                  <input
                    type="datetime-local"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    className="bg-zinc-900 border border-white/8 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-purple-500/50 transition-all"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className={btnPrimaryCls}
                    style={{
                      background:
                        "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                    }}
                  >
                    {loading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <BarChart2 className="h-3.5 w-3.5" />
                    )}
                    Criar Enquete
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className={btnGhostCls}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {polls.length === 0 ? (
        <EmptyState icon={BarChart2} text="Nenhuma enquete ainda." />
      ) : (
        polls.map((poll) => {
          const isExpired = poll.expiresAt
            ? new Date(poll.expiresAt) < new Date()
            : false;
          const hasVoted = !!poll.myVote;
          const canDelete =
            isAdmin;
          return (
            <div
              key={poll.id}
              className="relative rounded-2xl border border-white/10 p-6 overflow-hidden transition-all duration-300 hover:border-purple-500/30"
              style={{
                background: "rgba(24,24,27,0.4)",
                backdropFilter: "blur(20px)",
                boxShadow: "0 12px 40px -12px rgba(0,0,0,0.7)",
              }}
            >
              <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,1) 2px, rgba(255,255,255,1) 3px)",
                }}
              />
              <div className="relative z-10 flex items-start justify-between gap-3 mb-6">
                <h4 className="font-bold text-lg text-white leading-snug">
                  {poll.question}
                </h4>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(poll.id)}
                    className="p-1.5 rounded-lg text-zinc-700 hover:text-red-400 hover:bg-red-950/20 transition-all shrink-0 mt-0.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="space-y-2.5">
                {poll.options.map((opt) => {
                  const pct =
                    poll.totalVotes > 0
                      ? Math.round((opt.votesCount / poll.totalVotes) * 100)
                      : 0;
                  const isMyVote = poll.myVote === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={hasVoted || isExpired || !isMember}
                      onClick={() => handleVote(poll.id, opt.id)}
                      className="relative w-full text-left overflow-hidden rounded-xl border transition-all duration-300"
                      style={{
                        borderColor: isMyVote
                          ? "rgba(168,85,247,0.5)"
                          : "rgba(255,255,255,0.08)",
                        background: isMyVote
                          ? "rgba(168,85,247,0.08)"
                          : "rgba(255,255,255,0.04)",
                      }}
                    >
                      {(hasVoted || isExpired) && (
                        <div
                          className="absolute inset-y-0 left-0 transition-all duration-1000 ease-out"
                          style={{
                            width: `${pct}%`,
                            background: isMyVote
                              ? "linear-gradient(90deg, rgba(168,85,247,0.2), rgba(168,85,247,0.1))"
                              : "rgba(255,255,255,0.05)",
                          }}
                        />
                      )}
                      <div className="relative flex items-center gap-3 px-3.5 py-2.5">
                        {opt.mediaPosterPath && (
                          <div className="relative w-5 h-8 shrink-0 rounded overflow-hidden">
                            <Image
                              fill
                              src={opt.mediaPosterPath}
                              alt=""
                              className="object-cover"
                            />
                          </div>
                        )}
                        <span className="text-sm text-zinc-200 flex-1">
                          {opt.text}
                        </span>
                        {(hasVoted || isExpired) && (
                          <span
                            className="text-xs font-bold tabular-nums"
                            style={{ color: isMyVote ? "#a855f7" : "#52525b" }}
                          >
                            {pct}%
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 mt-4 text-xs text-zinc-500">
                <span>{poll.totalVotes} votos</span>
                {poll.expiresAt && (
                  <>
                    <span className="text-zinc-800">·</span>
                    <span style={{ color: isExpired ? "#f87171" : undefined }}>
                      {isExpired
                        ? "Encerrada"
                        : `Até ${formatDate(poll.expiresAt)}`}
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
