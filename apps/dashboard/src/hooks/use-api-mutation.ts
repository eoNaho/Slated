import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

type Method = "POST" | "PUT" | "PATCH" | "DELETE";

interface ApiMutationOptions<TData, TVariables> extends Omit<UseMutationOptions<TData, Error, TVariables>, "mutationFn"> {
  method?: Method;
  path: string | ((variables: TVariables) => string);
  invalidateKeys?: string[][];
  successMessage?: string;
  errorMessage?: string;
}

export function useApiMutation<TData = unknown, TVariables = unknown>({
  method = "POST",
  path,
  invalidateKeys,
  successMessage,
  errorMessage,
  onSuccess,
  onError,
  ...options
}: ApiMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables>({
    mutationFn: (variables) => {
      const resolvedPath = typeof path === "function" ? path(variables) : path;
      return apiFetch<TData>(resolvedPath, {
        method,
        body: variables as unknown,
      });
    },
    onSuccess: (...args) => {
      if (successMessage) toast.success(successMessage);
      if (invalidateKeys) {
        invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      }
      (onSuccess as ((...a: unknown[]) => void) | undefined)?.(...args);
    },
    onError: (...args) => {
      const err = args[0] as Error;
      toast.error(errorMessage ?? `Erro: ${err.message}`);
      (onError as ((...a: unknown[]) => void) | undefined)?.(...args);
    },
    ...options,
  });
}
