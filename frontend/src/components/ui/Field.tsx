"use client";
import { useId } from "react";

// Form field (design.md §6): mono uppercase label, input on surface-1 with a
// hairline that turns to the seal ring on focus, mono for address/amount inputs,
// inline validation in danger with a plain fix instruction.
export type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  mono?: boolean;
};

export default function Field({
  label,
  hint,
  error,
  mono = false,
  id,
  className = "",
  ...props
}: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className="w-full">
      <label htmlFor={inputId} className="t-eyebrow mb-2 block">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={!!error || undefined}
        className={`h-11 w-full rounded-control border bg-surface-1 px-3 text-ink placeholder:text-ink-faint ${
          mono ? "font-mono tabular-nums" : ""
        } ${error ? "border-danger" : "border-hairline"} ${className}`}
        {...props}
      />
      {error ? (
        <p className="t-caption mt-1.5 text-danger">{error}</p>
      ) : hint ? (
        <p className="t-caption mt-1.5">{hint}</p>
      ) : null}
    </div>
  );
}
