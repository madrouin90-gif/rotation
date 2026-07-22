"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
  fullscreenOnMobile?: boolean;
}

export function Modal({ onClose, children, fullscreenOnMobile = true }: ModalProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in-up"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-surface w-full overflow-y-auto animate-pop-in ${
          fullscreenOnMobile
            ? "h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-3xl sm:my-8"
            : "max-h-[90vh] max-w-2xl rounded-3xl my-8 mx-4"
        }`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
