"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Closes a popover when the user presses Escape or taps/clicks outside of it.
 * `refs` are the elements that count as "inside" (usually the trigger's wrapper and the popover).
 */
export function useDismiss(open: boolean, onDismiss: () => void, refs: RefObject<HTMLElement> | RefObject<HTMLElement>[]) {
  const latest = useRef(onDismiss);
  latest.current = onDismiss;
  const list = Array.isArray(refs) ? refs : [refs];
  const listRef = useRef(list);
  listRef.current = list;

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (listRef.current.some((r) => r.current?.contains(target))) return;
      latest.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) latest.current();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
}
