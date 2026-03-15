"use client";
/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Settings,
  Clock,
  Battery,
  Wifi,
  Gamepad2,
  Play,
  ArrowLeft,
  Library,
  Activity,
  Award,
} from "lucide-react";

// --- TIPAGENS ---
interface System {
  id: string;
  name: string;
  icon: React.ElementType;
  color?: string;
  bg?: string;
}

interface Game {
  id: string;
  title: string;
  system: string;
  developer: string;
  year: string;
  description: string;
  cover: string;
  bg: string;
  color: string;
  playtime: number;
  lastPlayed: string;
  achievements: number;
  totalAchievements: number;
}

// --- MOCK DATA EXPANDIDO ---
const SYSTEMS: System[] = [
  { id: "all", name: "Todos os Jogos", icon: Library },
  {
    id: "snes",
    name: "Super Nintendo",
    icon: Gamepad2,
    color: "text-purple-500",
    bg: "bg-purple-500/20",
  },
  {
    id: "ps1",
    name: "PlayStation",
    icon: Gamepad2,
    color: "text-gray-400",
    bg: "bg-gray-400/20",
  },
  {
    id: "gba",
    name: "Game Boy Advance",
    icon: Gamepad2,
    color: "text-indigo-400",
    bg: "bg-indigo-400/20",
  },
  {
    id: "genesis",
    name: "Sega Genesis",
    icon: Gamepad2,
    color: "text-red-500",
    bg: "bg-red-500/20",
  },
];

const GAMES: Game[] = [
  {
    id: "1",
    title: "Super Mario World",
    system: "snes",
    developer: "Nintendo",
    year: "1990",
    description:
      "Acompanhe Mario e Luigi em uma aventura na Dinosaur Land para salvar a Princesa Toadstool do malvado Bowser.",
    cover:
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&h=800&fit=crop",
    bg: "https://images.unsplash.com/photo-1612404730960-5c71577fca11?w=1920&h=1080&fit=crop",
    color: "from-blue-600 to-blue-900",
    playtime: 45.5,
    lastPlayed: "2023-10-15",
    achievements: 12,
    totalAchievements: 24,
  },
  {
    id: "2",
    title: "Final Fantasy VII",
    system: "ps1",
    developer: "Square",
    year: "1997",
    description:
      "Um mercenário ex-Soldier se junta a um grupo ecoterrorista para impedir que uma megacorporação drene a vida do planeta.",
    cover:
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&h=800&fit=crop",
    bg: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1920&h=1080&fit=crop",
    color: "from-emerald-600 to-emerald-900",
    playtime: 120.2,
    lastPlayed: "2023-11-02",
    achievements: 45,
    totalAchievements: 50,
  },
  {
    id: "3",
    title: "Chrono Trigger",
    system: "snes",
    developer: "Square",
    year: "1995",
    description:
      "Uma jornada épica através do tempo para salvar o mundo de um futuro apocalíptico causado pela entidade Lavos.",
    cover:
      "https://images.unsplash.com/photo-1580234811497-9df7fd2f357e?w=600&h=800&fit=crop",
    bg: "https://images.unsplash.com/photo-1506452819137-0422416856b8?w=1920&h=1080&fit=crop",
    color: "from-orange-500 to-orange-800",
    playtime: 65.0,
    lastPlayed: "2023-09-20",
    achievements: 18,
    totalAchievements: 18,
  },
  {
    id: "4",
    title: "Pokémon Emerald",
    system: "gba",
    developer: "Game Freak",
    year: "2004",
    description:
      "Explore a região de Hoenn, capture novos Pokémon e impeça os planos das equipes Magma e Aqua.",
    cover:
      "https://images.unsplash.com/photo-1613771404721-1f92d799e49f?w=600&h=800&fit=crop",
    bg: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=1920&h=1080&fit=crop",
    color: "from-green-500 to-green-800",
    playtime: 210.5,
    lastPlayed: "2023-11-10",
    achievements: 0,
    totalAchievements: 0,
  },
  {
    id: "5",
    title: "Sonic the Hedgehog",
    system: "genesis",
    developer: "Sega",
    year: "1991",
    description:
      "Corra na velocidade do som, colete anéis e derrote o Dr. Robotnik neste clássico de plataforma.",
    cover:
      "https://images.unsplash.com/photo-1605901309584-818e25960b8f?w=600&h=800&fit=crop",
    bg: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=1920&h=1080&fit=crop",
    color: "from-blue-500 to-blue-800",
    playtime: 12.3,
    lastPlayed: "2023-08-05",
    achievements: 5,
    totalAchievements: 10,
  },
  {
    id: "6",
    title: "Castlevania: SOTN",
    system: "ps1",
    developer: "Konami",
    year: "1997",
    description:
      "Explore o castelo do Drácula como Alucard neste jogo que definiu o gênero Metroidvania.",
    cover:
      "https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=600&h=800&fit=crop",
    bg: "https://images.unsplash.com/photo-1505635552518-3448ff116af3?w=1920&h=1080&fit=crop",
    color: "from-purple-600 to-purple-900",
    playtime: 32.8,
    lastPlayed: "2023-10-30",
    achievements: 22,
    totalAchievements: 35,
  },
];

