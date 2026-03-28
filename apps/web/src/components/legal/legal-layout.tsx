import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface Section {
  id: string;
  title: string;
}

interface LegalLayoutProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  sections: Section[];
  children: React.ReactNode;
}

export function LegalLayout({
  title,
  subtitle,
  lastUpdated,
  sections,
  children,
}: LegalLayoutProps) {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative border-b border-white/5 bg-zinc-950 py-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-48 bg-purple-500/6 blur-[100px]" />
        </div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex items-center gap-2 text-sm text-zinc-500 mb-6">
            <Link href="/" className="hover:text-zinc-300 transition-colors">
              Home
            </Link>
            <ChevronRight size={14} />
            <span className="text-zinc-300">{title}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            {title}
          </h1>
          <p className="text-zinc-400 text-lg mb-4">{subtitle}</p>
          <p className="text-sm text-zinc-600">Last updated: {lastUpdated}</p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* Sidebar TOC */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-4">
                Contents
              </p>
              <nav className="space-y-1">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block text-sm text-zinc-400 hover:text-white py-1.5 pl-3 border-l border-zinc-800 hover:border-purple-500 transition-all duration-200"
                  >
                    {section.title}
                  </a>
                ))}
              </nav>

              <div className="mt-10 pt-8 border-t border-white/5">
                <p className="text-xs text-zinc-600 mb-3">Other legal pages</p>
                <div className="space-y-2">
                  <Link
                    href="/terms"
                    className="block text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Terms of Service
                  </Link>
                  <Link
                    href="/privacy"
                    className="block text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Privacy Policy
                  </Link>
                  <Link
                    href="/cookies"
                    className="block text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Cookie Policy
                  </Link>
                </div>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="lg:col-span-3 prose-legal">{children}</main>
        </div>
      </div>
    </div>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-12 scroll-mt-24">
      <h2 className="text-xl font-semibold text-white mb-4 pb-3 border-b border-white/5">
        {title}
      </h2>
      <div className="space-y-4 text-zinc-400 text-sm leading-relaxed">
        {children}
      </div>
    </section>
  );
}

export function LegalP({ children }: { children: React.ReactNode }) {
  return <p className="text-zinc-400 text-sm leading-relaxed">{children}</p>;
}

export function LegalList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2 pl-4">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
          <span className="mt-1.5 w-1 h-1 rounded-full bg-purple-500 flex-shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function LegalHighlight({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white/3 border border-white/8 rounded-xl p-5 text-sm text-zinc-300 leading-relaxed">
      {children}
    </div>
  );
}
