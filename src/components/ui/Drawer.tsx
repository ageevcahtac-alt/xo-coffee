"use client";

import { useEffect, type ReactNode } from "react";
import { useDialogFocus } from "@/src/hooks/useDialogFocus";

type DrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  ariaLabel: string;
  side?: "left" | "right";
  widthClassName?: string;
  children: ReactNode;
};

export default function Drawer({
  isOpen,
  onClose,
  ariaLabel,
  side = "right",
  widthClassName = "max-w-md",
  children,
}: DrawerProps) {
  const dialogRef = useDialogFocus<HTMLElement>(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const sidePosition = side === "right" ? "right-0" : "left-0";
  const closedTransform =
    side === "right" ? "translate-x-full" : "-translate-x-full";

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-md transition-opacity duration-300 ease-out ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className={`fixed top-0 ${sidePosition} z-[70] flex h-full w-full ${widthClassName} flex-col bg-cream text-charcoal shadow-2xl outline-none transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isOpen ? "translate-x-0" : closedTransform
        }`}
      >
        {children}
      </aside>
    </>
  );
}
