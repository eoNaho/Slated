"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Star,
  Clock,
  Calendar,
  Film,
  Bookmark,
  Share2,
  ListPlus,
  Play,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "./_components/ui/badge";
import { Progress } from "./_components/ui/progress";
// Import Textarea just to ensure it's used if needed, though ReviewForm uses it internally
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./_components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

import {
  CastSection,
  CastMember,
  CrewMember,
} from "./_components/cast-section";
import { RelatedContent, RelatedItem } from "./_components/related-content";
import { ReviewForm } from "./_components/review-form";
import { Header } from "./_components/header";
import { Footer } from "./_components/footer";

// Types adapted
export interface MovieType {
  id: string;
  title: string;
  originalTitle?: string;
  slug: string;
  type: "movie" | "series";
  releaseDate?: string;
  year?: number;
  overview?: string;
  poster?: string;
  posterUrl?: string;
  backdrop?: string;
  backdropUrl?: string;
  rating: number;
  voteCount?: number;
  genres: string[];
  runtime?: number;
  tagline?: string;
  certification?: string;
  director?: string;
  creator?: string;
  writers?: string[];
  studio?: string;
  country?: string;
  language?: string;
  budget?: number;
  boxOffice?: number;
  seasons?: number;
  episodes?: number;
  streamingServices?: { name: string; logo: string }[];
  cast?: CastMember[];
  crew?: CrewMember[];
  reviews?: any[];
  criticReviews?: any[];
  positiveReviews?: number;
  negativeReviews?: number;
  images?: string[];
  similar?: RelatedItem[];
  trailerUrl?: string;
  popularity?: number;
}

interface MovieDetailsProps {
  details: MovieType;
}

