import Link from "next/link";
import { ChevronRight, Film, Heart, Share2 } from "lucide-react";

const footerLinks = [
  {
    title: "Browse",
    links: [
      { name: "Movies", href: "/movies" },
      { name: "TV Series", href: "/series" },
      { name: "Lists", href: "/lists" },
      { name: "Guide", href: "/guide" },
    ],
  },
  {
    title: "Community",
    links: [
      { name: "Guidelines", href: "/guidelines" },
      { name: "Discussions", href: "/discussions" },
      { name: "Leaderboard", href: "/leaderboard" },
    ],
  },
  {
    title: "Legal",
    links: [
      { name: "Terms of Service", href: "/terms" },
      { name: "Privacy Policy", href: "/privacy" },
      { name: "Cookie Policy", href: "/cookies" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative bg-black text-white pt-20 pb-12 overflow-hidden border-t border-white/5">
      {/* Cinematic top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-32 bg-purple-500/8 blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Main grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 mb-16">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2 pr-0 lg:pr-12">
            <Link href="/" className="group inline-flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                <Film size={18} className="text-primary-foreground" />
              </div>
              <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                PixelReel
              </span>
            </Link>

            <p className="text-zinc-400 text-sm leading-relaxed mb-8 max-w-[300px]">
              The social network for film lovers. Rate movies, log your diary,
              and curate your own lists.
            </p>

            <button
              className="relative overflow-hidden bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-sm transition-all duration-300 p-3 rounded-xl flex items-center justify-center group w-fit"
              aria-label="Share"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <Share2
                size={18}
                className="text-zinc-400 group-hover:text-white transition-colors relative z-10"
              />
            </button>
          </div>

          {/* Link columns */}
          {footerLinks.map((column) => (
            <div key={column.title}>
              <h4 className="font-semibold text-white mb-6 tracking-wide">
                {column.title}
              </h4>
              <ul className="space-y-3.5">
                {column.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="group flex items-center text-sm text-zinc-400 hover:text-white transition-all duration-300 w-fit"
                    >
                      <ChevronRight
                        size={14}
                        className="opacity-0 -ml-4 mr-0 group-hover:opacity-100 group-hover:mr-1 text-purple-400 transition-all duration-300"
                      />
                      <span className="group-hover:translate-x-0.5 transition-transform duration-300">
                        {link.name}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Gradient divider */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-800 to-transparent mb-8" />

        {/* Bottom bar */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 text-[13px] text-zinc-500">
          <p>&copy; {new Date().getFullYear()} PixelReel Inc. All rights reserved.</p>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 lg:gap-8 w-full lg:w-auto">
            {/* TMDB attribution */}
            <a
              href="https://www.themoviedb.org"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 group/tmdb hover:text-zinc-400 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 190.24 81.52"
                className="h-4 w-auto flex-shrink-0"
              >
                <defs>
                  <linearGradient
                    id="tmdb-gradient"
                    y1="40.76"
                    x2="190.24"
                    y2="40.76"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0" stopColor="#90cea1" />
                    <stop offset="0.56" stopColor="#3cbec9" />
                    <stop offset="1" stopColor="#00b3e5" />
                  </linearGradient>
                </defs>
                <path
                  fill="url(#tmdb-gradient)"
                  d="M105.67,36.06h66.9A17.67,17.67,0,0,0,190.24,18.4h0A17.67,17.67,0,0,0,172.57.73h-66.9A17.67,17.67,0,0,0,88,18.4h0A17.67,17.67,0,0,0,105.67,36.06Zm-88,45h76.9A17.67,17.67,0,0,0,112.24,63.4h0A17.67,17.67,0,0,0,94.57,45.73H17.67A17.67,17.67,0,0,0,0,63.4H0A17.67,17.67,0,0,0,17.67,81.06ZM10.41,35.42h7.8V6.92h10.1V0H.31v6.9h10.1Zm28.1,0h7.8V8.25h.1l9,27.15h6l9.3-27.15h.1V35.4h7.8V0H66.76l-8.2,23.1h-.1L50.31,0H38.51ZM152.43,55.67a15.07,15.07,0,0,0-4.52-5.52,18.57,18.57,0,0,0-6.68-3.08,33.54,33.54,0,0,0-8.07-1h-11.7v35.4h12.75a24.58,24.58,0,0,0,7.55-1.15A19.34,19.34,0,0,0,148.11,77a16.27,16.27,0,0,0,4.37-5.5,16.91,16.91,0,0,0,1.63-7.58A18.5,18.5,0,0,0,152.43,55.67ZM145,68.6A8.8,8.8,0,0,1,142.36,72a10.7,10.7,0,0,1-4,1.82,21.57,21.57,0,0,1-5,.55h-4.05v-21h4.6a17,17,0,0,1,4.67.63,11.66,11.66,0,0,1,3.88,1.87A9.14,9.14,0,0,1,145,59a9.87,9.87,0,0,1,1,4.52A11.89,11.89,0,0,1,145,68.6Zm44.63-.13a8,8,0,0,0-1.58-2.62A8.38,8.38,0,0,0,185.63,64a10.31,10.31,0,0,0-3.17-1v-.1a9.22,9.22,0,0,0,4.42-2.82,7.43,7.43,0,0,0,1.68-5,8.42,8.42,0,0,0-1.15-4.65,8.09,8.09,0,0,0-3-2.72,12.56,12.56,0,0,0-4.18-1.3,32.84,32.84,0,0,0-4.62-.33h-13.2v35.4h14.5a22.41,22.41,0,0,0,4.72-.5,13.53,13.53,0,0,0,4.28-1.65,9.42,9.42,0,0,0,3.1-3,8.52,8.52,0,0,0,1.2-4.68A9.39,9.39,0,0,0,189.66,68.47ZM170.21,52.72h5.3a10,10,0,0,1,1.85.18,6.18,6.18,0,0,1,1.7.57,3.39,3.39,0,0,1,1.22,1.13,3.22,3.22,0,0,1,.48,1.82,3.63,3.63,0,0,1-.43,1.8,3.4,3.4,0,0,1-1.12,1.2,4.92,4.92,0,0,1-1.58.65,7.51,7.51,0,0,1-1.77.2h-5.65Zm11.72,20a3.9,3.9,0,0,1-1.22,1.3,4.64,4.64,0,0,1-1.68.7,8.18,8.18,0,0,1-1.82.2h-7v-8h5.9a15.35,15.35,0,0,1,2,.15,8.47,8.47,0,0,1,2.05.55,4,4,0,0,1,1.57,1.18,3.11,3.11,0,0,1,.63,2A3.71,3.71,0,0,1,181.93,72.72Z"
                />
              </svg>
              <span className="leading-tight max-w-[280px] md:max-w-none">
                This product uses the TMDB API but is not endorsed or certified
                by TMDB.
              </span>
            </a>

            {/* Signature pill */}
            <div className="flex items-center gap-1.5 whitespace-nowrap bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
              <span>Made with</span>
              <Heart size={13} className="text-red-500 fill-red-500 animate-pulse" />
              <span>for cinema</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
