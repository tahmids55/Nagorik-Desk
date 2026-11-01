"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Live result of a CSS media query. Always `false` during server rendering and hydration. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Phones (below Tailwind's `sm` breakpoint): menus open as bottom sheets there. */
export const useIsPhone = () => useMediaQuery("(max-width: 639px)");
