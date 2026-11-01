"use client";

import { useEffect } from "react";

/** Counted, so nested overlays (e.g. a dialog opened from the photo viewer) unlock in the right order. */
let locks = 0;
let saved = "";

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    if (locks++ === 0) {
      saved = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    return () => {
      if (--locks === 0) document.body.style.overflow = saved;
    };
  }, [active]);
}
