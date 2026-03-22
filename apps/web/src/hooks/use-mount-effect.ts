import { useEffect } from "react";

/**
 * Runs an effect once on mount only.
 * Use this instead of useEffect with an empty dependency array
 * to make the intent explicit.
 */
// eslint-disable-next-line react-hooks/exhaustive-deps
export function useMountEffect(fn: () => void | (() => void)) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(fn, []);
}
