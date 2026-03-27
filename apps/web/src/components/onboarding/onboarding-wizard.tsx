"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { GenrePicker } from "./genre-picker";
import { SeedMoviePicker } from "./seed-movie-picker";
import { useSubmitOnboarding } from "@/hooks/queries/use-recommendations";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const STEPS = ["Genres", "Movies & Shows", "All set!"] as const;

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);

  const { data: genresData } = useQuery({
    queryKey: ["discover", "genres"],
    queryFn: () => api.discover.genres(),
    staleTime: 10 * 60 * 1000,
  });

  const { mutate: submitOnboarding, isPending } = useSubmitOnboarding();

  const genres = genresData?.data ?? [];

  const canProceed = () => {
    if (step === 0) return selectedGenres.length >= 3;
    if (step === 1) return selectedMedia.length >= 5;
    return true;
  };

  const handleNext = () => {
    if (step < 2) {
      setStep((s) => s + 1);
    }
  };

  const handleSubmit = () => {
    submitOnboarding(
      { selectedGenreIds: selectedGenres, seedMediaIds: selectedMedia },
      {
        onSuccess: () => {
          toast.success("Profile created! Preparing your recommendations...");
          setTimeout(() => router.push("/"), 1500);
        },
        onError: () => toast.error("Failed to save preferences. Please try again."),
      }
    );
  };

  return (
    <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-purple-600/10 border border-purple-500/20 rounded-full px-4 py-1.5 mb-6">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span className="text-sm text-purple-300">Personalization</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Let's learn your taste
          </h1>
          <p className="text-zinc-400">
            This helps us suggest movies and shows made for you.
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-3">
              <div className={`flex items-center gap-2 text-sm ${i === step ? "text-purple-400 font-semibold" : i < step ? "text-zinc-500" : "text-zinc-600"}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${
                  i === step
                    ? "bg-purple-600 border-purple-500 text-white"
                    : i < step
                    ? "bg-zinc-700 border-zinc-600 text-zinc-400"
                    : "bg-transparent border-zinc-700 text-zinc-600"
                }`}>
                  {i + 1}
                </div>
                {label}
              </div>
              {i < STEPS.length - 1 && (
                <div className="w-8 h-px bg-zinc-800" />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 mb-6 min-h-[300px]">
          {step === 0 && (
            <>
              <h2 className="text-lg font-semibold text-zinc-200 mb-1">
                Which genres do you enjoy?
              </h2>
              <GenrePicker
                genres={genres}
                selected={selectedGenres}
                onChange={setSelectedGenres}
                minRequired={3}
              />
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="text-lg font-semibold text-zinc-200 mb-1">
                Movies and shows you loved
              </h2>
              <SeedMoviePicker
                selected={selectedMedia}
                onChange={setSelectedMedia}
                minRequired={5}
              />
            </>
          )}

          {step === 2 && (
            <div className="flex flex-col items-center justify-center h-[240px] gap-4">
              {isPending ? (
                <>
                  <Loader2 className="h-12 w-12 text-purple-400 animate-spin" />
                  <p className="text-zinc-300 text-lg font-medium">Building your taste profile...</p>
                  <p className="text-zinc-500 text-sm">This only takes a few seconds</p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-purple-600/20 rounded-full flex items-center justify-center mb-2">
                    <Sparkles className="h-10 w-10 text-purple-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">All set!</h2>
                  <p className="text-zinc-400 text-center max-w-sm">
                    You selected {selectedGenres.length} genres and {selectedMedia.length} titles.
                    Your recommendations will be ready shortly.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-end">
          {step < 2 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white px-8 py-2.5 rounded-lg font-medium transition-colors"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate recommendations
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
