"use client";
import { useEffect, useRef, useState } from "react";

// Signature: the Seal (design.md §5.2). Sensitive values render as a sealed
// redaction with a seal-gold wax mark; on the owner's authenticated view they
// resolve with a brief mono "decrypt" scramble. Reduced-motion jumps to the value.
const CHARS = "0123456789abcdef#%&/<>█▓▒";

function blocksFor(v: string) {
  const n = Math.min(Math.max(v.replace(/\s/g, "").length, 6), 12);
  return "█".repeat(n);
}

export type CommitmentProps = {
  value: string;
  sealed?: boolean;
  revealable?: boolean;
  label?: string;
  className?: string;
};

export default function Commitment({
  value,
  sealed = true,
  revealable = false,
  label,
  className = "",
}: CommitmentProps) {
  const [isSealed, setIsSealed] = useState(sealed);
  const [display, setDisplay] = useState(sealed ? blocksFor(value) : value);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };

  useEffect(() => clear, []);

  function reveal() {
    clear();
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDisplay(value);
      return;
    }
    let f = 0;
    const frames = 12;
    timer.current = setInterval(() => {
      f++;
      const shown = Math.floor((f / frames) * value.length);
      let out = "";
      for (let i = 0; i < value.length; i++) {
        const ch = value[i];
        out += i < shown || ch === " " ? ch : CHARS[Math.floor(Math.random() * CHARS.length)];
      }
      setDisplay(out);
      if (f >= frames) {
        clear();
        setDisplay(value);
      }
    }, 28);
  }

  // Controlled usage: follow the `sealed` prop.
  useEffect(() => {
    if (revealable) return;
    if (sealed) {
      setIsSealed(true);
      setDisplay(blocksFor(value));
    } else {
      setIsSealed(false);
      reveal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sealed, value]);

  function toggle() {
    if (!revealable) return;
    if (isSealed) {
      setIsSealed(false);
      reveal();
    } else {
      setIsSealed(true);
      clear();
      setDisplay(blocksFor(value));
    }
  }

  const content = (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className={`inline-block h-2 w-2 rounded-pill ${isSealed ? "bg-seal" : "bg-alive"}`}
        style={{ boxShadow: isSealed ? "0 0 6px var(--color-seal)" : undefined }}
      />
      <span
        className={`font-mono text-[15px] tabular-nums ${isSealed ? "text-ink-muted" : "text-ink"}`}
      >
        {display}
      </span>
    </span>
  );

  if (!revealable) return <span className={`inline-flex ${className}`}>{content}</span>;

  return (
    <button
      onClick={toggle}
      className={`group inline-flex items-center gap-3 ${className}`}
      aria-label={
        isSealed
          ? `${label ?? "Value"} sealed, click to resolve`
          : `${label ?? "Value"} resolved`
      }
    >
      {content}
      <span className="t-caption text-ink-faint group-hover:text-seal">
        {isSealed ? "sealed" : "resolved"}
      </span>
    </button>
  );
}
