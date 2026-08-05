"use client";
import { useEffect } from "react";

// Modal (design.md §6): centered surface-1 card, hairline, soft ambient shadow,
// obsidian scrim. Escape or scrim click closes. Used for confirm-before-seal/execute.
export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
};

export default function Modal({ open, onClose, title, children, actions }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-card border border-hairline bg-surface-1 p-6 shadow-2xl">
        {title ? <h3 className="t-h3 mb-3 text-ink">{title}</h3> : null}
        {children ? <div className="t-body text-ink-muted">{children}</div> : null}
        {actions ? <div className="mt-6 flex justify-end gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}
