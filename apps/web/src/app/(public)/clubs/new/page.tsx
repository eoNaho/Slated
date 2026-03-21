import type { Metadata } from "next";
import { NewClubForm } from "./new-club-form";

export const metadata: Metadata = {
  title: "Criar Club — PixelReel",
};

export default function NewClubPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="relative overflow-hidden border-b border-white/5 pt-8 pb-8">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/3 w-[400px] h-[200px] bg-purple-700/15 rounded-full blur-[80px]" />
        </div>
        <div className="relative container mx-auto px-6">
          <h1 className="text-3xl font-bold text-white">Criar um novo Club</h1>
          <p className="text-zinc-400 mt-1 text-sm">Reúna cinéfilos em torno de um tema ou gênero.</p>
        </div>
      </div>
      <div className="container mx-auto px-6 py-8 max-w-2xl">
        <NewClubForm />
      </div>
    </div>
  );
}
