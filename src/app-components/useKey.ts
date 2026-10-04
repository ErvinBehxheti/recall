"use client";

import { useEffect, useRef } from "react";

const TYPING = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/**
 * Runs `handler` when `key` is pressed anywhere on the page. Ignores modifier combos, held keys,
 * typing in form fields, and Enter/Space on buttons and links (they already activate natively).
 */
export function useKey(key: string, handler: () => void, enabled = true) {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== key.toLowerCase()) return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || TYPING.has(target.tagName))) return;
      if ((key === "Enter" || key === " ") && target?.closest("button, a")) return;
      event.preventDefault();
      handlerRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key, enabled]);
}
