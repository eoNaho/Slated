import Link from "next/link";
import { Film, Heart, Share2 } from "lucide-react";

const footerLinks = {
  browse: [
    { name: "Movies", href: "/movies" },
    { name: "TV Series", href: "/series" },
    { name: "Lists", href: "/lists" },
    { name: "Guide", href: "/guide" },
  ],
  community: [
    { name: "Guidelines", href: "/guidelines" },
    { name: "Discussions", href: "/discussions" },
    { name: "Leaderboard", href: "/leaderboard" },
  ],
  legal: [
    { name: "Terms of Service", href: "/terms" },
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Cookie Policy", href: "/cookies" },
  ],
};

export function Footer() {
  return (
    <footer className="relative z-0 border-t border-white/5 bg-black py-16">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 mb-16">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-sm">
                <Film className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-white">
                PixelReel
              </span>
            </Link>
            <p className="text-zinc-500 text-sm leading-relaxed max-w-sm mb-6">
              The social network for film lovers. Rate movies, log your diary,
              and curate your own lists.
            </p>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/30 cursor-pointer transition-colors">
                <Share2 className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Browse */}
          <div>
            <h4 className="font-bold text-white mb-6">Browse</h4>
            <ul className="space-y-3 text-sm text-zinc-400">
              {footerLinks.browse.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="hover:text-purple-400 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="font-bold text-white mb-6">Community</h4>
            <ul className="space-y-3 text-sm text-zinc-400">
              {footerLinks.community.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="hover:text-purple-400 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-bold text-white mb-6">Legal</h4>
            <ul className="space-y-3 text-sm text-zinc-400">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="hover:text-purple-400 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
          <p>
            &copy; {new Date().getFullYear()} PixelReel Inc. All rights
            reserved.
          </p>
          <div className="flex gap-6">
            <span>
              Made with <Heart className="w-3 h-3 inline text-red-800" /> for
              cinema
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
