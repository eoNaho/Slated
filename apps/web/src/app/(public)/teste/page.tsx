"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Star,
  Eye,
  Heart,
  MessageSquare,
  Menu,
  X,
  User,
  Activity,
  List,
  Film,
  Calendar,
  Clock,
  Globe,
  DollarSign,
  Play,
  Share2,
  MoreHorizontal,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Enhanced Mock Data
const MOCK_MOVIES = [
  {
    id: 1,
    title: "Stellar Horizon",
    tagline: "Beyond the edge of time.",
    rating: 4.5,
    year: 2024,
    director: "Christopher Nolan-esque",
    duration: "2h 45m",
    genre: ["Sci-Fi", "Drama", "Adventure"],
    image: "https://placehold.co/600x900/1a1f26/FFF?text=Stellar+Horizon",
    backdrop: "https://placehold.co/1920x1080/1a1f26/555?text=Stellar+Backdrop",
    studio: "Nebula Studios",
    budget: "$180M",
    language: "English",
    reviews: 1204,
    likes: 8432,
    author: "Alex Reeds",
    authorImg: "https://placehold.co/50x50/445566/FFF?text=A",
    excerpt: "A visual masterpiece that bends time and space.",
    fullReview:
      "Stellar Horizon represents a bold step forward in science fiction storytelling. The visual effects are nothing short of revolutionary, creating a universe that feels lived-in and ancient. While the character development for the protagonist is deep and engaging, some supporting characters feel like mere plot devices. The sound design deserves a special mention—it shakes the floorboards. Ultimately, it is a must-watch for genre fans, even if it doesn't quite stick the landing on its philosophical themes.",
    cast: [
      { name: "Jessica Chastainy", role: "Cmdr. Lewis" },
      { name: "Matthew McC", role: "Cooper" },
      { name: "Anne Hat", role: "Dr. Brand" },
      { name: "Michael Caine-ish", role: "Prof. Brand" },
    ],
  },
  {
    id: 2,
    title: "The Last Detective",
    tagline: "Truth dies in the rain.",
    rating: 3.8,
    year: 2023,
    director: "Jane Doe",
    duration: "1h 58m",
    genre: ["Noir", "Mystery", "Crime"],
    image: "https://placehold.co/600x900/1f2937/FFF?text=The+Last+Detective",
    backdrop: "https://placehold.co/1920x1080/1f2937/444?text=Noir+City",
    studio: "Shadow Play",
    budget: "$40M",
    language: "English",
    reviews: 892,
    likes: 4100,
    author: "Sarah Jenks",
    authorImg: "https://placehold.co/50x50/556677/FFF?text=S",
    excerpt: "Gritty, dark, and atmospherically dense.",
    fullReview:
      "In 'The Last Detective', rain is practically a main character. The cinematography is stunning, utilizing neon lights reflecting off puddles to create a suffocatingly beautiful atmosphere. The mystery itself is solid, though seasoned sleuths might guess the twist early.",
    cast: [
      { name: "Robert P", role: "Detective" },
      { name: "Ana de A", role: "Femme Fatale" },
    ],
  },
  {
    id: 3,
    title: "Summer in Tuscany",
    tagline: "Love is the best ingredient.",
    rating: 2.8,
    year: 2024,
    director: "Marco Polo",
    duration: "1h 42m",
    genre: ["Romance", "Comedy"],
    image: "https://placehold.co/600x900/374151/FFF?text=Summer",
    backdrop: "https://placehold.co/1920x1080/374151/666?text=Tuscany",
    studio: "Sunny Pic",
    budget: "$15M",
    language: "Italian/English",
    reviews: 120,
    likes: 450,
    author: "Tom Critic",
    authorImg: "https://placehold.co/50x50/667788/FFF?text=T",
    excerpt: "Beautiful scenery can't quite save a predictable plot.",
    fullReview:
      "It is hard to make a bad movie when you are filming in Tuscany, but this film tests that theory. While the food looks delicious and the sunsets are golden, the dialogue is wooden and the conflict feels forced.",
    cast: [
      { name: "Diane L", role: "Frances" },
      { name: "Raoul B", role: "Marcello" },
    ],
  },
  {
    id: 4,
    title: "Cyber Rush 2099",
    tagline: "Run or be deleted.",
    rating: 4.2,
    year: 2024,
    director: "Wachowski Inspired",
    duration: "2h 10m",
    genre: ["Action", "Sci-Fi"],
    image: "https://placehold.co/600x900/111827/FFF?text=Cyber+Rush",
    backdrop: "https://placehold.co/1920x1080/111827/444?text=Cyberpunk+City",
    studio: "Neo Visions",
    budget: "$200M",
    language: "English",
    reviews: 3400,
    likes: 12000,
    author: "Jenna",
    authorImg: "https://placehold.co/50x50/778899/FFF?text=J",
    excerpt: "Adrenaline from start to finish.",
    fullReview:
      "Cyber Rush 2099 does not let you breathe. From the opening chase sequence to the final showdown atop a floating city, the pacing is relentless.",
    cast: [
      { name: "Keanu R", role: "Neo 2.0" },
      { name: "Carrie-Anne M", role: "Trinity 2.0" },
    ],
  },
];

