"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  CheckCircle2,
  Video,
  ExternalLink,
  Plus,
  Trash2,
  Loader2,
  X,
  Pencil,
  Check,
  Star,
} from "lucide-react";
import type { ClubEvent as BaseClubEvent } from "@/lib/queries/clubs";
import type { SearchResult } from "@/types";

type ClubEvent = BaseClubEvent & {
  eventType?: "watch" | "discussion";
  myRsvp?: "going" | "interested" | "not_going" | null;
};
import { MediaSearchInput } from "@/components/media/media-search-input";
import {
  apiFetch,
  inputCls,
  btnPrimaryCls,
  btnGhostCls,
  EmptyState,
  formatDateTime,
} from "../shared/club-ui";

interface SessionsTabProps {
  clubId: string;
  isMember: boolean;
  isAdmin: boolean;
  initialEvents: ClubEvent[];
}

type EventForm = {
  title: string;
  description: string;
  eventType: "watch" | "discussion";
  media: Pick<
    SearchResult,
    "id" | "title" | "posterPath" | "mediaType" | "localId"
  > | null;
  scheduledAt: string;
  meetLink: string;
};

const emptyForm = (): EventForm => ({
  title: "",
  description: "",
  eventType: "watch",
  media: null,
  scheduledAt: "",
  meetLink: "",
});

