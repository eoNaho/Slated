"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Plus, Send, Pencil, Trash2, Loader2, RefreshCw, X, Info, AlertTriangle, CheckCircle2, ImageIcon } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorBanner } from "@/components/ui/error-banner";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: string;
  imageUrl: string | null;
  actionLabel: string | null;
  actionUrl: string | null;
  isActive: boolean;
  dismissible: boolean;
  targetAudience: string;
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
}

interface AnnouncementForm {
  title: string;
  message: string;
  type: string;
  imageUrl: string;
  actionLabel: string;
  actionUrl: string;
  isActive: boolean;
  dismissible: boolean;
  targetAudience: string;
  startAt: string;
  endAt: string;
}

const EMPTY_FORM: AnnouncementForm = {
  title: "",
  message: "",
  type: "info",
  imageUrl: "",
  actionLabel: "",
  actionUrl: "",
  isActive: true,
  dismissible: true,
  targetAudience: "all",
  startAt: "",
  endAt: "",
};

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  info: { label: "Info", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  warning: { label: "Aviso", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  success: { label: "Sucesso", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  promo: { label: "Promo", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
};

const AUDIENCE_LABELS: Record<string, string> = { all: "Todos", premium: "Premium", free: "Gratuitos" };

function PreviewBanner({ form }: { form: AnnouncementForm }) {
  const typeColors: Record<string, string> = {
    info: "bg-blue-500/10 border-blue-500/20 text-blue-200",
    warning: "bg-amber-500/10 border-amber-500/20 text-amber-200",
    success: "bg-emerald-500/10 border-emerald-500/20 text-emerald-200",
    promo: "bg-gradient-to-r from-purple-500/15 to-indigo-500/15 border-purple-500/25 text-purple-200",
  };
  const accentColors: Record<string, string> = {
    info: "bg-blue-500", warning: "bg-amber-500", success: "bg-emerald-500",
    promo: "bg-gradient-to-r from-purple-500 to-indigo-500",
  };
  const TypeIcon = { info: Info, warning: AlertTriangle, success: CheckCircle2, promo: Megaphone }[form.type] ?? Info;
  const cls = typeColors[form.type] ?? typeColors.info;
  const accentCls = accentColors[form.type] ?? accentColors.info;

  if (form.imageUrl) {
    return (
      <div className="w-64 rounded-2xl border border-white/10 bg-zinc-900/95 overflow-hidden shadow-xl">
        <div className="relative w-full h-28 bg-zinc-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
          <div className={`absolute top-0 left-0 right-0 h-1 ${accentCls}`} />
        </div>
        <div className="p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TypeIcon className={`w-3.5 h-3.5 shrink-0 ${cls.split(" ").find(c => c.startsWith("text-"))}`} />
            <span className={`text-xs font-semibold ${cls.split(" ").find(c => c.startsWith("text-"))}`}>
              {form.title || "Título"}
            </span>
            {form.dismissible && <X className="ml-auto w-3 h-3 opacity-40" />}
          </div>
          <p className="text-xs text-zinc-400">{form.message || "Mensagem..."}</p>
          {form.actionLabel && (
            <div className={`mt-2 text-center text-xs font-semibold rounded-lg py-1 border border-current/30 ${cls.split(" ").find(c => c.startsWith("text-"))}`}>
              {form.actionLabel}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full rounded-xl border px-4 py-2.5 flex items-center gap-3 ${cls}`}>
      <TypeIcon className="w-4 h-4 shrink-0" />
      <div className="flex-1 min-w-0 text-sm">
        <span className="font-semibold mr-1.5">{form.title || "Título do anúncio"}</span>
        <span className="opacity-90">{form.message || "Mensagem do anúncio..."}</span>
      </div>
      {form.actionLabel && (
        <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border border-current opacity-80">
          {form.actionLabel}
        </span>
      )}
      {form.dismissible && <X className="w-3.5 h-3.5 shrink-0 opacity-60" />}
    </div>
  );
}

/** Convert a UTC ISO string to "YYYY-MM-DDTHH:mm" in local time for datetime-local inputs. */
function toLocalInput(utcIso: string): string {
  const d = new Date(utcIso);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().substring(0, 16);
}

/** Convert a datetime-local string (local time, no tz) to a full UTC ISO string. */
function localInputToISO(value: string): string {
  return new Date(value).toISOString();
}

export function AnnouncementsManager() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState<AnnouncementForm>(EMPTY_FORM);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: () => apiFetch<{ data: Announcement[]; total: number }>("/admin/announcements"),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) => apiFetch("/admin/announcements", { method: "POST", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      toast.success("Anúncio criado!");
      closeModal();
    },
    onError: () => toast.error("Erro ao criar anúncio"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) =>
      apiFetch(`/admin/announcements/${id}`, { method: "PATCH", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      toast.success("Anúncio atualizado!");
      closeModal();
    },
    onError: () => toast.error("Erro ao atualizar anúncio"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/announcements/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      toast.success("Anúncio removido");
    },
    onError: () => toast.error("Erro ao remover anúncio"),
  });

  const pushMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/announcements/${id}/push`, { method: "POST" }),
    onSuccess: () => toast.success("Anúncio enviado via WebSocket para todos os usuários conectados!"),
    onError: () => toast.error("Erro ao enviar push"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiFetch(`/admin/announcements/${id}`, { method: "PATCH", body: JSON.stringify({ isActive }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-announcements"] }),
    onError: () => toast.error("Erro ao alterar status"),
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(ann: Announcement) {
    setEditing(ann);
    setForm({
      title: ann.title,
      message: ann.message,
      type: ann.type,
      imageUrl: ann.imageUrl ?? "",
      actionLabel: ann.actionLabel ?? "",
      actionUrl: ann.actionUrl ?? "",
      isActive: ann.isActive,
      dismissible: ann.dismissible,
      targetAudience: ann.targetAudience,
      startAt: ann.startAt ? toLocalInput(ann.startAt) : "",
      endAt: ann.endAt ? toLocalInput(ann.endAt) : "",
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      ...form,
      imageUrl: form.imageUrl || null,
      actionLabel: form.actionLabel || null,
      actionUrl: form.actionUrl || null,
      startAt: form.startAt ? localInputToISO(form.startAt) : null,
      endAt: form.endAt ? localInputToISO(form.endAt) : null,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, body });
    } else {
      createMutation.mutate(body);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const announcements = data?.data ?? [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader
        section="Announcements"
        title="Anúncios"
        icon={Megaphone}
        badge={announcements.length}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => refetch()} className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Anúncio
            </button>
          </div>
        }
      />

      {error && <ErrorBanner message="Falha ao carregar anúncios." />}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 text-sm">
          <Megaphone className="w-10 h-10 mb-3 opacity-30" />
          <p>Nenhum anúncio criado ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((ann) => {
            const typeInfo = TYPE_LABELS[ann.type] ?? TYPE_LABELS.info;
            return (
              <div key={ann.id} className="glass-card rounded-2xl p-5 flex items-start gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                    <span className="text-xs text-zinc-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                      {AUDIENCE_LABELS[ann.targetAudience] ?? ann.targetAudience}
                    </span>
                    {!ann.isActive && (
                      <span className="text-xs text-zinc-600 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">
                        Inativo
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-white">{ann.title}</p>
                  <p className="text-xs text-zinc-400 line-clamp-2">{ann.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {ann.imageUrl && (
                      <span className="flex items-center gap-1 text-xs text-zinc-500">
                        <ImageIcon className="w-3 h-3" /> Imagem
                      </span>
                    )}
                    {ann.actionLabel && (
                      <p className="text-xs text-zinc-500">CTA: {ann.actionLabel}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Toggle active */}
                  <button
                    onClick={() => toggleMutation.mutate({ id: ann.id, isActive: !ann.isActive })}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors font-medium ${
                      ann.isActive
                        ? "text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                        : "text-zinc-500 border-zinc-700 hover:bg-zinc-800"
                    }`}
                  >
                    {ann.isActive ? "Ativo" : "Inativo"}
                  </button>

                  {/* Push */}
                  <button
                    onClick={() => pushMutation.mutate(ann.id)}
                    disabled={pushMutation.isPending}
                    title="Enviar via WebSocket agora"
                    className="p-2 rounded-lg text-zinc-500 hover:text-accent hover:bg-accent/10 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => openEdit(ann)}
                    className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => {
                      if (confirm("Remover este anúncio?")) deleteMutation.mutate(ann.id);
                    }}
                    className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
              <h2 className="text-base font-semibold text-white">
                {editing ? "Editar Anúncio" : "Novo Anúncio"}
              </h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Preview */}
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Pré-visualização</p>
                <PreviewBanner form={form} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs text-zinc-400 mb-1.5">Título *</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-accent/40"
                    placeholder="Título do anúncio"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-zinc-400 mb-1.5">Mensagem *</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    required
                    rows={3}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-accent/40 resize-none"
                    placeholder="Mensagem completa"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Tipo</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-white/10 text-sm text-white focus:outline-none"
                  >
                    <option value="info">Info</option>
                    <option value="warning">Aviso</option>
                    <option value="success">Sucesso</option>
                    <option value="promo">Promo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Audiência</label>
                  <select
                    value={form.targetAudience}
                    onChange={(e) => setForm((f) => ({ ...f, targetAudience: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-white/10 text-sm text-white focus:outline-none"
                  >
                    <option value="all">Todos</option>
                    <option value="premium">Premium</option>
                    <option value="free">Gratuitos</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs text-zinc-400 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5" />
                      URL da imagem
                      <span className="text-zinc-600">(opcional — ativa modo card flutuante)</span>
                    </span>
                  </label>
                  <input
                    value={form.imageUrl}
                    onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-accent/40"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Label do botão CTA</label>
                  <input
                    value={form.actionLabel}
                    onChange={(e) => setForm((f) => ({ ...f, actionLabel: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-accent/40"
                    placeholder="Ex: Ver mais"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">URL do CTA</label>
                  <input
                    value={form.actionUrl}
                    onChange={(e) => setForm((f) => ({ ...f, actionUrl: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-accent/40"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Início</label>
                  <input
                    type="datetime-local"
                    value={form.startAt}
                    onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-accent/40"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Fim (opcional)</label>
                  <input
                    type="datetime-local"
                    value={form.endAt}
                    onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-accent/40"
                  />
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                      className="w-4 h-4 accent-accent"
                    />
                    <span className="text-sm text-zinc-300">Ativo</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.dismissible}
                      onChange={(e) => setForm((f) => ({ ...f, dismissible: e.target.checked }))}
                      className="w-4 h-4 accent-accent"
                    />
                    <span className="text-sm text-zinc-300">Descartável</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/5">
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editing ? "Salvar" : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