export function MovieDetails({ details }: MovieDetailsProps) {
  const [showFullSynopsis, setShowFullSynopsis] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Ensure these properties exist with default values
  const totalRatings = details.voteCount || 0;
  const writers = details.writers || [];
  const studio = details.studio || "N/A";
  const country = details.country || "N/A";
  const language = details.language || "N/A";
  const budget = details.budget ? `$${details.budget.toLocaleString()}` : "N/A";
  const boxOffice = details.boxOffice
    ? `$${details.boxOffice.toLocaleString()}`
    : "N/A";
  const streamingServices = details.streamingServices || [];
  const reviews = details.reviews || [];
  const criticReviews = details.criticReviews || [];
  const positiveReviews = details.positiveReviews || 0;
  const negativeReviews = details.negativeReviews || 0;
  const images = details.images || [];
  const similar = details.similar || [];

  return (
    <div className="min-h-screen bg-black text-zinc-200 font-sans">
      {/* Background Gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-purple-900/20 to-black z-0" />

      {/* Hero Section */}
      <div className="relative w-full h-[70vh] z-10">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${details.backdrop || details.backdropUrl})`,
            filter: "brightness(0.3) blur(2px)",
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-transparent" />

        <Header />

        {/* Back Button */}
        <div className="absolute top-24 left-6 z-20">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="rounded-full bg-black/50 backdrop-blur-sm hover:bg-purple-600/30 border border-white/10"
          >
            <Link href="/teste3">
              <ArrowLeft className="h-5 w-5 text-white" />
              <span className="sr-only">Voltar</span>
            </Link>
          </Button>
        </div>

        {/* Main Content */}
        <div className="container relative h-full flex items-end pb-12 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-8 w-full">
            {/* Poster */}
            <div className="w-48 md:w-64 flex-shrink-0 transform hover:scale-105 transition-transform duration-300 hidden md:block">
              <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border-2 border-white/20">
                <Image
                  fill
                  src={
                    details.poster || details.posterUrl || "/placeholder.svg"
                  }
                  alt={details.title}
                  className="object-cover"
                />
              </div>
            </div>

            {/* Info Section */}
            <div className="flex-1 space-y-4">
              <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 backdrop-blur-md w-fit">
                {details.type === "movie" ? "Filme" : "Série"}
              </Badge>

              <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                {details.title}
              </h1>

              <p className="text-lg text-zinc-400 font-medium">
                {details.tagline}
              </p>

              {/* Stats Row */}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center bg-white/10 px-3 py-1 rounded-full">
                  <Star className="h-5 w-5 text-yellow-500 mr-1 fill-yellow-500" />
                  <span className="font-bold text-white">
                    {details.rating.toFixed(1)}
                  </span>
                  <span className="text-zinc-400 ml-1">/10</span>
                </div>

                {/* Other Stats */}
                {[
                  {
                    icon: <Clock className="h-4 w-4" />,
                    text: details.runtime ? `${details.runtime} min` : "N/A",
                    show: !!details.runtime,
                  },
                  {
                    icon: <Calendar className="h-4 w-4" />,
                    text: details.year,
                    show: !!details.year,
                  },
                  {
                    icon: <Film className="h-4 w-4" />,
                    text: details.certification,
                    show: !!details.certification,
                  },
                ]
                  .filter((item) => item.show)
                  .map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center text-zinc-400 bg-white/5 px-3 py-1 rounded-full"
                    >
                      {item.icon}
                      <span className="ml-1">{item.text}</span>
                    </div>
                  ))}
              </div>

              {/* Genres */}
              <div className="flex flex-wrap gap-2">
                {details.genres.map((genre, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="bg-white/10 text-white border-white/20 hover:bg-purple-600/30"
                  >
                    {genre}
                  </Badge>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-900/30 border-0">
                  <Star className="h-4 w-4 mr-2" /> Avaliar
                </Button>
                {["Trailer", "Watchlist", "Lista", "Compartilhar"].map(
                  (action, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30 backdrop-blur-sm text-white"
                    >
                      {index === 0 && <Play className="h-4 w-4 mr-2" />}
                      {index === 1 && <Bookmark className="h-4 w-4 mr-2" />}
                      {index === 2 && <ListPlus className="h-4 w-4 mr-2" />}
                      {index === 3 && <Share2 className="h-4 w-4 mr-2" />}
                      {action}
                    </Button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8 mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <Tabs
          defaultValue="overview"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <TabsList className="bg-white/5 border border-white/10 backdrop-blur-md rounded-lg p-1 h-auto flex-wrap">
            {["overview", "reviews", "cast", "media"].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="w-32 data-[state=active]:bg-purple-600/30 data-[state=active]:border-purple-500/50 data-[state=active]:text-white rounded-md transition-all text-zinc-400"
              >
                {
                  {
                    overview: "Visão Geral",
                    reviews: "Críticas",
                    cast: "Elenco",
                    media: "Mídia",
                  }[tab]
                }
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tabs Content */}
          <div className="mt-8 space-y-16">
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-12">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-12">
                  {/* Synopsis */}
                  <section className="bg-white/5 backdrop-blur-md p-8 rounded-xl border border-white/10">
                    <h2 className="text-2xl font-bold text-white mb-6">
                      Sinopse
                    </h2>
                    <div className="text-zinc-300 leading-relaxed space-y-4">
                      <p className={showFullSynopsis ? "" : "line-clamp-4"}>
                        {details.overview}
                      </p>
                      {details.overview && details.overview.length > 300 && (
                        <Button
                          variant="link"
                          className="text-purple-400 p-0 hover:text-purple-300"
                          onClick={() => setShowFullSynopsis(!showFullSynopsis)}
                        >
                          {showFullSynopsis ? "Mostrar menos" : "Mostrar mais"}
                        </Button>
                      )}
                    </div>
                  </section>

                  {/* Details Section */}
                  <section className="bg-white/5 backdrop-blur-md p-8 rounded-xl border border-white/10">
                    <h2 className="text-2xl font-bold text-white mb-6">
                      Detalhes
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-sm text-zinc-500 mb-1">
                          {details.type === "movie" ? "Direção" : "Criação"}
                        </h3>
                        <p className="text-white">
                          {details.director || details.creator || "N/A"}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm text-zinc-500 mb-1">Roteiro</h3>
                        <p className="text-white">
                          {writers.length > 0 ? writers.join(", ") : "N/A"}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm text-zinc-500 mb-1">Estúdio</h3>
                        <p className="text-white">{studio}</p>
                      </div>
                      <div>
                        <h3 className="text-sm text-zinc-500 mb-1">
                          Data de Lançamento
                        </h3>
                        <p className="text-white">
                          {details.releaseDate || "N/A"}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm text-zinc-500 mb-1">
                          País de Origem
                        </h3>
                        <p className="text-white">{country}</p>
                      </div>
                      <div>
                        <h3 className="text-sm text-zinc-500 mb-1">
                          Idioma Original
                        </h3>
                        <p className="text-white">{language}</p>
                      </div>
                      {details.type === "series" && (
                        <>
                          <div>
                            <h3 className="text-sm text-zinc-500 mb-1">
                              Temporadas
                            </h3>
                            <p className="text-white">
                              {details.seasons || "N/A"}
                            </p>
                          </div>
                          <div>
                            <h3 className="text-sm text-zinc-500 mb-1">
                              Episódios
                            </h3>
                            <p className="text-white">
                              {details.episodes || "N/A"}
                            </p>
                          </div>
                        </>
                      )}
                      {details.type === "movie" && (
                        <>
                          <div>
                            <h3 className="text-sm text-zinc-500 mb-1">
                              Orçamento
                            </h3>
                            <p className="text-white">{budget}</p>
                          </div>
                          <div>
                            <h3 className="text-sm text-zinc-500 mb-1">
                              Bilheteria
                            </h3>
                            <p className="text-white">{boxOffice}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </section>

                  {/* Cast Preview */}
                  {details.cast && details.cast.length > 0 && (
                    <section className="bg-white/5 backdrop-blur-md p-8 rounded-xl border border-white/10">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-white">
                          Elenco Principal
                        </h2>
                        <Button
                          variant="outline"
                          className="border-purple-500/50 text-purple-400 hover:text-white hover:bg-purple-600/20"
                          onClick={() => setActiveTab("cast")}
                        >
                          Ver Todos
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {details.cast.slice(0, 4).map((person, index) => (
                          <div key={index} className="group">
                            <div className="aspect-[2/3] overflow-hidden rounded-md mb-2 relative">
                              <Image
                                fill
                                src={
                                  person.profilePath ||
                                  person.profilePhoto ||
                                  "/placeholder.svg"
                                }
                                alt={person.name}
                                className="object-cover transition-transform group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            </div>
                            <h3 className="font-medium text-white text-sm">
                              {person.name}
                            </h3>
                            <p className="text-xs text-zinc-500">
                              {person.character}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>

                {/* Right Column */}
                <div className="space-y-8">
                  {/* Rating Card */}
                  <Card className="bg-white/5 backdrop-blur-md border border-white/10">
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold text-white mb-4">
                        Avaliações
                      </h3>
                      <div className="flex flex-col items-center justify-center py-4">
                        <div className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                          {details.rating.toFixed(1)}
                        </div>
                        <div className="text-sm text-zinc-400 mb-4">de 10</div>
                        <div className="flex items-center gap-1 mb-6">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-6 w-6 ${
                                star <= Math.round(details.rating / 2)
                                  ? "text-yellow-500 fill-yellow-500"
                                  : "text-zinc-600"
                              }`}
                            />
                          ))}
                        </div>
                        <Progress
                          value={details.rating * 10}
                          className="h-2 w-full bg-white/10 mb-4"
                        />
                        <div className="flex justify-between w-full text-sm">
                          <span className="text-zinc-500">
                            Total de avaliações
                          </span>
                          <span className="text-white font-medium">
                            {totalRatings.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Streaming Services */}
                  {streamingServices.length > 0 && (
                    <Card className="bg-white/5 backdrop-blur-md border border-white/10">
                      <CardContent className="p-6">
                        <h3 className="text-xl font-bold text-white mb-4">
                          Onde Assistir
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                          {streamingServices.map((service, index) => (
                            <div
                              key={index}
                              className="aspect-square bg-white/10 rounded-md flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer border border-white/10"
                            >
                              <div className="relative w-10 h-10 overflow-hidden">
                                <Image
                                  fill
                                  src={service.logo || "/placeholder.svg"}
                                  alt={service.name}
                                  className="object-contain"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              {/* Related Content */}
              {similar.length > 0 && (
                <RelatedContent
                  related={similar}
                  title="Conteúdo Relacionado"
                />
              )}
            </TabsContent>

            {/* Reviews Tab */}
            <TabsContent value="reviews" className="space-y-12">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <ReviewForm />
                  <div className="space-y-6">
                    {reviews.map((review, index) => (
                      <Card
                        key={index}
                        className="bg-white/5 backdrop-blur-md border border-white/10"
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <Avatar className="h-10 w-10">
                              <AvatarImage
                                src={review.user?.avatar || "/placeholder.svg"}
                                alt={review.user?.name}
                              />
                              <AvatarFallback>
                                {review.user?.name?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <div className="text-sm font-medium text-white">
                                    {review.user?.name || "Usuário Anônimo"}
                                  </div>
                                  <div className="text-xs text-zinc-500">
                                    {new Date(
                                      review.createdAt || review.updatedAt
                                    ).toLocaleDateString()}
                                  </div>
                                </div>
                                <div className="flex items-center bg-white/10 px-2 py-1 rounded-md">
                                  <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 mr-1" />
                                  <span className="text-sm font-bold text-white">
                                    {review.rating}
                                  </span>
                                </div>
                              </div>
                              <h3 className="text-lg font-medium text-white mb-2">
                                {review.title || "Sem título"}
                              </h3>
                              <p className="text-sm text-zinc-300 mb-4 leading-relaxed">
                                {review.content}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-zinc-500">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-zinc-400 hover:text-white"
                                >
                                  <ThumbsUp className="h-3.5 w-3.5 mr-1.5" />
                                  Útil ({review.likes || 0})
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-zinc-400 hover:text-white"
                                >
                                  <ThumbsDown className="h-3.5 w-3.5 mr-1.5" />
                                  Não útil (0)
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-zinc-400 hover:text-white"
                                >
                                  <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                                  Comentar ({review.comments || 0})
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
                <div className="space-y-8">
                  <Card className="bg-white/5 backdrop-blur-md border border-white/10">
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold text-white mb-4">
                        Críticas Profissionais
                      </h3>
                      <div className="space-y-4">
                        {criticReviews.map((review, index) => (
                          <div
                            key={index}
                            className="pb-4 border-b border-white/10 last:border-0"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium text-white">
                                {review.source}
                              </div>
                              <div className="flex items-center bg-white/10 px-2 py-1 rounded-md">
                                <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 mr-1" />
                                <span className="text-sm font-bold text-white">
                                  {review.score}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-zinc-400 italic">
                              &quot;{review.quote}&quot;
                            </p>
                            <div className="mt-2 text-xs text-zinc-500">
                              {review.author}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/5 backdrop-blur-md border border-white/10">
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold text-white mb-4">
                        Estatísticas
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-500">Nota média</span>
                          <div className="flex items-center">
                            <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 mr-1" />
                            <span className="text-white font-medium">
                              {details.rating.toFixed(1)}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-500">
                            Total de críticas
                          </span>
                          <span className="text-white font-medium">
                            {reviews.length}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-500">
                            Críticas positivas
                          </span>
                          <span className="text-white font-medium">
                            {positiveReviews}%
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-500">
                            Críticas negativas
                          </span>
                          <span className="text-white font-medium">
                            {typeof negativeReviews === "number"
                              ? negativeReviews
                              : 0}
                            %
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Cast Tab */}
            <TabsContent value="cast">
              <CastSection
                cast={details.cast || []}
                crew={details.crew || []}
                type={details.type}
              />
            </TabsContent>

            {/* Media Tab */}
            <TabsContent value="media" className="space-y-12">
              <div className="space-y-8">
                {details.trailerUrl && (
                  <div className="bg-white/5 backdrop-blur-md p-8 rounded-xl border border-white/10">
                    <h2 className="text-2xl font-bold text-white mb-6">
                      Trailer
                    </h2>
                    <div className="aspect-video bg-white/5 rounded-lg overflow-hidden">
                      <iframe
                        width="100%"
                        height="100%"
                        src={details.trailerUrl.replace("watch?v=", "embed/")}
                        title={`${details.title} Trailer`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    </div>
                  </div>
                )}

                {images.length > 0 && (
                  <div className="bg-white/5 backdrop-blur-md p-8 rounded-xl border border-white/10">
                    <h2 className="text-2xl font-bold text-white mb-6">
                      Galeria
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {images.map((image, index) => (
                        <div
                          key={index}
                          className="aspect-video rounded-lg overflow-hidden group relative"
                        >
                          <Image
                            fill
                            src={image || "/placeholder.svg"}
                            alt={`${details.title} - Imagem ${index + 1}`}
                            className="object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button variant="ghost" size="icon">
                              <ChevronRight className="h-6 w-6 text-white" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}
