"use client";

import React from "react";
import Image from "next/image";
import { Story, WatchContent, ListContent, RatingContent, PollContent, HotTakeContent, RewindContent } from "@/types/stories";
import { Star, Play, List, BarChart2, Flame, Rewind } from "lucide-react";
import { cn, resolveImage } from "@/lib/utils";

// --- Watch Template ---
export const WatchTemplate = ({ content, imageUrl }: { content: WatchContent; imageUrl?: string | null }) => {
  const posterSrc = resolveImage(content.poster_path);
  const bgSrc = resolveImage(imageUrl);
  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center text-center p-6 overflow-hidden">
      {/* User-uploaded background image */}
      {bgSrc && (
        <div className="absolute inset-0 z-0">
          <Image src={bgSrc} alt="" fill className="object-cover" />
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        </div>
      )}
      <div className="relative z-10 flex flex-col items-center">
        {posterSrc ? (
          <div className="relative w-48 h-72 rounded-xl overflow-hidden shadow-2xl mb-6 ring-1 ring-white/20">
            <Image src={posterSrc} alt={content.media_title} fill className="object-cover" />
          </div>
        ) : (
          <div className="w-48 h-72 rounded-xl bg-muted flex items-center justify-center mb-6">
            <Play className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        <h2 className="text-2xl font-bold text-white mb-2 leading-tight">Watching {content.media_title}</h2>
        {content.note && (
          <p className="text-white/80 italic text-lg max-w-xs line-clamp-4">
            &ldquo;{content.note}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
};

// --- List Template ---
export const ListTemplate = ({ content }: { content: ListContent }) => (
  <div className="relative h-full w-full flex flex-col p-6 bg-gradient-to-b from-purple-900/40 to-black/60 backdrop-blur-sm">
    <div className="mt-auto mb-8">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 text-sm font-medium mb-4 ring-1 ring-purple-500/30">
        <List className="w-4 h-4" />
        Shared a list
      </div>
      <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">{content.list_name}</h2>
      <p className="text-white/60 font-medium">{content.item_count} items</p>
    </div>
    
    <div className="grid grid-cols-2 gap-3 mb-12">
      {content.preview_images?.slice(0, 4).map((img, i) => (
        <div key={i} className="aspect-[2/3] relative rounded-lg overflow-hidden shadow-lg ring-1 ring-white/10">
          <Image src={`https://image.tmdb.org/t/p/w200${img}`} alt="" fill className="object-cover" />
        </div>
      ))}
    </div>
  </div>
);

// --- Rating Template ---
export const RatingTemplate = ({ content, imageUrl }: { content: RatingContent; imageUrl?: string | null }) => {
  const posterSrc = resolveImage(content.poster_path);
  const bgSrc = resolveImage(imageUrl) || posterSrc;
  return (
  <div className="relative h-full w-full flex flex-col items-center justify-center p-6 overflow-hidden">
    {bgSrc && (
      <div className="absolute inset-0 z-0">
        <Image
          src={bgSrc}
          alt=""
          fill
          className="object-cover opacity-30 blur-xl scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black/80" />
      </div>
    )}
    
    <div className="relative z-10 flex flex-col items-center text-center">
      {posterSrc && (
        <div className="relative w-40 h-60 rounded-lg overflow-hidden shadow-2xl mb-8 ring-1 ring-white/20">
          <Image
            src={posterSrc}
            alt=""
            fill
            className="object-cover"
          />
        </div>
      )}
      <h3 className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2">My Rating</h3>
      <h2 className="text-2xl font-bold text-white mb-6 underline decoration-yellow-400 decoration-4 underline-offset-8">
        {content.media_title}
      </h2>
      
      <div className="flex gap-1.5 mb-8">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star 
            key={s} 
            className={cn(
              "w-8 h-8",
              s <= Math.round(content.rating) ? "text-yellow-400 fill-yellow-400" : "text-white/20"
            )} 
          />
        ))}
      </div>
      
      {content.text && (
        <p className="text-lg text-white font-medium max-w-xs">{content.text}</p>
      )}
    </div>
  </div>
  );
};

// --- Poll Template ---
export const PollTemplate = ({ 
  content, 
  onVote, 
  userVote, 
  results 
}: { 
  content: PollContent; 
  onVote?: (index: number) => void;
  userVote?: number | null;
  results?: { optionIndex: number; count: number }[];
}) => {
  const totalVotes = results?.reduce((acc, r) => acc + r.count, 0) || 0;
  
  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center p-8 bg-gradient-to-tr from-blue-900/60 to-purple-900/60">
      <div className="w-full max-w-sm bg-black/40 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/10">
        <div className="flex justify-center mb-6">
          <div className="p-3 rounded-2xl bg-white/10 ring-1 ring-white/20">
            <BarChart2 className="w-8 h-8 text-white" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-white text-center mb-8 leading-tight">
          {content.question}
        </h2>
        
        <div className="space-y-3">
          {content.options.map((option, i) => {
            const voteCount = results?.find(r => r.optionIndex === i)?.count || 0;
            const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
            const isSelected = userVote === i;
            
            return (
              <button
                key={i}
                onClick={() => onVote?.(i)}
                disabled={userVote !== null}
                className={cn(
                  "relative w-full h-14 rounded-2xl overflow-hidden border transition-all duration-300",
                  isSelected ? "border-white bg-white/20" : "border-white/10 bg-white/5 hover:bg-white/10"
                )}
              >
                {/* Progress Bar */}
                {userVote !== null && (
                  <div 
                    className="absolute inset-y-0 left-0 bg-blue-500/30 transition-all duration-1000" 
                    style={{ width: `${percentage}%` }}
                  />
                )}
                
                <div className="relative z-10 flex items-center justify-between px-5 h-full">
                  <span className="text-white font-semibold truncate pr-4">{option.text}</span>
                  {userVote !== null && (
                    <span className="text-white/80 font-mono font-bold text-sm tracking-tighter">
                      {percentage}%
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        
        {userVote !== null && (
          <p className="text-zinc-500 text-xs text-center mt-6 font-medium">
            {totalVotes} total votes
          </p>
        )}
      </div>
    </div>
  );
};

// --- Hot Take Template ---
export const HotTakeTemplate = ({ content }: { content: HotTakeContent }) => (
  <div className="relative h-full w-full flex flex-col items-center justify-center p-10 bg-orange-600">
    {/* Animated background hint */}
    <div className="absolute inset-0 opacity-20 pointer-events-none">
      <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-yellow-300 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-red-800 rounded-full blur-[100px] animate-pulse" />
    </div>
    
    <div className="relative z-10 flex flex-col items-center text-center">
      <div className="mb-8 p-4 rounded-3xl bg-black/20 backdrop-blur-sm animate-bounce">
        <Flame className="w-12 h-12 text-yellow-300 fill-yellow-300" />
      </div>
      
      <h3 className="text-black/40 text-xs font-bold uppercase tracking-widest mb-4">Hot Take</h3>
      
      <h2 className="text-4xl font-black text-white leading-tight drop-shadow-lg">
        "{content.statement.toUpperCase()}"
      </h2>
      
      <div className="mt-12 flex gap-4">
        <div className="px-6 py-3 rounded-full bg-white text-orange-600 font-black shadow-xl">AGREE</div>
        <div className="px-6 py-3 rounded-full bg-black text-white font-black shadow-xl">NAH</div>
      </div>
    </div>
  </div>
);

// --- Rewind Template ---
export const RewindTemplate = ({ content }: { content: RewindContent }) => (
  <div className="relative h-full w-full flex flex-col items-center justify-center p-8 bg-gradient-to-b from-indigo-950 to-black overflow-hidden">
    {/* Ambient glow */}
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-72 h-72 bg-purple-600/20 rounded-full blur-[80px]" />
    </div>

    <div className="relative z-10 flex flex-col items-center text-center w-full">
      <div className="mb-4 p-3 rounded-2xl bg-white/5 border border-white/10">
        <Rewind className="w-7 h-7 text-purple-300" />
      </div>
      <p className="text-purple-300 text-xs font-bold uppercase tracking-widest mb-1">Daily Rewind</p>
      <p className="text-white/40 text-xs mb-8">{content.date}</p>

      {/* Poster grid */}
      {content.media_watched.length > 0 && (
        <div className={cn(
          "grid gap-3 mb-8 w-full max-w-xs",
          content.media_watched.length === 1 ? "grid-cols-1 justify-items-center" :
          content.media_watched.length === 2 ? "grid-cols-2" : "grid-cols-3"
        )}>
          {content.media_watched.slice(0, 6).map((item) => (
            <div
              key={item.id}
              className="aspect-[2/3] relative rounded-lg overflow-hidden shadow-lg ring-1 ring-white/10"
            >
              {item.poster_path ? (
                <Image
                  src={resolveImage(item.poster_path) || ""}
                  alt={item.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                  <Play className="w-6 h-6 text-zinc-600" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <h2 className="text-3xl font-black text-white mb-1">
        {content.media_watched.length} {content.media_watched.length === 1 ? "film" : "films"}
      </h2>
      <p className="text-white/50 text-sm">watched today</p>
      {content.top_genre && (
        <p className="mt-3 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold">
          Top genre: {content.top_genre}
        </p>
      )}
    </div>
  </div>
);

// --- Story Template Switcher ---
export const StoryTemplate = ({
  story,
  onVote,
  userVote,
  results
}: {
  story: Story;
  onVote?: (index: number) => void;
  userVote?: number | null;
  results?: { optionIndex: number; count: number }[];
}) => {
  const { type, content, imageUrl } = story;

  switch (type) {
    case "watch":
      return <WatchTemplate content={content as WatchContent} imageUrl={imageUrl} />;
    case "list":
      return <ListTemplate content={content as ListContent} />;
    case "rating":
      return <RatingTemplate content={content as RatingContent} imageUrl={imageUrl} />;
    case "poll":
      return (
        <PollTemplate
          content={content as PollContent}
          onVote={onVote}
          userVote={userVote}
          results={results}
        />
      );
    case "hot_take":
      return <HotTakeTemplate content={content as HotTakeContent} />;
    case "rewind":
      return <RewindTemplate content={content as RewindContent} />;
    default:
      return (
        <div className="h-full w-full flex items-center justify-center text-white/40">
          Template pending implementation for {type}
        </div>
      );
  }
};
