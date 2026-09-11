"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Module-level (shared across every Modal/Drawer instance): the currently
// open dialogs, in open order. Two dialogs can be open at once — e.g.
// LotPassportModal opened from inside DiscoveryModal — so Escape must only
// close the topmost one, matching what clicking its own backdrop/close
// button already does. Without this, both dialogs' listeners would fire on
// the same keypress and Escape would silently close the one underneath too.
let openDialogStack: symbol[] = [];

/**
 * Minimal focus management shared by Modal and Drawer: moves focus into the
 * dialog when it opens, traps Tab/Shift+Tab within it while open, closes it
 * on Escape (only if it's the topmost open dialog), and restores focus to
 * whatever was focused before opening (the CTA that triggered it) once it
 * closes — so keyboard/screen-reader users never land back on page content
 * hidden behind the backdrop.
 */
export function useDialogFocus<T extends HTMLElement = HTMLElement>(
  isOpen: boolean,
  onClose: () => void,
): RefObject<T | null> {
  const containerRef = useRef<T | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const id = Symbol("dialog");
    openDialogStack = [...openDialogStack, id];

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // Synchronous, not rAF: by the time this effect runs, React has already
    // committed this render's DOM (containerRef.current's subtree, children
    // included), so there's nothing to wait a frame for — and rAF is
    // unreliable here anyway, since it's throttled or never fires for a
    // background/non-visible tab.
    const container = containerRef.current;
    if (container) {
      const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      (focusable[0] ?? container).focus();
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (openDialogStack[openDialogStack.length - 1] === id) onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const container = containerRef.current;
      if (!container) return;
      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      openDialogStack = openDialogStack.filter((entry) => entry !== id);
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen, onClose]);

  return containerRef;
}