// Utility to render green stars
const StarRating = ({ rating, size = 14 }: { rating: number; size?: number }) => {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={`${
            star <= Math.round(rating)
              ? "fill-green-500 text-green-500"
              : "fill-gray-700 text-gray-700"
          }`}
        />
      ))}
    </div>
  );
};

interface CastMember {
  name: string;
  role: string;
}

interface Movie {
  id: number;
  title: string;
  tagline: string;
  rating: number;
  year: number;
  director: string;
  duration: string;
  genre: string[];
  image: string;
  backdrop: string;
  studio: string;
  budget: string;
  language: string;
  reviews: number;
  likes: number;
  author: string;
  authorImg: string;
  excerpt: string;
  fullReview: string;
  cast: CastMember[];
}

export default function MovieReviewApp() {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll for navbar transparency effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleMovieClick = (movie: Movie) => {
    setSelectedMovie(movie);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  return (
    <div className="min-h-screen bg-[#14181c] text-[#99aabb] font-sans selection:bg-green-500 selection:text-white overflow-x-hidden">
      {/* Navbar */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          scrolled || selectedMovie
            ? "bg-[#14181c]/90 backdrop-blur-md border-b border-gray-800"
            : "bg-transparent bg-gradient-to-b from-black/60 to-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div
              className="flex items-center gap-2 cursor-pointer group"
              onClick={() => setSelectedMovie(null)}
            >
              <div className="bg-white p-1 rounded-sm shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                <Film className="text-[#14181c] h-5 w-5" />
              </div>
              <span className="font-bold tracking-tight text-lg text-white group-hover:text-green-500 transition-colors">
                CINELOG
              </span>
            </div>

            <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-gray-300">
              {["FILMS", "LISTS", "MEMBERS", "JOURNAL"].map((item) => (
                <a
                  key={item}
                  href="#"
                  className="hover:text-white text-xs tracking-widest transition-colors"
                >
                  {item}
                </a>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block group">
              <input
                type="text"
                placeholder="Search..."
                className="bg-[#2c3440]/50 border border-transparent focus:border-gray-600 rounded-full px-4 py-1.5 text-sm text-white focus:ring-0 focus:bg-[#2c3440] w-64 transition-all placeholder-gray-500"
              />
              <Search className="absolute right-3 top-2 h-4 w-4 text-gray-500 group-focus-within:text-white transition-colors" />
            </div>
            <button className="text-xs font-bold text-white uppercase hover:text-green-500 hidden sm:block tracking-wider">
              Log In
            </button>
            <button className="bg-green-600 hover:bg-green-500 hover:scale-105 active:scale-95 text-white text-xs font-bold uppercase px-4 py-1.5 rounded-sm transition-all shadow-[0_0_15px_rgba(22,163,74,0.4)]">
              + Log Film
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-gray-300 hover:text-white"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        {selectedMovie ? (
          <motion.div
            key="movie-detail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full pb-20"
          >
            {/* HER0 SECTION */}
            <div className="relative w-full h-[85vh] md:h-[90vh] overflow-hidden">
              {/* Backdrop Image */}
              <motion.img
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ duration: 10, ease: "linear" }}
                src={selectedMovie.backdrop}
                alt={selectedMovie.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Gradients */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#14181c] via-[#14181c]/60 to-transparent"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-[#14181c] via-transparent to-transparent opacity-80"></div>

              {/* Hero Content */}
              <div className="absolute bottom-0 left-0 w-full px-4 md:px-12 pb-12 md:pb-20 max-w-7xl mx-auto flex flex-col md:flex-row items-end gap-8 md:gap-12">
                {/* Poster - Floating */}
                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  className="hidden md:block shrink-0 relative group"
                >
                  <img
                    src={selectedMovie.image}
                    alt={selectedMovie.title}
                    className="w-56 rounded-md shadow-2xl border border-white/10 group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-white text-xs font-bold flex items-center gap-1">
                    <Star size={12} className="fill-green-500 text-green-500" />{" "}
                    {selectedMovie.rating}
                  </div>
                </motion.div>

                {/* Text Info */}
                <div className="flex-1 space-y-4 mb-2">
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center gap-3 text-sm text-green-400 font-bold tracking-widest uppercase"
                  >
                    <span className="bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                      {selectedMovie.year}
                    </span>
                    <span>{selectedMovie.director}</span>
                    <span className="text-gray-500">•</span>
                    <span>{selectedMovie.duration}</span>
                  </motion.div>

                  <motion.h1
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-4xl md:text-7xl font-serif font-bold text-white leading-tight drop-shadow-xl"
                  >
                    {selectedMovie.title}
                  </motion.h1>

                  <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-lg md:text-2xl text-gray-300 font-light italic max-w-2xl"
                  >
                    "{selectedMovie.tagline}"
                  </motion.p>

                  {/* Action Buttons */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-wrap items-center gap-4 pt-4"
                  >
                    <button className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded font-bold uppercase tracking-wide transition-all hover:shadow-[0_0_20px_rgba(22,163,74,0.4)]">
                      <Play size={20} className="fill-white" /> Trailer
                    </button>
                    <div className="flex items-center bg-[#2c3440] rounded border border-gray-700 divide-x divide-gray-700">
                      <button
                        className="p-3 hover:bg-[#384250] text-gray-300 hover:text-white transition-colors tooltip"
                        title="Mark as Watched"
                      >
                        <Eye size={20} />
                      </button>
                      <button
                        className="p-3 hover:bg-[#384250] text-gray-300 hover:text-pink-500 transition-colors"
                        title="Like"
                      >
                        <Heart size={20} />
                      </button>
                      <button
                        className="p-3 hover:bg-[#384250] text-gray-300 hover:text-blue-400 transition-colors"
                        title="Add to List"
                      >
                        <List size={20} />
                      </button>
                      <button
                        className="p-3 hover:bg-[#384250] text-gray-300 hover:text-white transition-colors"
                        title="Share"
                      >
                        <Share2 size={20} />
                      </button>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* CONTENT GRID */}
            <div className="max-w-7xl mx-auto px-4 md:px-12 -mt-10 relative z-10 grid grid-cols-1 md:grid-cols-12 gap-12">
              {/* Left Column (Main Info) */}
              <div className="md:col-span-8 space-y-12">
                {/* Synopsis & Review */}
                <div className="bg-[#1c2229] border border-gray-800 rounded-lg p-8 shadow-2xl">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 p-[2px]">
                      <img
                        src={selectedMovie.authorImg}
                        className="w-full h-full rounded-full border-2 border-[#1c2229]"
                      />
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="flex justify-between items-baseline border-b border-gray-800 pb-4">
                        <div>
                          <h3 className="text-white font-bold text-lg">
                            Review by {selectedMovie.author}
                          </h3>
                          <StarRating rating={selectedMovie.rating} />
                        </div>
                        <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">
                          Top Critic
                        </span>
                      </div>
                      <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed font-serif text-lg">
                        <p>{selectedMovie.fullReview}</p>
                      </div>
                      <div className="flex items-center gap-6 pt-4 text-sm text-gray-500 font-medium">
                        <span className="flex items-center gap-1.5 hover:text-white cursor-pointer transition-colors">
                          <Heart size={16} className="text-pink-500" />{" "}
                          {selectedMovie.likes} Likes
                        </span>
                        <span className="flex items-center gap-1.5 hover:text-white cursor-pointer transition-colors">
                          <MessageSquare size={16} className="text-blue-500" />{" "}
                          24 Comments
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cast Section */}
                <div>
                  <h3 className="text-white font-bold text-xl mb-6 flex items-center gap-2">
                    <User className="text-green-500" /> Top Cast
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {selectedMovie.cast.map((actor, idx) => (
                      <div
                        key={idx}
                        className="bg-[#2c3440]/50 p-3 rounded flex items-center gap-3 hover:bg-[#2c3440] transition-colors cursor-pointer group"
                      >
                        <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-white group-hover:scale-110 transition-transform">
                          {actor.name.charAt(0)}
                        </div>
                        <div className="overflow-hidden">
                          <div className="text-white text-sm font-bold truncate group-hover:text-green-400 transition-colors">
                            {actor.name}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {actor.role}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Ratings Mock */}
                <div>
                  <h3 className="text-white font-bold text-xl mb-6 flex items-center gap-2">
                    <Activity className="text-green-500" /> Recent Activity
                  </h3>
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 py-3 border-b border-gray-800 last:border-0"
                      >
                        <div className="w-6 h-6 rounded-full bg-gray-600"></div>
                        <span className="text-sm font-bold text-white hover:text-blue-400 cursor-pointer">
                          User_{i}99
                        </span>
                        <span className="text-sm text-gray-500">watched</span>
                        <StarRating rating={4} size={10} />
                        <span className="ml-auto text-xs text-gray-600">
                          2 mins ago
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column (Stat Bar) */}
              <div className="md:col-span-4 space-y-8">
                {/* Stats Card */}
                <div className="bg-[#1c2229] border border-gray-800 rounded-lg p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 font-bold uppercase tracking-wider">
                      Rating
                    </span>
                    <div className="flex items-center gap-2">
                      <Star
                        size={20}
                        className="fill-green-500 text-green-500"
                      />
                      <span className="text-2xl text-white font-serif">
                        {selectedMovie.rating}
                      </span>
                      <span className="text-gray-600 text-sm">/ 5.0</span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-gray-800">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-2">
                        <DollarSign size={14} /> Budget
                      </span>
                      <span className="text-white font-mono">
                        {selectedMovie.budget}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-2">
                        <Globe size={14} /> Language
                      </span>
                      <span className="text-white">
                        {selectedMovie.language}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-2">
                        <Clock size={14} /> Runtime
                      </span>
                      <span className="text-white">
                        {selectedMovie.duration}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">
                      Genres
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedMovie.genre.map((g) => (
                        <span
                          key={g}
                          className="px-2 py-1 bg-[#2c3440] text-gray-300 text-xs rounded hover:text-white hover:bg-green-600 transition-colors cursor-pointer"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Where to Watch */}
                <div className="bg-[#1c2229] border border-gray-800 rounded-lg p-6">
                  <h4 className="text-white font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                    Where to Watch
                  </h4>
                  <div className="space-y-2">
                    <a
                      href="#"
                      className="flex items-center justify-between p-3 bg-[#242c36] rounded hover:bg-[#2c3440] transition-colors group"
                    >
                      <span className="text-gray-300 group-hover:text-white text-sm">
                        Stream
                      </span>
                      <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                        Prime
                      </span>
                    </a>
                    <a
                      href="#"
                      className="flex items-center justify-between p-3 bg-[#242c36] rounded hover:bg-[#2c3440] transition-colors group"
                    >
                      <span className="text-gray-300 group-hover:text-white text-sm">
                        Rent
                      </span>
                      <span className="text-xs bg-black text-white px-2 py-0.5 rounded border border-gray-700">
                        Apple TV
                      </span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* SIMILAR MOVIES SECTION */}
            <div className="max-w-7xl mx-auto px-4 md:px-12 mt-16 relative z-10">
              <h3 className="text-white font-bold text-xl mb-6 flex items-center gap-2 border-b border-gray-800 pb-4">
                <Film className="text-green-500" /> You Might Also Like
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {MOCK_MOVIES.slice(0, 5).map((movie, idx) => (
                  <div
                    key={"sim-" + movie.id}
                    onClick={() => handleMovieClick(movie)}
                    className="bg-[#1c2229] rounded-lg overflow-hidden group cursor-pointer hover:-translate-y-1 transition-transform duration-300"
                  >
                    <div className="relative aspect-[2/3] overflow-hidden">
                      <img
                        src={movie.image}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                    </div>
                    <div className="p-3">
                      <h4 className="text-white text-sm font-bold truncate group-hover:text-green-500 transition-colors">
                        {movie.title}
                      </h4>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-gray-500">
                          {movie.year}
                        </span>
                        <StarRating rating={movie.rating} size={10} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.main
            key="home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="max-w-7xl mx-auto px-4 md:px-8 py-24"
          >
            {/* Intro Hero */}
            <div className="text-center max-w-3xl mx-auto mb-20 space-y-6">
              <motion.h1
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-4xl md:text-6xl font-bold text-white tracking-tighter"
              >
                Track films you've watched.
              </motion.h1>
              <p className="text-xl text-[#667788] font-serif">
                Save those you want to see. Tell your friends what's good.
              </p>
              <button className="bg-[#00e054] hover:bg-[#00c048] text-[#14181c] font-black py-3 px-8 rounded uppercase tracking-widest text-sm transition-transform hover:scale-105 shadow-[0_0_20px_rgba(0,224,84,0.4)]">
                Get Started — It's Free
              </button>
            </div>

            {/* Section Title */}
            <div className="flex justify-between items-end mb-6 border-b border-gray-800 pb-2">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                Popular Reviews This Week
              </h3>
              <div className="flex gap-2">
                <button className="text-gray-500 hover:text-white transition-colors">
                  <ArrowLeft size={16} />
                </button>
                <button className="text-gray-500 hover:text-white transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {MOCK_MOVIES.map((movie, index) => (
                <motion.div
                  key={movie.id}
                  layoutId={`movie-${movie.id}`}
                  onClick={() => handleMovieClick(movie)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-[#202830] rounded-xl overflow-hidden hover:bg-[#242c36] transition-colors cursor-pointer group shadow-lg border border-transparent hover:border-gray-700"
                >
                  <div className="flex h-full">
                    <div className="w-1/3 relative overflow-hidden">
                      <img
                        src={movie.image}
                        alt={movie.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute top-2 left-2 bg-black/70 px-1.5 py-0.5 rounded text-[10px] font-bold text-white border border-white/20">
                        {movie.year}
                      </div>
                    </div>
                    <div className="w-2/3 p-5 flex flex-col relative">
                      <div className="flex-1">
                        <h4 className="text-white font-bold text-lg mb-1 line-clamp-1 group-hover:text-green-500 transition-colors">
                          {movie.title}
                        </h4>
                        <div className="flex items-center gap-2 mb-3">
                          <StarRating rating={movie.rating} size={12} />
                          <span className="text-xs text-gray-500">
                            by {movie.author}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 font-serif leading-relaxed line-clamp-3 mb-4">
                          {movie.excerpt}
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-gray-700/50 mt-auto">
                        <div className="flex gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1 group-hover:text-pink-500 transition-colors">
                            <Heart size={12} /> {movie.likes}
                          </span>
                          <span className="flex items-center gap-1 group-hover:text-blue-500 transition-colors">
                            <MessageSquare size={12} /> {movie.reviews}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.main>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-[#14181c] py-12 text-center text-xs text-gray-600 border-t border-gray-800">
        <div className="flex justify-center gap-8 mb-6 font-bold text-gray-400 uppercase tracking-wider">
          <a href="#" className="hover:text-white transition-colors">
            About
          </a>
          <a href="#" className="hover:text-white transition-colors">
            News
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Pro
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Apps
          </a>
        </div>
        <p className="font-serif">© 2024 Cinelog Limited. Made by film fans.</p>
      </footer>
    </div>
  );
}
