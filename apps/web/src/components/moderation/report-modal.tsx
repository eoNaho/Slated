"use client";

import { useState } from "react";
import { X, Flag, Loader2, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";

const REASONS = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Assédio" },
  { value: "inappropriate", label: "Conteúdo inapropriado" },
  { value: "hate_speech", label: "Discurso de ódio" },
  { value: "misinformation", label: "Desinformação" },
  { value: "impersonation", label: "Impersonação" },
  { value: "copyright", label: "Violação de direitos autorais" },
  { value: "self_harm", label: "Autolesão" },
  { value: "other", label: "Outro" },
] as const;

interface ReportModalProps {
  targetType: "review" | "comment" | "user" | "list" | "story";
  targetId: string;
  onClose: () => void;
}

export function ReportModal({ targetType, targetId, onClose }: ReportModalProps) {
  const [reason, setReason] = useState<string>("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!reason) return;
    setLoading(true);
    setError(null);
    try {
      await api.reports.create({ targetType, targetId, reason, description: description || undefined });
      setDone(true);
    } catch {
      setError("Falha ao enviar denúncia. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-950 p-6 space-y-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Flag className="w-4 h-4 text-red-400" /> Denunciar
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center py-6 gap-3 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-400" />
            <p className="text-sm font-semibold text-white">Denúncia enviada</p>
            <p className="text-xs text-zinc-500">Nossa equipe irá revisar em breve. Obrigado por ajudar a manter a comunidade segura.</p>
            <button
              onClick={onClose}
              className="mt-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-zinc-800 hover:bg-zinc-700 transition-colors"
            >
              Fechar
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-400">Motivo da denúncia</p>
              <div className="grid grid-cols-1 gap-1.5">
                {REASONS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setReason(r.value)}
                    className={`text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                      reason === r.value
                        ? "bg-red-500/15 border border-red-500/30 text-white"
                        : "bg-white/[0.03] border border-white/5 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Detalhes adicionais (opcional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o problema..."
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 resize-none"
              />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-zinc-400 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={submit}
                disabled={loading || !reason}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500/80 hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                Denunciar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
