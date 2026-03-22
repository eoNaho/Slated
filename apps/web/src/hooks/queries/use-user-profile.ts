import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

async function fetchMe() {
  const res = await fetch(`${API_URL}/users/me`, { credentials: "include" });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.data ?? null;
}

export function useUserProfile(enabled = true) {
  return useQuery({
    queryKey: ["user", "me"],
    queryFn: fetchMe,
    enabled,
  });
}

export function useInvalidateUserProfile() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["user", "me"] });
}
