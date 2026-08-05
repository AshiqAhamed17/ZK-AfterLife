// Stat tile (design.md §6): big mono tabular numeral over a mono eyebrow label.
// No gradient, no icon-in-a-colored-circle.
export type StatTileProps = {
  label: string;
  value: string;
  unit?: string;
  className?: string;
};

export default function StatTile({
  label,
  value,
  unit,
  className = "",
}: StatTileProps) {
  return (
    <div className={`rounded-card border border-hairline bg-surface-1 p-6 ${className}`}>
      <div className="t-eyebrow mb-3">{label}</div>
      <div className="font-mono text-[2rem] leading-none tabular-nums text-ink">
        {value}
        {unit ? <span className="ml-1.5 text-base text-ink-faint">{unit}</span> : null}
      </div>
    </div>
  );
}
