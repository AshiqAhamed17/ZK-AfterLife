"use client";
import { createContext, useCallback, useContext, useState } from "react";

// Toast (design.md §6): bottom-center, surface-2, hairline, mono label, status
// dot, auto 4s. Use `useToast()` anywhere under <ToastProvider>.
export type ToastTone = "default" | "alive" | "danger" | "seal";
type ToastItem = { id: number; message: string; tone: ToastTone };

const DOT: Record<ToastTone, string> = {
  default: "bg-ink-muted",
  alive: "bg-alive",
  danger: "bg-danger",
  seal: "bg-seal",
};

const ToastCtx = createContext<(message: string, tone?: ToastTone) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, tone: ToastTone = "default") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto inline-flex items-center gap-2.5 rounded-control border border-hairline bg-surface-2 px-4 py-2.5 shadow-lg"
          >
            <span className={`h-1.5 w-1.5 rounded-pill ${DOT[t.tone]}`} />
            <span className="font-mono text-[13px] text-ink">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