// --- HOOK DE GAMEPAD E TECLADO ---
function useInput(callback: (action: string) => void) {
  useEffect(() => {
    let lastTime = 0;
    const cooldown = 150; // Previne inputs muito rápidos do analógico

    // 1. Teclado
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMap: Record<string, string> = {
        ArrowUp: "UP",
        ArrowDown: "DOWN",
        ArrowLeft: "LEFT",
        ArrowRight: "RIGHT",
        Enter: "A",
        Escape: "B",
        Backspace: "B",
      };
      if (keyMap[e.key]) {
        e.preventDefault();
        callback(keyMap[e.key]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // 2. Gamepad API
    let rAF: number;
    const pollGamepads = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gamepads[0];

      if (gp) {
        const now = Date.now();
        if (now - lastTime > cooldown) {
          let input: string | null = null;

          // D-PAD & Analógico Esquerdo
          if (gp.buttons[12]?.pressed || gp.axes[1] < -0.5) input = "UP";
          if (gp.buttons[13]?.pressed || gp.axes[1] > 0.5) input = "DOWN";
          if (gp.buttons[14]?.pressed || gp.axes[0] < -0.5) input = "LEFT";
          if (gp.buttons[15]?.pressed || gp.axes[0] > 0.5) input = "RIGHT";

          // Botões de Ação
          if (gp.buttons[0]?.pressed) input = "A"; // Botão Sul (A / Cross)
          if (gp.buttons[1]?.pressed) input = "B"; // Botão Leste (B / Circle)

          if (input) {
            callback(input);
            lastTime = now;
          }
        }
      }
      rAF = requestAnimationFrame(pollGamepads);
    };
    rAF = requestAnimationFrame(pollGamepads);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      cancelAnimationFrame(rAF);
    };
  }, [callback]);
}

