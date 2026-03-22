import { useEffect } from "react";

/**
 * Locks body scroll when `locked` is true.
 */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [locked]);
}