export function SessionsTab({
  clubId,
  isMember,
  isAdmin,
  initialEvents,
}: SessionsTabProps) {
  const [events, setEvents] = useState<ClubEvent[]>(initialEvents);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<EventForm>(emptyForm());
  const [loading, setLoading] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EventForm>(emptyForm());
  const [editLoading, setEditLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.scheduledAt) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/clubs/${clubId}/events`, {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          description: form.description || undefined,
          eventType: form.eventType,
          scheduledAt: form.scheduledAt,
          meetLink: form.meetLink || undefined,
          mediaId: form.media?.localId || undefined,
          mediaTitle: form.media?.title,
          mediaPosterPath: form.media?.posterPath,
        }),
      });
      setEvents((prev) => [
        ...prev,
        { ...data.data, goingCount: 0, interestedCount: 0, myRsvp: null },
      ]);
      setForm(emptyForm());
      setShowForm(false);
      toast.success("Sessão criada!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar sessão");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(event: ClubEvent) {
    setEditingId(event.id);
    setEditForm({
      title: event.title,
      description: event.description ?? "",
      eventType: (event.eventType as "watch" | "discussion") ?? "watch",
      media: null,
      scheduledAt: event.scheduledAt
        ? new Date(event.scheduledAt).toISOString().slice(0, 16)
        : "",
      meetLink: event.meetLink ?? "",
    });
  }

  async function handleSaveEdit(eventId: string) {
    if (!editForm.title.trim() || !editForm.scheduledAt) return;
    setEditLoading(true);
    try {
      const data = await apiFetch(`/clubs/${clubId}/events/${eventId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description || undefined,
          scheduledAt: editForm.scheduledAt,
          meetLink: editForm.meetLink || undefined,
        }),
      });
      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, ...data.data } : e)),
      );
      setEditingId(null);
      toast.success("Sessão atualizada!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao editar sessão");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete(eventId: string) {
    if (!confirm("Excluir esta sessão?")) return;
    try {
      await apiFetch(`/clubs/${clubId}/events/${eventId}`, {
        method: "DELETE",
      });
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      toast.success("Sessão excluída.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir");
    }
  }

  async function handleRsvp(
    eventId: string,
    status: "going" | "interested" | "not_going",
  ) {
    try {
      await apiFetch(`/clubs/${clubId}/events/${eventId}/rsvp`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      setEvents((prev) =>
        prev.map((e) => {
          if (e.id !== eventId) return e;
          const old = e.myRsvp;
          return {
            ...e,
            myRsvp: status,
            goingCount:
              e.goingCount +
              (status === "going" ? 1 : 0) -
              (old === "going" ? 1 : 0),
            interestedCount:
              e.interestedCount +
              (status === "interested" ? 1 : 0) -
              (old === "interested" ? 1 : 0),
          };
        }),
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  }

  const upcoming = events.filter((e) => new Date(e.scheduledAt) >= new Date());
  const past = events.filter((e) => new Date(e.scheduledAt) < new Date());

  return (
    <div className="max-w-2xl space-y-4">
      {/* Create form */}
      {isAdmin && (
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
                Agendar uma sessão...
              </span>
            </button>
          ) : (
            <div
              className="rounded-xl border border-white/8 overflow-hidden"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
                <span className="text-sm font-semibold text-zinc-400">
                  Nova Sessão
                </span>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-zinc-600 hover:text-zinc-400 transition-colors p-0.5 rounded-md hover:bg-white/5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-5 space-y-3">
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  placeholder="Título (ex: Vamos assistir Inception!)"
                  className={inputCls}
                />
                <div className="flex gap-3 mt-2 mb-2">
                  <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                    <input
                      type="radio"
                      checked={form.eventType === "watch"}
                      onChange={() => setForm({ ...form, eventType: "watch" })}
                      className="accent-purple-500"
                    />
                    Sessão de Cinema
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                    <input
                      type="radio"
                      checked={form.eventType === "discussion"}
                      onChange={() =>
                        setForm({ ...form, eventType: "discussion", media: null })
                      }
                      className="accent-purple-500"
                    />
                    Discussão
                  </label>
                </div>

                {form.eventType === "watch" && (
                  <div className="mb-2">
                    <MediaSearchInput
                      value={form.media}
                      onChange={(media) => setForm({ ...form, media })}
                      placeholder="Buscar filme ou série..."
                    />
                  </div>
                )}

                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={2}
                  placeholder="Descrição (opcional)"
                  className={`${inputCls} resize-none max-h-[100px]`}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1.5">
                      Data e horário
                    </label>
                    <input
                      type="datetime-local"
                      value={form.scheduledAt}
                      onChange={(e) =>
                        setForm({ ...form, scheduledAt: e.target.value })
                      }
                      required
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1.5">
                      Link
                    </label>
                    <input
                      value={form.meetLink}
                      onChange={(e) =>
                        setForm({ ...form, meetLink: e.target.value })
                      }
                      placeholder="https://..."
                      className={inputCls}
                    />
                  </div>
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
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    Criar Sessão
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

      {events.length === 0 ? (
        <EmptyState icon={Calendar} text="Nenhuma sessão agendada ainda." />
      ) : (
        <>
          {upcoming.length > 0 && (
            <EventGroup
              label="Próximas Sessões"
              events={[...upcoming].sort(
                (a, b) =>
                  new Date(a.scheduledAt).getTime() -
                  new Date(b.scheduledAt).getTime(),
              )}
              isAdmin={isAdmin}
              isMember={isMember}
              isPast={false}
              editingId={editingId}
              editForm={editForm}
              editLoading={editLoading}
              onStartEdit={startEdit}
              onCancelEdit={() => setEditingId(null)}
              onSaveEdit={handleSaveEdit}
              onEditFormChange={setEditForm}
              onDelete={handleDelete}
              onRsvp={handleRsvp}
            />
          )}
          {past.length > 0 && (
            <EventGroup
              label="Sessões Passadas"
              events={[...past].sort(
                (a, b) =>
                  new Date(b.scheduledAt).getTime() -
                  new Date(a.scheduledAt).getTime(),
              )}
              isAdmin={isAdmin}
              isMember={isMember}
              isPast={true}
              editingId={editingId}
              editForm={editForm}
              editLoading={editLoading}
              onStartEdit={startEdit}
              onCancelEdit={() => setEditingId(null)}
              onSaveEdit={handleSaveEdit}
              onEditFormChange={setEditForm}
              onDelete={handleDelete}
              onRsvp={handleRsvp}
            />
          )}
        </>
      )}
    </div>
  );
}

function EventGroup({
  label,
  events,
  isAdmin,
  isMember,
  isPast,
  editingId,
  editForm,
  editLoading,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditFormChange,
  onDelete,
  onRsvp,
}: {
  label: string;
  events: ClubEvent[];
  isAdmin: boolean;
  isMember: boolean;
  isPast: boolean;
  editingId: string | null;
  editForm: EventForm;
  editLoading: boolean;
  onStartEdit: (e: ClubEvent) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string) => void;
  onEditFormChange: (f: EventForm) => void;
  onDelete: (id: string) => void;
  onRsvp: (id: string, s: "going" | "interested" | "not_going") => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
          {label}
        </span>
        <div className="flex-1 h-px bg-zinc-800/80" />
      </div>
      {events.map((event) => {
        const isEditing = editingId === event.id;
        const d = new Date(event.scheduledAt);
        return (
          <div
            key={event.id}
            className="rounded-xl border overflow-hidden transition-all duration-200"
            style={{
              borderColor: isPast
                ? "rgba(255,255,255,0.04)"
                : "rgba(255,255,255,0.07)",
              background: isPast
                ? "rgba(255,255,255,0.01)"
                : "rgba(255,255,255,0.02)",
              opacity: isPast ? 0.55 : 1,
            }}
          >
            {isEditing ? (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-zinc-400">
                    Editar Sessão
                  </span>
                  <button
                    onClick={onCancelEdit}
                    className="text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <input
                  value={editForm.title}
                  onChange={(e) =>
                    onEditFormChange({ ...editForm, title: e.target.value })
                  }
                  className={inputCls}
                  placeholder="Título"
                />
                <textarea
                  value={editForm.description}
                  onChange={(e) =>
                    onEditFormChange({
                      ...editForm,
                      description: e.target.value,
                    })
                  }
                  rows={2}
                  placeholder="Descrição (opcional)"
                  className={`${inputCls} resize-none max-h-[100px]`}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1.5">
                      Data e horário
                    </label>
                    <input
                      type="datetime-local"
                      value={editForm.scheduledAt}
                      onChange={(e) =>
                        onEditFormChange({
                          ...editForm,
                          scheduledAt: e.target.value,
                        })
                      }
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1.5">
                      Link
                    </label>
                    <input
                      value={editForm.meetLink}
                      onChange={(e) =>
                        onEditFormChange({
                          ...editForm,
                          meetLink: e.target.value,
                        })
                      }
                      placeholder="https://..."
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onSaveEdit(event.id)}
                    disabled={editLoading}
                    className={btnPrimaryCls}
                    style={{
                      background:
                        "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                    }}
                  >
                    {editLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={onCancelEdit}
                    className={btnGhostCls}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-stretch">
                {/* Date block */}
                <div
                  className="shrink-0 flex flex-col items-center justify-center px-5 py-4 min-w-[64px] border-r"
                  style={{
                    borderColor: isPast
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(168,85,247,0.2)",
                    background: isPast
                      ? "rgba(255,255,255,0.02)"
                      : "rgba(168,85,247,0.08)",
                  }}
                >
                  <div
                    className="text-2xl font-bold leading-none"
                    style={{ color: isPast ? "#52525b" : "#fff" }}
                  >
                    {d.getDate()}
                  </div>
                  <div
                    className="text-[10px] font-medium uppercase mt-1"
                    style={{ color: isPast ? "#3f3f46" : "#a855f7" }}
                  >
                    {d.toLocaleDateString("pt-BR", { month: "short" })}
                  </div>
                </div>
                {/* Content */}
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-base text-white leading-snug">
                      {event.title}
                    </h4>
                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => onStartEdit(event)}
                          className="p-1.5 rounded-lg text-zinc-700 hover:text-purple-400 hover:bg-purple-950/20 transition-all"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(event.id)}
                          className="p-1.5 rounded-lg text-zinc-700 hover:text-red-400 hover:bg-red-950/20 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  {event.description && (
                    <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDateTime(event.scheduledAt)}
                    </span>
                    <span className="flex items-center gap-1 text-indigo-400/80">
                      <CheckCircle2 className="h-3 w-3" />
                      {event.goingCount} confirmados
                    </span>
                    <span className="flex items-center gap-1 text-purple-400/80">
                      <Star className="h-3 w-3" />
                      {event.interestedCount} interessados
                    </span>
                  </div>
                  {event.meetLink && !isPast && (
                    <a
                      href={event.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2.5 text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      <Video className="h-3.5 w-3.5" /> Entrar na Sessão{" "}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {isMember && !isPast && (
                    <div className="flex items-center gap-1.5 mt-3">
                      {(
                        ["going", "interested", "not_going"] as const
                      ).map((s) => {
                        const labels = {
                          going: "Vou",
                          interested: "Talvez",
                          not_going: "Não vou",
                        };
                        const activeStyle = {
                          going: {
                            color: "#34d399",
                            bg: "rgba(52,211,153,0.1)",
                            border: "rgba(52,211,153,0.3)",
                          },
                          interested: {
                            color: "#fbbf24",
                            bg: "rgba(251,191,36,0.1)",
                            border: "rgba(251,191,36,0.3)",
                          },
                          not_going: {
                            color: "#f87171",
                            bg: "rgba(248,113,113,0.1)",
                            border: "rgba(248,113,113,0.3)",
                          },
                        }[s];
                        const isActive = event.myRsvp === s;
                        return (
                          <button
                            key={s}
                            onClick={() => onRsvp(event.id, s)}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-all"
                            style={
                              isActive
                                ? {
                                    color: activeStyle.color,
                                    background: activeStyle.bg,
                                    borderColor: activeStyle.border,
                                  }
                                : {
                                    color: "#71717a",
                                    background: "transparent",
                                    borderColor: "rgba(255,255,255,0.08)",
                                  }
                            }
                          >
                            {labels[s]}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
