// Design-system Button (design.md §6). Mono, uppercase, one seal-gold primary
// per view. "outline" is kept as an alias of "secondary" for existing pages.
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "destructive"
  | "outline";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "h-11 px-5 bg-seal text-bg hover:bg-seal-hi",
  secondary: "h-11 px-5 border border-hairline text-ink hover:border-seal",
  outline: "h-11 px-5 border border-hairline text-ink hover:border-seal",
  ghost: "h-11 px-3 text-ink hover:text-seal",
  destructive:
    "h-11 px-5 border border-danger text-danger hover:bg-danger hover:text-bg",
};

export default function Button({
  variant = "primary",
  loading = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex select-none items-center justify-center gap-2 rounded-control font-mono text-[13px] font-medium uppercase tracking-wide transition-colors disabled:pointer-events-none disabled:opacity-40";

  return (
    <button
      className={`${base} ${VARIANTS[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center gap-1" aria-label="Loading">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1 w-1 rounded-pill bg-current animate-pulse"
              style={{ animationDelay: `${i * 160}ms` }}
            />
          ))}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
