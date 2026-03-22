"use client";

import * as React from "react";
import { X, ChevronLeft, ChevronRight, MessageCircle, Heart, Send, Bookmark } from "lucide-react";
import { Story } from "@/types/stories";
import { StoryTemplate } from "./StoryTemplates";
import { cn, resolveImage } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth-client";

export interface StoryViewerProps {
  stories: Story[];
  initialIndex?: number;
  onClose: () => void;
}

export function StoryViewer({ stories, initialIndex = 0, onClose }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);
  const [progress, setProgress] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);

  const STORY_DURATION = 8000; // 8 seconds

  const currentStory = stories[currentIndex];

  // Register a view for the initial story on mount
  React.useEffect(() => {
    if (currentStory) {
      api.stories.view(currentStory.id).catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-advance
  React.useEffect(() => {
    if (isPaused) return;

    const interval = 50; // Update every 50ms
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            const nextIndex = currentIndex + 1;
            setCurrentIndex(nextIndex);
            api.stories.view(stories[nextIndex].id).catch(console.error);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + (interval / STORY_DURATION) * 100;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [currentIndex, isPaused, stories.length, onClose]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setProgress(0);
      api.stories.view(stories[nextIndex].id).catch(console.error);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      setProgress(0);
      api.stories.view(stories[prevIndex].id).catch(console.error);
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
      // Real-time update logic would go here (e.g. refetch story)
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center select-none overflow-hidden">
      {/* Ambient background — show the uploaded image if available, otherwise the template */}
      <div className="absolute inset-0 pointer-events-none">
        {currentStory.imageUrl ? (
          <img
            src={resolveImage(currentStory.imageUrl) || ""}
            alt=""
            className="w-full h-full object-cover opacity-30 blur-3xl scale-125"
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
          {stories.map((_, i) => (
            <div key={i} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full bg-white transition-all duration-75",
                  i < currentIndex ? "w-full" : i === currentIndex ? "" : "w-0"
                )}
                style={i === currentIndex ? { width: `${progress}%` } : {}}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-8 inset-x-6 z-50 flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-white/20 p-0.5">
              <img
                src={resolveImage(currentStory.user?.avatarUrl) || "/placeholder-user.jpg"}
                className="w-full h-full rounded-full object-cover"
                alt=""
              />
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold text-sm shadow-sm">
                {currentStory.user?.displayName || currentStory.user?.username}
              </span>
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
              key={currentStory.id}
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 300 }}
              className="h-full w-full"
            >
              <StoryTemplate 
                story={currentStory} 
                onVote={handleVote}
                results={[]} // Poll results would be here
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Interaction Bar */}
        <div className="p-4 pt-0 z-50 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-12 flex items-center px-4 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
              <input 
                placeholder="Enviar mensagem..." 
                className="bg-transparent border-none outline-none text-white text-sm w-full placeholder:text-white/40"
                onFocus={() => setIsPaused(true)}
                onBlur={() => setIsPaused(false)}
              />
              <Send className="w-4 h-4 text-white/60 ml-2" />
            </div>
            
            <div className="flex gap-2">
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
              <button className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white backdrop-blur-md">
                <Heart className="w-5 h-5 hover:text-red-500 transition-colors" />
              </button>
            </div>
          </div>
        </div>

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
