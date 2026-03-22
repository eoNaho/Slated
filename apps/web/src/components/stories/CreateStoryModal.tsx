"use client";

import * as React from "react";
import { X, Play, Star, BarChart2, Flame, List, Upload, Trash2, Camera, Clock, HelpCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { MediaSearchInput } from "@/components/media/media-search-input";
import { StoryType, StoryContent, StoryVisibility } from "@/types/stories";
import { VisibilitySelector } from "./VisibilitySelector";
import { SlideNavigator, SlideState } from "./SlideNavigator";
import type { SearchResult } from "@/types";
import Image from "next/image";

type SelectedMedia = Pick<SearchResult, "id" | "title" | "posterPath" | "mediaType" | "localId"> | null;

interface CreateStoryModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: {
    type?: StoryType;
    content?: Partial<StoryContent>;
    media?: SelectedMedia;
  };
}

function newSlide(type: StoryType, content: any = {}): SlideState & { image: File | null; imagePreviewFull: string | null; watchMedia: SelectedMedia; ratingMedia: SelectedMedia } {
  return { id: crypto.randomUUID(), type, content, imagePreview: null, image: null, imagePreviewFull: null, watchMedia: null, ratingMedia: null };
}

export function CreateStoryModal({ onClose, onSuccess, initialData }: CreateStoryModalProps) {
  const [slides, setSlides] = React.useState(() => [
    newSlide(initialData?.type ?? "watch", initialData?.content ?? {}),
  ]);
  const [activeIdx, setActiveIdx] = React.useState(0);
  const [visibility, setVisibility] = React.useState<StoryVisibility>("public");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const active = slides[activeIdx];
  const type: StoryType = active.type as StoryType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any = active.content;
  const image: File | null = (active as any).image ?? null;
  const imagePreview: string | null = (active as any).imagePreviewFull ?? null;
  const selectedWatchMedia: SelectedMedia = (active as any).watchMedia ?? null;
  const selectedRatingMedia: SelectedMedia = (active as any).ratingMedia ?? null;

  const updateActive = (patch: Partial<any>) => {
    setSlides((prev) => prev.map((s, i) => i === activeIdx ? { ...s, ...patch } : s));
  };

  const setType = (t: StoryType) => updateActive({ type: t, content: {}, watchMedia: null, ratingMedia: null });
  const setContent = (cb: any) => {
    if (typeof cb === "function") {
      setSlides((prev) => prev.map((s, i) => i === activeIdx ? { ...s, content: cb(s.content) } : s));
    } else {
      updateActive({ content: cb });
    }
  };
  const setSelectedWatchMedia = (m: SelectedMedia) => updateActive({ watchMedia: m });
  const setSelectedRatingMedia = (m: SelectedMedia) => updateActive({ ratingMedia: m });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => updateActive({ image: file, imagePreviewFull: reader.result as string, imagePreview: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handlePublish = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const isMulti = slides.length > 1;
      const payload: any = {
        type: slides[0].type,
        content: slides[0].content,
        visibility,
      };
      if (isMulti) {
        payload.slides = slides.map((s) => ({ type: s.type, content: s.content }));
      }

      const { data: story } = await api.stories.create(payload);

      // Upload images: first slide → main imageUrl, others → slide_index
      for (let i = 0; i < slides.length; i++) {
        const img = (slides[i] as any).image as File | null;
        if (img) {
          if (i === 0) {
            await api.stories.uploadImage(story.id, img);
          } else {
            // For slide images we use the same endpoint with a query param
            const fd = new FormData();
            fd.append("image", img);
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1"}/stories/${story.id}/image?slide_index=${i}`, {
              method: "POST",
              body: fd,
              credentials: "include",
            });
          }
        }
      }

      onSuccess?.();
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to publish story");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderForm = () => {
    switch (type) {
      case "watch":
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">What are you watching?</label>
            <MediaSearchInput
              value={selectedWatchMedia}
              onChange={(media) => {
                setSelectedWatchMedia(media);
                setContent((prev: any) => ({
                  ...prev,
                  media_id: media?.id,
                  media_title: media?.title,
                  poster_path: media?.posterPath,
                  media_type: media?.mediaType,
                }));
              }}
            />
            <Input
              placeholder="Add a note... (optional)"
              className="bg-white/5 border-white/10 text-white"
              onChange={(e) => setContent((prev: any) => ({ ...prev, note: e.target.value }))}
            />
          </div>
        );
      case "rating":
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Rate something</label>
            <MediaSearchInput
              value={selectedRatingMedia}
              onChange={(media) => {
                setSelectedRatingMedia(media);
                setContent((prev: any) => ({
                  ...prev,
                  media_id: media?.id,
                  media_title: media?.title,
                  poster_path: media?.posterPath,
                  media_type: media?.mediaType,
                }));
              }}
            />
            <div className="flex justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setContent({ ...content, rating: s })}
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    content.rating >= s ? "bg-yellow-400 text-black scale-110" : "bg-white/5 text-white/40 hover:bg-white/10"
                  )}
                >
                  <Star className={cn("w-6 h-6", content.rating >= s && "fill-current")} />
                </button>
              ))}
            </div>
            <Input 
              placeholder="Why this rating?"
              className="bg-white/5 border-white/10 text-white"
              onChange={(e) => setContent({ ...content, text: e.target.value })}
            />
          </div>
        );
      case "poll":
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Ask a question</label>
            <Input
              placeholder="What's on your mind?"
              className="bg-white/5 border-white/10 text-white font-bold"
              onChange={(e) => setContent((prev: any) => ({ ...prev, question: e.target.value }))}
            />
            <div className="space-y-2">
              {([0, 1] as const).map((i) => (
                <Input
                  key={i}
                  placeholder={`Option ${i + 1}`}
                  value={content.options?.[i]?.text ?? ""}
                  className="bg-white/5 border-white/10 text-white"
                  onChange={(e) => {
                    setContent((prev: any) => {
                      const opts = [...(prev.options ?? [{ text: "" }, { text: "" }])];
                      opts[i] = { text: e.target.value };
                      return { ...prev, options: opts };
                    });
                  }}
                />
              ))}
            </div>
          </div>
        );
      case "hot_take":
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Share a spicy opinion</label>
            <textarea
              placeholder="Your hot take here..."
              className="w-full h-32 p-4 rounded-xl bg-orange-600/20 border border-orange-500/30 text-white placeholder:text-white/40 font-black text-xl outline-none focus:border-orange-500 transition-all resize-none"
              onChange={(e) => setContent((prev: any) => ({ ...prev, statement: e.target.value }))}
            />
          </div>
        );
      case "list":
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Share a list</label>
            <Input
              placeholder="List name"
              className="bg-white/5 border-white/10 text-white font-semibold"
              onChange={(e) =>
                setContent((prev: any) => ({ ...prev, list_name: e.target.value }))
              }
            />
            <Input
              placeholder="Number of items"
              type="number"
              min={1}
              className="bg-white/5 border-white/10 text-white"
              onChange={(e) =>
                setContent((prev: any) => ({
                  ...prev,
                  item_count: parseInt(e.target.value, 10) || 0,
                }))
              }
            />
            <p className="text-xs text-zinc-600">
              Tip: paste poster image URLs below to show a preview grid
            </p>
          </div>
        );
      case "countdown":
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Lançamento aguardado</label>
            <MediaSearchInput
              value={selectedWatchMedia}
              onChange={(media) => {
                setSelectedWatchMedia(media);
                setContent((prev: any) => ({
                  ...prev,
                  media_id: media?.id,
                  media_title: media?.title,
                  poster_path: media?.posterPath,
                }));
              }}
            />
            <div className="space-y-1">
              <label className="text-xs text-zinc-500">Data de lançamento</label>
              <Input
                type="date"
                className="bg-white/5 border-white/10 text-white"
                onChange={(e) => setContent((prev: any) => ({ ...prev, release_date: e.target.value }))}
              />
            </div>
            <Input
              placeholder="Nota (opcional)"
              className="bg-white/5 border-white/10 text-white"
              onChange={(e) => setContent((prev: any) => ({ ...prev, note: e.target.value }))}
            />
          </div>
        );
      case "quiz":
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Trivia de cinema</label>
            <Input
              placeholder="Pergunta"
              className="bg-white/5 border-white/10 text-white font-bold"
              onChange={(e) => setContent((prev: any) => ({ ...prev, question: e.target.value }))}
            />
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder={`Opção ${i + 1}${i >= 2 ? " (opcional)" : ""}`}
                    value={content.options?.[i]?.text ?? ""}
                    className={cn(
                      "bg-white/5 border-white/10 text-white flex-1",
                      content.correct_index === i && "border-green-500/50 bg-green-500/10"
                    )}
                    onChange={(e) => {
                      setContent((prev: any) => {
                        const opts = [...(prev.options ?? [])];
                        while (opts.length <= i) opts.push({ text: "" });
                        opts[i] = { text: e.target.value };
                        return { ...prev, options: opts.filter((_: any, idx: number) => idx <= i || opts[idx]?.text) };
                      });
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setContent((prev: any) => ({ ...prev, correct_index: i }))}
                    className={cn(
                      "text-xs px-2 py-1 rounded-lg border transition-all whitespace-nowrap",
                      content.correct_index === i
                        ? "bg-green-500/20 border-green-500/40 text-green-400"
                        : "border-white/10 text-white/30 hover:text-white/60"
                    )}
                  >
                    ✓
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-600">Clique no ✓ para marcar a resposta correta</p>
          </div>
        );
      case "question_box":
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Caixa de perguntas</label>
            <textarea
              placeholder="Faça uma pergunta aos seus seguidores..."
              className="w-full h-28 p-4 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-white placeholder:text-white/40 font-semibold text-lg outline-none focus:border-indigo-500 transition-all resize-none"
              onChange={(e) => setContent((prev: any) => ({ ...prev, question: e.target.value }))}
            />
          </div>
        );
      default:
        return <div className="text-white/40 text-center py-8">Template under construction...</div>;
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#0f0a14] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Create Story</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full text-white/40 hover:text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
          {/* Type Selector */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: "watch", icon: Play, label: "Watch" },
              { id: "rating", icon: Star, label: "Rating" },
              { id: "poll", icon: BarChart2, label: "Poll" },
              { id: "hot_take", icon: Flame, label: "Hot" },
              { id: "list", icon: List, label: "List" },
              { id: "countdown", icon: Clock, label: "Count" },
              { id: "quiz", icon: HelpCircle, label: "Quiz" },
              { id: "question_box", icon: MessageSquare, label: "Q&A" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setType(t.id as StoryType);
                  setContent({});
                  setSelectedWatchMedia(null);
                  setSelectedRatingMedia(null);
                }}
                className={cn(
                  "flex-1 flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border",
                  type === t.id 
                    ? "bg-purple-500/20 border-purple-500/40 text-purple-400" 
                    : "bg-white/5 border-transparent text-white/40 hover:bg-white/10"
                )}
              >
                <t.icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Form Content */}
          <div className="min-h-[200px]">
            {renderForm()}
          </div>

          {/* Image Upload Area */}
          <div className="space-y-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Background Image</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "relative h-48 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all overflow-hidden",
                imagePreview ? "border-solid border-purple-500/50" : "border-white/10 hover:border-white/20 hover:bg-white/5"
              )}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleImageChange}
              />
              {imagePreview ? (
                <>
                  <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-white/20" />
                  <span className="text-sm text-white/40 font-medium">Add a photo to your story</span>
                </>
              )}
            </div>
            {imagePreview && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  updateActive({ image: null, imagePreviewFull: null, imagePreview: null });
                }}
                className="text-red-400 hover:text-red-300 hover:bg-red-400/10 w-full rounded-xl"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove photo
              </Button>
            )}
          </div>

          {/* Slide Navigator */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Slides {slides.length > 1 ? `(${slides.length})` : ""}
            </label>
            <SlideNavigator
              slides={slides}
              activeIndex={activeIdx}
              onSelect={setActiveIdx}
              onAdd={() => {
                const s = newSlide("watch");
                setSlides((prev) => [...prev, s]);
                setActiveIdx(slides.length);
              }}
              onRemove={(i) => {
                setSlides((prev) => prev.filter((_, idx) => idx !== i));
                setActiveIdx((prev) => Math.min(prev, slides.length - 2));
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-black/20 space-y-3">
          {error && <p className="text-red-400 text-xs font-medium text-center">{error}</p>}
          <VisibilitySelector value={visibility} onChange={setVisibility} />
          <Button
            onClick={handlePublish}
            disabled={isSubmitting || !type}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-lg shadow-xl shadow-purple-500/20 disabled:opacity-50 transition-all"
          >
            {isSubmitting ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              "Share Story"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
