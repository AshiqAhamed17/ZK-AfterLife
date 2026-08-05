"use client";
import { useState } from "react";

// Data row (design.md §6): sharp-cornered row, mono label left, mono tabular
// value right. Addresses truncate to 0x1234··abcd and copy the full value on click.
export type DataRowProps = {
  label: string;
  value?: string;
  address?: string; // when set: show truncated, copy the full address
  copy?: boolean; // when set: make `value` click-to-copy
  className?: string;
};

function truncate(a: string) {
  return a.length > 12 ? `${a.slice(0, 6)}··${a.slice(-4)}` : a;
}

export default function DataRow({
  label,
  value,
  address,
  copy = false,
  className = "",
}: DataRowProps) {
  const [copied, setCopied] = useState(false);
  const full = address ?? value ?? "";
  const display = address ? truncate(address) : value ?? "";
  const canCopy = Boolean((address || copy) && full);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard unavailable; leave the value visible
    }
  };

  return (
    <div
      className={`flex items-center justify-between gap-4 border-b border-hairline py-3 last:border-b-0 ${className}`}
    >
      <span className="t-label">{label}</span>
      {canCopy ? (
        <button
          onClick={onCopy}
          className="group inline-flex items-center gap-2 font-mono text-[15px] tabular-nums text-ink transition-colors hover:text-seal"
        >
          {display}
          <span className="t-caption text-ink-faint group-hover:text-seal">
            {copied ? "copied" : "copy"}
          </span>
        </button>
      ) : (
        <span className="font-mono text-[15px] tabular-nums text-ink">{display}</span>
      )}
    </div>
  );
}
