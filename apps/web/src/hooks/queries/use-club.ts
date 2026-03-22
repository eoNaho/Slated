import { useQuery } from "@tanstack/react-query";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

async function fetchClub(slug: string) {
  const res = await fetch(`${API_URL}/clubs/${slug}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (res.status === 404) throw Object.assign(new Error("Not found"), { status: 404 });
  if (res.status === 403) throw Object.assign(new Error("Forbidden"), { status: 403 });
  if (!res.ok) throw new Error("Failed to load club");
  const data = await res.json();
  return data.data;
}

export function useClub(slug: string, enabled = true) {
  return useQuery({
    queryKey: ["club", slug],
    queryFn: () => fetchClub(slug),
    enabled: enabled && !!slug,
    retry: false, // don't retry 403/404
  });
}
