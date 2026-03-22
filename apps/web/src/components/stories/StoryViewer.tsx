"use client";

import * as React from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, Send, Bookmark, Eye, MessageCircle } from "lucide-react";
import { Story } from "@/types/stories";
import { StoryTemplate } from "./StoryTemplates";
import { cn, resolveImage } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import { SeenByDrawer } from "./SeenByDrawer";
import { StoryRepliesDrawer } from "./StoryRepliesDrawer";
import { VisibilityBadge } from "./VisibilitySelector";
import { toast } from "sonner";

export interface StoryViewerProps {
  stories: Story[];
  initialIndex?: number;
  onClose: () => void;
  readOnly?: boolean;
}

export function StoryViewer({ stories, initialIndex = 0, onClose, readOnly = false }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);
  const [progress, setProgress] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [isSeenByOpen, setIsSeenByOpen] = React.useState(false);
  const [isRepliesOpen, setIsRepliesOpen] = React.useState(false);
  const [userAnswers, setUserAnswers] = React.useState<Record<string, number>>({});
  const [respondedQuestions, setRespondedQuestions] = React.useState<Set<string>>(new Set());

  const STORY_DURATION = 8000; // 8 seconds
  const [slideIndex, setSlideIndex] = React.useState(0);

  const currentStory = stories[currentIndex];
  const currentSlides = currentStory?.slides && currentStory.slides.length > 0 ? currentStory.slides : null;
  const currentSlide = currentSlides ? currentSlides[slideIndex] : null;

  // Register a view for the initial story on mount
  React.useEffect(() => {
    if (currentStory && !readOnly) {
      api.stories.view(currentStory.id).catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset slide index when story changes
  React.useEffect(() => {
    setSlideIndex(0);
  }, [currentIndex]);

  // Auto-advance
  React.useEffect(() => {
    if (isPaused || readOnly) return;

    const tickMs = 50;
    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (tickMs / STORY_DURATION) * 100;
        return next >= 100 ? 100 : next;
      });
    }, tickMs);

    return () => clearInterval(timer);
  }, [isPaused, readOnly]);

  // Handle progress reaching 100 — advance outside the setter
  React.useEffect(() => {
    if (progress < 100) return;

    if (currentSlides && slideIndex < currentSlides.length - 1) {
      setSlideIndex((s) => s + 1);
      setProgress(0);
      return;
    }

    if (currentIndex < stories.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setProgress(0);
      if (!readOnly) api.stories.view(stories[nextIndex].id).catch(console.error);
      return;
    }

    onClose();
  }, [progress]);

  const handleNext = () => {
    // Try to advance to next slide within the current story
    if (currentSlides && slideIndex < currentSlides.length - 1) {
      setSlideIndex((s) => s + 1);
      setProgress(0);
      return;
    }
    if (currentIndex < stories.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setProgress(0);
      if (!readOnly) api.stories.view(stories[nextIndex].id).catch(console.error);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentSlides && slideIndex > 0) {
      setSlideIndex((s) => s - 1);
      setProgress(0);
      return;
    }
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      setProgress(0);
      if (!readOnly) api.stories.view(stories[prevIndex].id).catch(console.error);
    }
  };

  const handleQuizAnswer = async (optionIndex: number) => {
    if (userAnswers[currentStory.id] !== undefined) return;
    setUserAnswers((prev) => ({ ...prev, [currentStory.id]: optionIndex }));
    try {
      await api.stories.quizAnswer(currentStory.id, optionIndex);
    } catch (e) {
      console.error(e);
    }
  };

  const handleQuestionResponse = async (text: string) => {
    setRespondedQuestions((prev) => new Set(prev).add(currentStory.id));
    try {
      await api.stories.questionResponse(currentStory.id, text);
      toast.success("Resposta enviada!");
    } catch {
      toast.error("Erro ao enviar resposta");
    }
  };

  const { data: session } = useSession();
  const isOwner = session?.user?.id === currentStory.userId;

  const handlePin = async () => {
    if (!isOwner) return;
    try {
      await api.stories.pin(currentStory.id, !currentStory.isPinned);
      // In a real app, we'd update the local story object or refetch
      currentStory.isPinned = !currentStory.isPinned;
      setIsPaused(false); // Resume if it was paused
    } catch (e) {
      console.error(e);
    }
  };

  const handleVote = async (optionIndex: number) => {
    try {
      await api.stories.pollVote(currentStory.id, optionIndex);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || isSending) return;
    setIsSending(true);
    try {
      await api.stories.react(currentStory.id, "reply", message.trim());
      setMessage("");
      toast.success("Mensagem enviada");
    } catch {
      toast.error("Erro ao enviar mensagem");
    } finally {
      setIsSending(false);
    }
  };

  const handleMessageKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSendMessage();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center select-none overflow-hidden">
      {/* Ambient background — show the uploaded image if available, otherwise the template */}
      <div className="absolute inset-0 pointer-events-none">
        {(currentSlide?.imageUrl ?? currentStory.imageUrl) ? (
          <Image
            fill
            src={resolveImage(currentSlide?.imageUrl ?? currentStory.imageUrl) || ""}
            alt=""
            className="object-cover opacity-30 blur-3xl scale-125"
          />
        ) : (
          <div className="opacity-30 blur-3xl scale-125 h-full w-full">
            <StoryTemplate story={currentStory} />
          </div>
        )}
      </div>

      <div className="relative w-full max-w-[450px] aspect-[9/16] bg-neutral-900 shadow-2xl overflow-hidden flex flex-col sm:rounded-2xl">
        {/* Progress Bars */}
        <div className="absolute top-4 inset-x-4 z-50 flex gap-1.5 px-2">
          {stories.map((story, i) => {
            const slideCount = story.slides && story.slides.length > 0 ? story.slides.length : 1;
            return Array.from({ length: slideCount }).map((_, si) => {
              const globalBefore = stories.slice(0, i).reduce((acc, s) => acc + (s.slides?.length || 1), 0) + si;
              const currentGlobal = stories.slice(0, currentIndex).reduce((acc, s) => acc + (s.slides?.length || 1), 0) + slideIndex;
              const isCurrent = i === currentIndex && si === slideIndex;
              const isPast = globalBefore < currentGlobal;
              return (
                <div key={`${i}-${si}`} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full bg-white transition-all duration-75",
                      isPast ? "w-full" : isCurrent ? "" : "w-0"
                    )}
                    style={isCurrent ? { width: `${progress}%` } : {}}
                  />
                </div>
              );
            });
          })}
        </div>

        {/* Header */}
        <div className="absolute top-8 inset-x-6 z-50 flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full border-2 border-white/20 overflow-hidden">
              <Image
                fill
                src={resolveImage(currentStory.user?.avatarUrl) || "/placeholder-user.jpg"}
                className="rounded-full object-cover"
                alt=""
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-sm shadow-sm">
                  {currentStory.user?.displayName || currentStory.user?.username}
                </span>
                <VisibilityBadge visibility={currentStory.visibility} />
              </div>
              <span className="text-white/60 text-xs font-medium">
                {new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-2 h-10 w-10 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md text-white border border-white/10 hover:bg-black/40 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div 
          className="flex-1 relative"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {/* Navigation Click Areas */}
          <div className="absolute inset-y-0 left-0 w-1/4 z-40 cursor-pointer" onClick={handlePrev} />
          <div className="absolute inset-y-0 right-0 w-1/4 z-40 cursor-pointer" onClick={handleNext} />
          
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentStory.id}-${slideIndex}`}
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 300 }}
              className="h-full w-full"
            >
              <StoryTemplate
                story={currentSlide ? { ...currentStory, type: currentSlide.type as any, content: currentSlide.content as any, imageUrl: currentSlide.imageUrl ?? currentStory.imageUrl } : currentStory}
                onVote={handleVote}
                results={[]}
                onQuizAnswer={handleQuizAnswer}
                userAnswer={userAnswers[currentStory.id] ?? null}
                onQuestionResponse={handleQuestionResponse}
                hasResponded={respondedQuestions.has(currentStory.id)}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Interaction Bar */}
        {!readOnly && <div className="p-4 pt-0 z-50 bg-gradient-to-t from-black/80 to-transparent">
          {/* Owner row: Seen by + Replies */}
          {isOwner && (
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => { setIsSeenByOpen(true); setIsPaused(true); }}
                className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors text-xs"
              >
                <Eye className="w-4 h-4" />
                <span>Visto por {currentStory.viewsCount > 0 ? currentStory.viewsCount : ""}</span>
              </button>
              <button
                onClick={() => { setIsRepliesOpen(true); setIsPaused(true); }}
                className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors text-xs ml-3"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Respostas</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="flex-1 h-12 flex items-center px-4 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleMessageKeyDown}
                placeholder="Enviar mensagem..."
                className="bg-transparent border-none outline-none text-white text-sm w-full placeholder:text-white/40"
                onFocus={() => setIsPaused(true)}
                onBlur={() => setIsPaused(false)}
              />
              <button
                onClick={handleSendMessage}
                disabled={!message.trim() || isSending}
                className="ml-2 text-white/60 hover:text-white disabled:opacity-30 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {isOwner && (
              <button
                onClick={handlePin}
                className={cn(
                  "w-12 h-12 rounded-full border backdrop-blur-md flex items-center justify-center transition-all",
                  currentStory.isPinned
                    ? "bg-purple-500 border-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                    : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                )}
              >
                <Bookmark className={cn("w-5 h-5", currentStory.isPinned && "fill-current")} />
              </button>
            )}
          </div>
        </div>}

        {/* Seen By Drawer */}
        <SeenByDrawer
          storyId={currentStory.id}
          viewsCount={currentStory.viewsCount}
          isOpen={isSeenByOpen}
          onClose={() => { setIsSeenByOpen(false); setIsPaused(false); }}
        />

        {/* Replies Drawer */}
        <StoryRepliesDrawer
          storyId={currentStory.id}
          isOpen={isRepliesOpen}
          onClose={() => { setIsRepliesOpen(false); setIsPaused(false); }}
        />

        {/* Desktop Navigation Arrows */}
        <button 
          onClick={handlePrev}
          className="hidden md:flex absolute left-[-80px] top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 border border-white/20 items-center justify-center text-white hover:bg-white/20 transition-all"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button 
          onClick={handleNext}
          className="hidden md:flex absolute right-[-80px] top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 border border-white/20 items-center justify-center text-white hover:bg-white/20 transition-all"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
