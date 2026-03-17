import { Header, Footer } from "@/components/layout";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100 selection:bg-purple-500/30 selection:text-purple-200">
      {/* Background ambient gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[128px]" />
      </div>

      <Header />
      <main className="relative z-10 pt-14">
        {children}
        <Footer />
      </main>
    </div>
  );
}
