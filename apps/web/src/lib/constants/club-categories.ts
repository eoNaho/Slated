export interface ClubCategory {
  value: string;
  label: string;
}

export const CLUB_CATEGORIES: ClubCategory[] = [
  { value: "action", label: "Ação" },
  { value: "comedy", label: "Comédia" },
  { value: "drama", label: "Drama" },
  { value: "horror", label: "Terror" },
  { value: "sci-fi", label: "Ficção Científica" },
  { value: "thriller", label: "Suspense" },
  { value: "romance", label: "Romance" },
  { value: "crime", label: "Crime" },
  { value: "fantasy", label: "Fantasia" },
  { value: "mystery", label: "Mistério" },
  { value: "animation", label: "Animação" },
  { value: "anime", label: "Anime" },
  { value: "documentary", label: "Documentário" },
  { value: "musical", label: "Musical" },
  { value: "by-director", label: "Por Diretor" },
  { value: "by-actor", label: "Por Ator" },
  { value: "by-decade", label: "Por Década" },
  { value: "by-country", label: "Por País" },
  { value: "general", label: "Geral" },
];

export function getCategoryLabel(value: string): string {
  return CLUB_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
