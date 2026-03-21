"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Users, Lock, Globe, Tag } from "lucide-react";

const CATEGORIES = [
  { value: "action", label: "Action" },
  { value: "comedy", label: "Comedy" },
  { value: "drama", label: "Drama" },
  { value: "horror", label: "Horror" },
  { value: "sci-fi", label: "Sci-Fi" },
  { value: "thriller", label: "Thriller" },
  { value: "romance", label: "Romance" },
  { value: "crime", label: "Crime" },
  { value: "fantasy", label: "Fantasy" },
  { value: "mystery", label: "Mystery" },
  { value: "animation", label: "Animation" },
  { value: "anime", label: "Anime" },
  { value: "documentary", label: "Documentary" },
  { value: "musical", label: "Musical" },
  { value: "by-director", label: "Por Diretor" },
  { value: "by-actor", label: "Por Ator" },
  { value: "by-decade", label: "Por Década" },
  { value: "by-country", label: "Por País" },
  { value: "general", label: "Geral" },
];

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export function NewClubForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [allowJoinRequests, setAllowJoinRequests] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function toggleCategory(value: string) {
    setSelectedCategories((prev) =>
      prev.includes(value)
        ? prev.filter((c) => c !== value)
        : prev.length < 3
          ? [...prev, value]
          : prev
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 3) {
      toast.error("Nome deve ter pelo menos 3 caracteres");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/clubs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          isPublic,
          allowJoinRequests: !isPublic ? allowJoinRequests : false,
          categories: selectedCategories,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao criar club");
      }

      const { data } = await res.json();
      toast.success("Club criado com sucesso!");
      router.push(`/clubs/${data.slug}`);
    } catch (err: any) {
      toast.error(err.message || "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Nome do club <span className="text-red-400">*</span>
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Filmes de Terror dos Anos 80"
          maxLength={60}
          required
          className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-white/8 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500/60 transition-colors text-sm"
        />
        <p className="text-xs text-zinc-600 mt-1">{name.length}/60</p>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Descrição
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Sobre o que é esse club? O que os membros vão fazer aqui?"
          maxLength={500}
          rows={3}
          className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-white/8 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500/60 transition-colors text-sm resize-none"
        />
        <p className="text-xs text-zinc-600 mt-1">{description.length}/500</p>
      </div>

      {/* Categories */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">
          Categorias <span className="text-zinc-600 text-xs">(máx. 3)</span>
        </label>
        <div className="flex flex-wrap gap-2 mt-2">
          {CATEGORIES.map((cat) => {
            const selected = selectedCategories.includes(cat.value);
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => toggleCategory(cat.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  selected
                    ? "bg-purple-600/30 text-purple-300 border-purple-500/50"
                    : "bg-zinc-900 text-zinc-500 border-white/8 hover:border-purple-500/30 hover:text-zinc-300"
                }`}
              >
                {selected && <Tag className="h-3 w-3" />}
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Privacy */}
      <div className="rounded-xl border border-white/8 overflow-hidden">
        <button
          type="button"
          onClick={() => setIsPublic(true)}
          className={`w-full flex items-start gap-4 p-4 text-left transition-colors ${isPublic ? "bg-purple-600/15 border-b border-purple-500/20" : "bg-zinc-900 border-b border-white/5 hover:bg-zinc-800/50"}`}
        >
          <div className={`mt-0.5 rounded-full p-2 ${isPublic ? "bg-purple-600/30" : "bg-zinc-800"}`}>
            <Globe className={`h-4 w-4 ${isPublic ? "text-purple-400" : "text-zinc-500"}`} />
          </div>
          <div>
            <div className={`font-medium text-sm ${isPublic ? "text-white" : "text-zinc-400"}`}>
              Público
            </div>
            <p className="text-xs text-zinc-600 mt-0.5">
              Qualquer pessoa pode ver e entrar no club
            </p>
          </div>
          <div className={`ml-auto w-4 h-4 rounded-full border-2 mt-1 transition-all ${isPublic ? "bg-purple-500 border-purple-500" : "border-zinc-600"}`} />
        </button>

        <button
          type="button"
          onClick={() => setIsPublic(false)}
          className={`w-full flex items-start gap-4 p-4 text-left transition-colors ${!isPublic ? "bg-purple-600/15" : "bg-zinc-900 hover:bg-zinc-800/50"}`}
        >
          <div className={`mt-0.5 rounded-full p-2 ${!isPublic ? "bg-purple-600/30" : "bg-zinc-800"}`}>
            <Lock className={`h-4 w-4 ${!isPublic ? "text-purple-400" : "text-zinc-500"}`} />
          </div>
          <div>
            <div className={`font-medium text-sm ${!isPublic ? "text-white" : "text-zinc-400"}`}>
              Privado
            </div>
            <p className="text-xs text-zinc-600 mt-0.5">
              Apenas membros aprovados podem ver o conteúdo
            </p>
          </div>
          <div className={`ml-auto w-4 h-4 rounded-full border-2 mt-1 transition-all ${!isPublic ? "bg-purple-500 border-purple-500" : "border-zinc-600"}`} />
        </button>
      </div>

      {/* Allow join requests (only for private) */}
      {!isPublic && (
        <label className="flex items-center gap-3 cursor-pointer group">
          <div
            onClick={() => setAllowJoinRequests((v) => !v)}
            className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${allowJoinRequests ? "bg-purple-600" : "bg-zinc-700"}`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${allowJoinRequests ? "translate-x-5" : "translate-x-0"}`}
            />
          </div>
          <div>
            <span className="text-sm font-medium text-zinc-300">
              Aceitar solicitações de entrada
            </span>
            <p className="text-xs text-zinc-600">
              Usuários podem solicitar entrar; você aprova ou recusa
            </p>
          </div>
        </label>
      )}

      {/* Submit */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={loading || name.trim().length < 3}
          className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
        >
          <Users className="h-4 w-4" />
          {loading ? "Criando..." : "Criar Club"}
        </button>
      </div>
    </form>
  );
}
