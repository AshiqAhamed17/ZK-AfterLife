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
    <ol className={`flex w-full items-center ${className}`}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={label}
            className={`flex items-center ${i < steps.length - 1 ? "flex-1" : ""}`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-pill border font-mono text-[12px] tabular-nums ${
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
                className={`t-label hidden sm:block ${
                  active ? "text-ink" : done ? "text-ink-muted" : "text-ink-faint"
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 ? (
              <span className={`mx-3 h-px flex-1 ${done ? "bg-seal" : "bg-hairline"}`} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