export default function RetroStationPremium() {
  const [currentTime, setCurrentTime] = useState(new Date());

  // MOTOR DE NAVEGAÇÃO ESPACIAL
  const [currentView, setCurrentView] = useState("library");
  const [navSection, setNavSection] = useState("games"); // 'menu', 'systems', 'games', 'details-actions'
  const [navIndex, setNavIndex] = useState(0);

  // ESTADOS GERAIS
  const [activeSystem, setActiveSystem] = useState("all");
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  const carouselRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);

  // Atualiza relógio
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const filteredGames =
    activeSystem === "all"
      ? GAMES
      : GAMES.filter((g) => g.system === activeSystem);

  const focusedGame =
    navSection === "games" || currentView === "details"
      ? filteredGames[navIndex] || filteredGames[0]
      : filteredGames[0]; // Mantém um fallback seguro

  // --- AUTO-SCROLL DA TELA PARA O ELEMENTO FOCADO ---
  useEffect(() => {
    if (navSection === "games" && currentView === "library") {
      const el = itemsRef.current[navIndex];
      if (el) {
        el.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [navIndex, navSection, currentView]);

  // --- PROCESSADOR DE INPUTS (CONTROLE / TECLADO) ---
  const handleInput = useCallback(
    (action: string) => {
      if (currentView === "playing") {
        if (action === "B" || action === "A") {
          setCurrentView("details");
          setNavSection("details-actions");
          setNavIndex(0);
        }
        return;
      }

      if (currentView === "library") {
        if (navSection === "games") {
          if (action === "RIGHT")
            setNavIndex((prev) => Math.min(prev + 1, filteredGames.length - 1));
          if (action === "LEFT")
            setNavIndex((prev) => Math.max(prev - 0, 0) - (prev > 0 ? 1 : 0));
          if (action === "UP") {
            setNavSection("systems");
            setNavIndex(SYSTEMS.findIndex((s) => s.id === activeSystem));
          }
          if (action === "A") {
            setSelectedGame(filteredGames[navIndex]);
            setCurrentView("details");
            setNavSection("details-actions");
            setNavIndex(0);
          }
        } else if (navSection === "systems") {
          if (action === "RIGHT")
            setNavIndex((prev) => Math.min(prev + 1, SYSTEMS.length - 1));
          if (action === "LEFT") setNavIndex((prev) => Math.max(prev - 1, 0));
          if (action === "DOWN") {
            setNavSection("games");
            setNavIndex(0);
          }
          if (action === "UP") {
            setNavSection("menu");
            setNavIndex(0);
          }
          if (action === "A") {
            setActiveSystem(SYSTEMS[navIndex].id);
            setNavSection("games");
            setNavIndex(0);
          }
        } else if (navSection === "menu") {
          if (action === "RIGHT") setNavIndex((prev) => Math.min(prev + 1, 2));
          if (action === "LEFT") setNavIndex((prev) => Math.max(prev - 1, 0));
          if (action === "DOWN") {
            setNavSection("systems");
            setNavIndex(SYSTEMS.findIndex((s) => s.id === activeSystem));
          }
          if (action === "A") {
            if (navIndex === 0) {
              setCurrentView("library");
              setNavSection("games");
              setNavIndex(0);
            }
            if (navIndex === 1) setCurrentView("analytics");
            if (navIndex === 2) setCurrentView("settings");
          }
        }
      } else if (currentView === "details") {
        if (navSection === "details-actions") {
          if (action === "RIGHT") setNavIndex(1); // 0: Play, 1: Back
          if (action === "LEFT") setNavIndex(0);
          if (action === "A") {
            if (navIndex === 0) setCurrentView("playing");
            if (navIndex === 1) {
              setSelectedGame(null);
              setCurrentView("library");
              setNavSection("games");
              setNavIndex(
                filteredGames.findIndex(
                  (g) => selectedGame && g.id === selectedGame.id,
                ),
              );
            }
          }
          if (action === "B") {
            setSelectedGame(null);
            setCurrentView("library");
            setNavSection("games");
            setNavIndex(
              filteredGames.findIndex(
                (g) => selectedGame && g.id === selectedGame.id,
              ),
            );
          }
        }
      } else if (currentView === "analytics" || currentView === "settings") {
        if (action === "B") {
          setCurrentView("library");
          setNavSection("menu");
        }
      }
    },
    [
      currentView,
      navSection,
      navIndex,
      filteredGames,
      activeSystem,
      selectedGame,
    ],
  );

  useInput(handleInput);

  // --- COMPONENTES DA INTERFACE ---

  const renderTopBar = () => (
    <header className="flex justify-between items-center px-10 py-8 relative z-20">
      <div className="flex items-center gap-4">
        <div className="relative w-14 h-14 rounded-full bg-slate-800 border-2 border-slate-600 overflow-hidden shadow-lg">
          <img
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Retro&backgroundColor=1e293b"
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h2 className="font-bold text-xl leading-tight text-white tracking-wide">
            PlayerOne
          </h2>
          <span className="text-sm text-blue-400 font-semibold bg-blue-500/10 px-2 py-0.5 rounded">
            Nvl 42
          </span>
        </div>
      </div>

      <nav className="flex items-center gap-2 bg-black/40 p-1.5 rounded-full backdrop-blur-md border border-white/5">
        {["Biblioteca", "Analytics", "Configurações"].map((item, idx) => {
          const isFocused = navSection === "menu" && navIndex === idx;
          const isActive =
            (idx === 0 && currentView === "library") ||
            (idx === 1 && currentView === "analytics") ||
            (idx === 2 && currentView === "settings");
          return (
            <div
              key={item}
              className={`px-6 py-2.5 rounded-full font-medium transition-all flex items-center gap-2 
              ${
                isFocused
                  ? "bg-white text-black scale-105 shadow-[0_0_20px_rgba(255,255,255,0.5)]"
                  : isActive
                    ? "bg-white/20 text-white"
                    : "text-slate-400"
              }`}
            >
              {idx === 0 && <Library className="w-4 h-4" />}
              {idx === 1 && <Activity className="w-4 h-4" />}
              {idx === 2 && <Settings className="w-4 h-4" />}
              {item}
            </div>
          );
        })}
      </nav>

      <div className="flex items-center gap-4 bg-black/40 px-5 py-2.5 rounded-full backdrop-blur-md border border-white/5">
        <Wifi className="w-5 h-5 text-slate-300" />
        <Battery className="w-5 h-5 text-green-400" />
        <span className="font-bold text-lg tracking-wider text-white">
          {currentTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </header>
  );

  const renderLibrary = () => (
    <main className="flex-1 flex flex-col justify-end pb-12 relative z-10">
      {/* INFO DO JOGO FOCADO */}
      <div className="px-14 mb-10 transition-all duration-500 transform">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-md text-xs font-bold tracking-widest uppercase text-blue-300 border border-white/10 shadow-lg">
            {SYSTEMS.find((s) => s.id === focusedGame.system)?.name}
          </span>
          <span className="text-slate-300 text-sm font-medium bg-black/30 px-3 py-1 rounded-md backdrop-blur-sm">
            {focusedGame.year} • {focusedGame.developer}
          </span>
        </div>

        <h1 className="text-7xl font-black mb-4 drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)] max-w-4xl leading-tight text-white tracking-tight transition-all">
          {focusedGame.title}
        </h1>

        <p className="text-xl text-slate-200 max-w-2xl line-clamp-2 drop-shadow-xl mb-8 font-medium bg-black/30 p-4 rounded-xl backdrop-blur-md border-l-4 border-blue-500">
          {focusedGame.description}
        </p>
      </div>

      <div className="px-14 flex flex-col gap-6">
        {/* FILTROS (SYSTEMS) */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {SYSTEMS.map((sys, idx) => {
            const isFocused = navSection === "systems" && navIndex === idx;
            const isActive = activeSystem === sys.id;

            return (
              <div
                key={sys.id}
                className={`px-5 py-2.5 rounded-xl font-semibold whitespace-nowrap transition-all flex items-center gap-2 border duration-200
                  ${
                    isFocused
                      ? "ring-4 ring-white ring-offset-2 ring-offset-black scale-105 bg-blue-600 text-white z-10"
                      : isActive
                        ? "bg-blue-600/80 text-white border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                        : "bg-black/40 text-slate-400 border-white/5 backdrop-blur-sm"
                  }`}
              >
                <sys.icon className="w-4 h-4" /> {sys.name}
              </div>
            );
          })}
        </div>

        {/* CARROSSEL DE JOGOS */}
        <div className="relative w-full" ref={carouselRef}>
          <div className="flex gap-6 overflow-x-auto pb-8 pt-6 px-2 no-scrollbar items-end snap-x">
            {filteredGames.map((game, idx) => {
              const isFocused = navSection === "games" && navIndex === idx;

              return (
                <div
                  key={game.id}
                  ref={(el) => {
                    itemsRef.current[idx] = el;
                  }}
                  className={`relative flex-shrink-0 transition-all duration-300 ease-out origin-bottom rounded-xl snap-center
                    ${
                      isFocused
                        ? "w-72 scale-[1.15] z-30 shadow-[0_20px_50px_rgba(0,0,0,0.8)] ring-[5px] ring-white ring-offset-[6px] ring-offset-black -translate-y-4"
                        : "w-52 scale-95 z-10 opacity-40 brightness-50"
                    }`}
                >
                  <div className="aspect-[3/4] rounded-xl overflow-hidden bg-slate-800 relative">
                    <img
                      src={game.cover}
                      alt={game.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-100" />

                    {isFocused && (
                      <div className="absolute bottom-0 left-0 right-0 p-4 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex items-center gap-2 text-white/90 text-sm font-bold bg-black/80 w-max px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10">
                          <Clock className="w-4 h-4 text-blue-400" />{" "}
                          {game.playtime}h
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );

  const renderGameDetails = () => {
    if (!selectedGame) return null;

    return (
      <div className="flex-1 flex flex-col p-14 animate-in zoom-in-95 fade-in duration-300 relative z-20 bg-slate-900/95 backdrop-blur-3xl">
        <div className="flex flex-1 gap-16 mt-10 max-w-7xl mx-auto w-full items-center">
          {/* Esquerda: Capa e Botões */}
          <div className="w-1/3 flex flex-col gap-8">
            <div className="w-full aspect-[3/4] shadow-[0_20px_60px_rgba(0,0,0,0.8)] rounded-2xl overflow-hidden border-2 border-white/20 relative">
              <img
                src={selectedGame.cover}
                alt={selectedGame.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex flex-col gap-4">
              <div
                className={`py-5 rounded-2xl font-black text-2xl flex items-center justify-center gap-3 transition-all
                ${
                  navSection === "details-actions" && navIndex === 0
                    ? "bg-white text-black scale-105 shadow-[0_0_40px_rgba(255,255,255,0.5)] ring-4 ring-blue-500 ring-offset-4 ring-offset-slate-900"
                    : "bg-blue-600 text-white opacity-80"
                }`}
              >
                <Play className="w-8 h-8 fill-current" /> JOGAR AGORA
              </div>

              <div
                className={`py-4 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 transition-all
                ${
                  navSection === "details-actions" && navIndex === 1
                    ? "bg-white text-black scale-105 shadow-[0_0_30px_rgba(255,255,255,0.3)] ring-4 ring-slate-400 ring-offset-4 ring-offset-slate-900"
                    : "bg-white/10 text-white backdrop-blur-md border border-white/10"
                }`}
              >
                <ArrowLeft className="w-6 h-6" /> Voltar à Biblioteca
              </div>
            </div>
          </div>

          {/* Direita: Info */}
          <div className="w-2/3 flex flex-col">
            <div className="flex items-center gap-4 mb-6">
              <span className="px-4 py-1.5 bg-blue-500/20 backdrop-blur-md rounded-lg text-sm font-bold tracking-widest uppercase text-blue-300 border border-blue-500/30">
                {SYSTEMS.find((s) => s.id === selectedGame.system)?.name}
              </span>
              <span className="text-slate-400 font-medium bg-white/5 px-3 py-1 rounded-lg">
                {selectedGame.year}
              </span>
              <span className="text-slate-400 font-medium bg-white/5 px-3 py-1 rounded-lg">
                {selectedGame.developer}
              </span>
            </div>

            <h1 className="text-7xl font-black mb-8 drop-shadow-2xl text-white tracking-tight">
              {selectedGame.title}
            </h1>
            <p className="text-2xl text-slate-300 leading-relaxed mb-12 bg-black/40 p-6 rounded-2xl border border-white/5 backdrop-blur-sm">
              {selectedGame.description}
            </p>

            <div className="grid grid-cols-3 gap-6">
              <div className="bg-black/40 backdrop-blur-md p-6 rounded-2xl border border-white/5 flex flex-col items-center text-center">
                <Clock className="w-8 h-8 text-blue-400 mb-3" />
                <span className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">
                  Tempo de Jogo
                </span>
                <span className="text-3xl font-bold text-white">
                  {selectedGame.playtime}
                  <span className="text-lg text-slate-500">h</span>
                </span>
              </div>
              <div className="bg-black/40 backdrop-blur-md p-6 rounded-2xl border border-white/5 flex flex-col items-center text-center">
                <Activity className="w-8 h-8 text-green-400 mb-3" />
                <span className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">
                  Última Sessão
                </span>
                <span className="text-xl font-bold text-white mt-1">
                  {new Date(selectedGame.lastPlayed).toLocaleDateString(
                    "pt-BR",
                  )}
                </span>
              </div>
              <div className="bg-black/40 backdrop-blur-md p-6 rounded-2xl border border-white/5 flex flex-col items-center text-center">
                <Award className="w-8 h-8 text-yellow-400 mb-3" />
                <span className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">
                  Conquistas
                </span>
                <span className="text-3xl font-bold text-white">
                  {selectedGame.achievements}
                  <span className="text-lg text-slate-500">
                    /{selectedGame.totalAchievements || "-"}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPlayingState = () => {
    if (!selectedGame) return null;

    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white z-50 animate-in fade-in duration-500">
        <div
          className="absolute inset-0 z-0 opacity-40 blur-2xl"
          style={{
            backgroundImage: `url(${selectedGame.cover})`,
            backgroundSize: "cover",
          }}
        ></div>
        <Gamepad2 className="w-32 h-32 text-blue-500 animate-bounce mb-10 z-10 drop-shadow-[0_0_30px_rgba(59,130,246,0.8)]" />
        <h1 className="text-5xl font-black tracking-widest mb-4 z-10 text-white">
          EMULADOR EM EXECUÇÃO
        </h1>
        <p className="text-2xl text-slate-300 z-10 flex items-center gap-3 bg-black/50 px-6 py-2 rounded-full border border-white/10">
          Pressione{" "}
          <span className="bg-white text-black px-3 py-1 rounded font-black tracking-widest text-sm">
            B / ESC
          </span>{" "}
          para Sair
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-slate-100 font-sans overflow-hidden select-none flex flex-col relative">
      {/* BACKGROUND GLOBAL */}
      <div className="absolute inset-0 z-0 transition-opacity duration-700 ease-in-out">
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700 scale-105"
          style={{
            backgroundImage: `url(${currentView === "library" ? focusedGame.bg : selectedGame?.bg || focusedGame.bg})`,
            filter:
              currentView === "library" && !selectedGame
                ? "blur(10px) brightness(0.4)"
                : "blur(30px) brightness(0.2)",
          }}
        />
        <div
          className={`absolute inset-0 bg-gradient-to-t ${currentView === "library" ? focusedGame.color : selectedGame?.color || "from-slate-900 to-slate-900"} opacity-50 mix-blend-multiply transition-colors duration-700`}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.9)_100%)]" />
      </div>

      {currentView === "playing" && renderPlayingState()}

      {currentView !== "playing" && (
        <>
          {renderTopBar()}

          <div className="flex-1 flex overflow-hidden">
            {currentView === "library" && renderLibrary()}
            {currentView === "details" && selectedGame && renderGameDetails()}
            {/* Outras telas usarão "B / Esc" para voltar e foram ocultadas para focar no fluxo principal do controle */}
            {currentView === "analytics" && (
              <div className="flex-1 flex items-center justify-center z-10 text-3xl font-bold">
                Analytics (Pressione B para voltar)
              </div>
            )}
            {currentView === "settings" && (
              <div className="flex-1 flex items-center justify-center z-10 text-3xl font-bold">
                Configurações (Pressione B para voltar)
              </div>
            )}
          </div>

          {/* RODAPÉ DO CONTROLE (DINÂMICO) */}
          <div className="absolute bottom-8 right-12 flex gap-8 text-sm font-bold text-slate-300 bg-black/80 px-8 py-3.5 rounded-full backdrop-blur-xl border border-white/20 z-30 shadow-2xl">
            <span className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500 text-white font-black flex items-center justify-center text-sm shadow-[0_0_10px_rgba(34,197,94,0.8)]">
                A
              </div>{" "}
              Confirmar / Jogar
            </span>
            <span className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-500 text-white font-black flex items-center justify-center text-sm shadow-[0_0_10px_rgba(239,68,68,0.8)]">
                B
              </div>{" "}
              Voltar / Cancelar
            </span>
            <span className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-0.5">
                <div className="w-1 h-2 bg-white rounded-t"></div>
                <div className="flex gap-4">
                  <div className="w-2 h-1 bg-white rounded-l"></div>
                  <div className="w-2 h-1 bg-white rounded-r"></div>
                </div>
                <div className="w-1 h-2 bg-white rounded-b"></div>
              </div>{" "}
              Navegar
            </span>
          </div>
        </>
      )}

      {/* CSS GLOBAIS */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
        body { font-family: 'Inter', sans-serif; }
      `,
        }}
      />
    </div>
  );
}
