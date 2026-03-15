import type { Metadata } from "next";
import { MovieDetails, MovieType } from "./movie-details";

export const metadata: Metadata = {
  title: "Teste4 - Detalhes (Duna: Parte Dois)",
  description: "Página de teste de detalhes recriada.",
};

// Mock data copied from src/lib/data/details.ts
const mockDetails: MovieType = {
  id: "1",
  type: "movie",
  title: "Duna: Parte Dois",
  originalTitle: "Dune: Part Two",
  slug: "dune-part-two",
  tagline: "O poder tem um preço",
  overview:
    "Paul Atreides une-se a Chani e aos Fremen enquanto busca vingança contra os conspiradores que destruíram sua família. Enfrentando uma escolha entre o amor de sua vida e o destino do universo conhecido, ele se esforça para evitar um futuro terrível que só ele pode prever.",
  poster:
    "https://image.tmdb.org/t/p/w600_and_h900_bestv2/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
  backdrop:
    "https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
  releaseDate: "2024-03-01",
  runtime: 166,
  certification: "12",
  genres: ["Ficção Científica", "Aventura", "Drama"],
  language: "en",
  country: "Estados Unidos",
  budget: 190000000,
  boxOffice: 711844668,
  rating: 8.8,
  voteCount: 125000,
  trailerUrl: "https://www.youtube.com/embed/Way9Dexny3w",
  year: 2024,
  director: "Denis Villeneuve",
  writers: ["Denis Villeneuve", "Jon Spaihts"],
  studio: "Legendary Entertainment",
  popularity: 95.5,
  streamingServices: [
    {
      name: "HBO Max",
      logo: "https://image.tmdb.org/t/p/original/cE1hCF2gH5Aae9jO45e3L9lTjZ5.jpg",
    },
    {
      name: "Amazon Prime",
      logo: "https://upload.wikimedia.org/wikipedia/commons/f/f1/Prime_Video.png",
    },
  ],
  cast: [
    {
      id: "1",
      name: "Timothée Chalamet",
      character: "Paul Atreides",
      profilePath:
        "https://image.tmdb.org/t/p/w300_and_h450_bestv2/BE2sdjpgEHrPSjUI8WePBxkrxb.jpg",
      order: 1,
    },
    {
      id: "2",
      name: "Zendaya",
      character: "Chani",
      profilePath:
        "https://image.tmdb.org/t/p/w300_and_h450_bestv2/r3A7EvHFQ0l59YBbD11pXPj80q4.jpg",
      order: 2,
    },
    {
      id: "3",
      name: "Rebecca Ferguson",
      character: "Lady Jessica",
      profilePath:
        "https://image.tmdb.org/t/p/w300_and_h450_bestv2/lJloTOevuQxhwYhPDKk8Oyzj1Sd.jpg",
      order: 3,
    },
    {
      id: "4",
      name: "Josh Brolin",
      character: "Gurney Halleck",
      profilePath:
        "https://image.tmdb.org/t/p/w300_and_h450_bestv2/sX2etBbIkxRaCsATyw5ZpOVMPTD.jpg",
      order: 4,
    },
  ],
  crew: [
    {
      id: "1",
      name: "Denis Villeneuve",
      role: "Director",
      job: "Diretor",
      photo:
        "https://image.tmdb.org/t/p/w300_and_h450_bestv2/qC7iU0837fG0C7U0Y3vGkXzXz5.jpg",
      department: "Directing",
    },
    {
      id: "2",
      name: "Greig Fraser",
      role: "Cinematographer",
      job: "Diretor de Fotografia",
      photo:
        "https://image.tmdb.org/t/p/w300_and_h450_bestv2/t5y5y5y5y5y5y5y5y5y5y5y5y5.jpg", // Placeholder logic fallback
      department: "Camera",
    },
  ],
  criticReviews: [
    {
      id: "1",
      source: "The Guardian",
      author: "Peter Bradshaw",
      score: 9.0,
      quote:
        "Uma obra-prima visual que expande magnificamente o universo de Duna.",
    },
    {
      id: "2",
      source: "Variety",
      author: "David Ehrlich",
      score: 8.5,
      quote:
        "Villeneuve entrega uma sequência que supera o original em todos os aspectos.",
    },
  ],
  positiveReviews: 94,
  negativeReviews: 6,
  images: [
    "https://image.tmdb.org/t/p/original/8rpDcsfLJypbO6vREc0547OTq1T.jpg",
    "https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
    "https://image.tmdb.org/t/p/original/oZNPzxqM2s5DyVWabN9NEYaUmJQ.jpg",
    "https://image.tmdb.org/t/p/original/2rmK7mnchw9Xr3XdiTFSxTTlxqw.jpg",
  ],
  similar: [
    {
      id: "2",
      title: "Blade Runner 2049",
      type: "movie",
      poster:
        "https://image.tmdb.org/t/p/w600_and_h900_bestv2/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
      rating: 8.0,
      year: 2017,
    },
    {
      id: "3",
      title: "Arrival",
      type: "movie",
      poster:
        "https://image.tmdb.org/t/p/w600_and_h900_bestv2/pLd1y9aQ3z2iJ9Z8aL3l6q4j5.jpg",
      rating: 7.9,
      year: 2016,
    },
  ],
  reviews: [
    {
      id: "1",
      title: "Uma obra-prima da ficção científica",
      content:
        "Denis Villeneuve conseguiu criar uma sequência que não apenas honra o material original, mas o expande de maneiras inimagináveis. A cinematografia é de tirar o fôlego, a trilha sonora é épica e as performances são impecáveis.",
      rating: 9.5,
      user: {
        id: "1",
        name: "Ana Silva",
        avatar: "",
      },
      likes: 47,
      comments: 12,
      createdAt: "2024-03-15T10:30:00Z",
      updatedAt: "2024-03-15T10:30:00Z",
    },
  ],
};

export default function Teste4Page() {
  return <MovieDetails details={mockDetails} />;
}
