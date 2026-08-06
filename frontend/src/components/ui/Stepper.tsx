import { Check } from "lucide-react";

// Stepper (design.md §6): mono numerals over a hairline track that fills seal-gold
// as you progress. Completed = seal check, current = gold ring, upcoming = faint.
export default function Stepper({
  steps,
  current,
  className = "",
}: {
  steps: string[];
  current: number;
  className?: string;
}) {
  return (
    <ol className={`flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:gap-0 ${className}`}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={label}
            className={`flex items-center gap-3 ${i < steps.length - 1 ? "sm:flex-1" : ""}`}
          >
            <span
              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-pill border font-mono text-[12px] tabular-nums ${
                done
                  ? "border-seal bg-seal text-bg"
                  : active
                  ? "border-seal text-seal"
                  : "border-hairline text-ink-faint"
              }`}
            >
              {done ? <Check size={14} strokeWidth={2.5} /> : String(i + 1).padStart(2, "0")}
            </span>
            <span
              className={`t-label ${
                active ? "text-ink" : done ? "text-ink-muted" : "text-ink-faint"
              }`}
            >
              {label}
            </span>
            {i < steps.length - 1 ? (
              <span
                className={`mx-3 hidden h-px flex-1 sm:block ${done ? "bg-seal" : "bg-hairline"}`}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
