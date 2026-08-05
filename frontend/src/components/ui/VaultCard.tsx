// Vault card (design.md §6): surface-1 + 1px hairline, mono eyebrow top-left,
// optional right-hand slot (a badge or seal), optional interactive hover.
export type VaultCardProps = {
  eyebrow?: string;
  action?: React.ReactNode;
  interactive?: boolean;
  className?: string;
  children: React.ReactNode;
};

export default function VaultCard({
  eyebrow,
  action,
  interactive = false,
  className = "",
  children,
}: VaultCardProps) {
  return (
    <div
      className={`rounded-card border border-hairline bg-surface-1 p-6 sm:p-8 ${
        interactive ? "transition-colors hover:border-seal hover:bg-surface-2" : ""
      } ${className}`}
    >
      {eyebrow || action ? (
        <div className="mb-5 flex items-center justify-between gap-4">
          {eyebrow ? <span className="t-eyebrow">{eyebrow}</span> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </div>
  );
}
