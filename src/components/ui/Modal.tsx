"use client";

import { useEffect, type ReactNode } from "react";
import { useDialogFocus } from "@/src/hooks/useDialogFocus";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  ariaLabel: string;
  children: ReactNode;
};

export default function Modal({ isOpen, onClose, ariaLabel, children }: ModalProps) {
  const dialogRef = useDialogFocus<HTMLDivElement>(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6 ${
        isOpen ? "" : "pointer-events-none"
      }`}
    >
      <div
        aria-hidden
        onClick={onClose}
        className={`absolute inset-0 bg-charcoal/50 backdrop-blur-md transition-opacity duration-300 ease-out ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className={`relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl bg-cream text-charcoal shadow-2xl outline-none transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:max-h-[85vh] sm:max-w-2xl sm:rounded-2xl ${
          isOpen
            ? "translate-y-0 opacity-100 sm:scale-100"
            : "translate-y-full opacity-0 sm:translate-y-4 sm:scale-95"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
