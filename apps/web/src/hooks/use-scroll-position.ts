import { useState, useEffect } from "react";

/**
 * Returns true when the page has been scrolled past `threshold` pixels.
 */
export function useScrollPosition(threshold = 50): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > threshold);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [threshold]);

  return scrolled;
}
