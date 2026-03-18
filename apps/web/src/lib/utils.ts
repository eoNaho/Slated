import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Resolves a potentially relative image path from the backend storage
 * into a full absolute URL using the API's image proxy.
 */
export function resolveImage(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
  // Trim trailing slash from API_URL if present
  const base = API_URL.replace(/\/$/, "");
  return `${base}/images/${path}`;
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatRuntime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + "..." : str;
}

/**
 * Convert a title to a URL-friendly slug
 * Example: "The Bear" -> "the-bear"
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Remove multiple hyphens
    .replace(/^-|-$/g, "") // Remove leading/trailing hyphens
    .trim();
}

/**
 * Generate URL for a media item (movie or series)
 * Uses media.slug if available, otherwise generates from title
 */
export function calculateAge(birthDate: string, deathDate?: string | null): number {
  const birth = new Date(birthDate);
  const end = deathDate ? new Date(deathDate) : new Date();
  let age = end.getFullYear() - birth.getFullYear();
  const monthDiff = end.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function getMediaUrl(media: {
  type: "movie" | "series";
  title: string;
  slug?: string;
}): string;
export function getMediaUrl(type: "movie" | "series", title: string): string;
export function getMediaUrl(
  typeOrMedia:
    | "movie"
    | "series"
    | { type: "movie" | "series"; title: string; slug?: string },
  title?: string
): string {
  if (typeof typeOrMedia === "object") {
    // Media object passed
    const media = typeOrMedia;
    const slug = media.slug || slugify(media.title);
    return media.type === "movie" ? `/movies/${slug}` : `/series/${slug}`;
  } else {
    // Separate type and title passed
    const slug = slugify(title!);
    return typeOrMedia === "movie" ? `/movies/${slug}` : `/series/${slug}`;
  }
}
