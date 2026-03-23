import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

type ApiQueryOptions<T> = Omit<UseQueryOptions<T>, "queryFn"> & {
  queryKey: string[];
  path: string;
};

export function useApiQuery<T = unknown>({ queryKey, path, ...options }: ApiQueryOptions<T>) {
  return useQuery<T>({
    queryKey,
    queryFn: () => apiFetch<T>(path),
    ...options,
  });
}
