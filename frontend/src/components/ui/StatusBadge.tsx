// Status badge (design.md §6): pill, 1px border in the status color, no fill,
// mono uppercase label. Color always pairs with the text label (never color alone).
export type BadgeTone = "alive" | "grace" | "danger" | "seal" | "neutral";

const TONE: Record<BadgeTone, string> = {
  alive: "border-alive text-alive",
  grace: "border-grace text-grace",
  danger: "border-danger text-danger",
  seal: "border-seal text-seal",
  neutral: "border-hairline text-ink-muted",
};

export default function StatusBadge({
  tone = "neutral",
  dot = false,
  children,
  className = "",
}: {
  tone?: BadgeTone;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill border px-3 py-1 font-mono text-[12px] uppercase tracking-wide ${TONE[tone]} ${className}`}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-pill bg-current" /> : null}
      {children}
    </span>
  );
}
