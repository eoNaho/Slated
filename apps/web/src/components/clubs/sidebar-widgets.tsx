"use client";

import React from "react";
import { 
  Users, 
  Calendar, 
  BarChart2, 
  Bookmark, 
  Info, 
  ArrowRight,
  ExternalLink,
  Lock,
  Globe,
  Plus
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { 
  Club, 
  ClubEvent, 
  ClubPoll, 
  ClubWatchlistItem 
} from "@/lib/queries/clubs";

interface WidgetWrapperProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  actionLabel?: string;
  onActionClick?: () => void;
}

function WidgetWrapper({ title, icon: Icon, children, actionLabel, onActionClick }: WidgetWrapperProps) {
  return (
    <div 
      className="rounded-3xl border border-white/10 overflow-hidden shadow-2xl transition-all duration-300 hover:border-purple-500/20 group/widget"
      style={{
        background: "rgba(24,24,27,0.4)",
        backdropFilter: "blur(24px)",
      }}
    >
      <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 flex items-center gap-2.5">
          <Icon className="h-3.5 w-3.5 text-purple-400" />
          {title}
        </h3>
        {actionLabel && (
          <button
            onClick={onActionClick}
            className="text-xs font-medium text-zinc-500 hover:text-purple-400 transition-colors flex items-center gap-1"
          >
            {actionLabel}
            <Plus className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

export function ClubInfoWidget({ club }: { club: Club }) {
  return (
    <WidgetWrapper title="Sobre o Clube" icon={Info}>
      <div className="space-y-4">
        <p className="text-zinc-400 text-sm leading-relaxed">
          {club.description || "Nenhuma descrição fornecida."}
        </p>
        <div className="pt-4 border-t border-white/5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">Tipo</span>
            <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
              {club.isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              {club.isPublic ? "Público" : "Privado"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">Categoria</span>
            <span className="text-purple-400 font-medium">
              {club.categories[0] || "Geral"}
            </span>
          </div>
        </div>
      </div>
    </WidgetWrapper>
  );
}

export function NextSessionWidget({ event }: { event?: ClubEvent }) {
  if (!event) return null;

  const date = new Date(event.scheduledAt);
  const day = date.getDate();
  const month = date.toLocaleDateString("pt-BR", { month: "short" });

  return (
    <WidgetWrapper title="Próxima Sessão" icon={Calendar}>
      <div className="group/card cursor-pointer">
        <div className="flex gap-4 items-start mb-4">
          <div className="shrink-0 w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-purple-400 leading-none">{day}</span>
            <span className="text-[10px] font-medium text-purple-500/60 uppercase">{month}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white mb-1 line-clamp-1 group-hover/card:text-purple-400 transition-colors">
              {event.title}
            </h4>
            <p className="text-xs text-zinc-500">{event.goingCount} confirmados</p>
          </div>
        </div>
        {event.meetLink && (
          <Link
            href={event.meetLink}
            target="_blank"
            className="w-full h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-all active:scale-[0.98]"
          >
            Entrar na Reunião <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </WidgetWrapper>
  );
}

export function TopPollWidget({ poll, onViewAll }: { poll?: ClubPoll; onViewAll?: () => void }) {
  if (!poll) return null;

  return (
    <WidgetWrapper title="Enquete Ativa" icon={BarChart2}>
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-white leading-snug">
          {poll.question}
        </h4>
        <div className="space-y-2">
          {poll.options.slice(0, 2).map((opt) => {
            const pct = poll.totalVotes > 0 ? Math.round((opt.votesCount / poll.totalVotes) * 100) : 0;
            return (
              <div key={opt.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 truncate max-w-[150px]">{opt.text}</span>
                  <span className="text-purple-400 font-medium">{pct}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full" 
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <button
          onClick={onViewAll}
          className="text-xs font-medium text-zinc-500 hover:text-purple-400 transition-colors w-full text-center py-2 border-t border-white/5 mt-2"
        >
          Ver Todas as Enquetes
        </button>
      </div>
    </WidgetWrapper>
  );
}

export function WatchlistSpotlightWidget({ item, onViewWatchlist }: { item?: ClubWatchlistItem; onViewWatchlist?: () => void }) {
  if (!item) return null;

  const mediaHref = item.mediaId
    ? `/${item.mediaType === "series" ? "series" : "movies"}/${item.mediaId}`
    : null;

  return (
    <WidgetWrapper title="Destaque da Watchlist" icon={Bookmark}>
      <div className="relative aspect-[16/9] rounded-2xl overflow-hidden border border-white/5 mb-4 group/poster">
        {item.mediaPosterPath ? (
          <Image
            fill
            src={`https://image.tmdb.org/t/p/w500${item.mediaPosterPath}`}
            alt={item.mediaTitle}
            className="object-cover transition-transform duration-500 group-hover/poster:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
            <Bookmark className="h-8 w-8 text-zinc-800" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-4 right-4 text-xs font-bold text-white truncate">
          {item.mediaTitle}
        </div>
      </div>
      {mediaHref ? (
        <Link
          href={mediaHref}
          className="w-full h-9 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center gap-2 text-sm font-medium text-purple-400 hover:bg-purple-600/20 transition-all active:scale-[0.98]"
        >
          Ver Detalhes <ArrowRight className="h-3 w-3" />
        </Link>
      ) : (
        <button
          onClick={onViewWatchlist}
          className="w-full h-9 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center gap-2 text-sm font-medium text-purple-400 hover:bg-purple-600/20 transition-all active:scale-[0.98]"
        >
          Ver Watchlist <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </WidgetWrapper>
  );
}
