import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function usePersonalFeed(page = 1, enabled = true) {
  return useQuery({
    queryKey: ["feed", "personal", page],
    queryFn: () => api.feed.getPersonal(page),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useGlobalFeed(page = 1, enabled = true) {
  return useQuery({
    queryKey: ["feed", "global", page],
    queryFn: () => api.feed.getGlobal(page),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useInfinitePersonalFeed(enabled = true) {
  return useInfiniteQuery({
    queryKey: ["feed", "personal", "infinite"],
    queryFn: ({ pageParam = 1 }) => api.feed.getPersonal(pageParam as number),
    getNextPageParam: (last) =>
      last.hasNext ? (last.page ?? 1) + 1 : undefined,
    initialPageParam: 1,
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useInfiniteGlobalFeed(enabled = true) {
  return useInfiniteQuery({
    queryKey: ["feed", "global", "infinite"],
    queryFn: ({ pageParam = 1 }) => api.feed.getGlobal(pageParam as number),
    getNextPageParam: (last) =>
      last.hasNext ? (last.page ?? 1) + 1 : undefined,
    initialPageParam: 1,
    enabled,
    staleTime: 60 * 1000,
  });
}
