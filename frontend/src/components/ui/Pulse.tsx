// Signature: the Pulse (design.md §5.1). A living EKG line whose color + rhythm
// ARE the account status: alive (calm green beat), grace (slower amber), flat
// (inactive/executed, a still faint line). Reduced-motion shows a static trace.
export type PulseState = "alive" | "grace" | "flat";

const EKG =
  "M0 20 H60 l5 -12 l6 24 l5 -12 H130 l5 -12 l6 24 l5 -12 H240";

const CONFIG: Record<PulseState, { color: string; dur: string; label: string }> = {
  alive: { color: "var(--color-alive)", dur: "3.2s", label: "Active" },
  grace: { color: "var(--color-grace)", dur: "6s", label: "Grace period" },
  flat: { color: "var(--color-ink-faint)", dur: "0s", label: "Inactive" },
};

export default function Pulse({
  state = "alive",
  height = 48,
  className = "",
}: {
  state?: PulseState;
  height?: number;
  className?: string;
}) {
  const { color, dur, label } = CONFIG[state];
  const path = state === "flat" ? "M0 20 H240" : EKG;

  return (
    <svg
      viewBox="0 0 240 40"
      width="100%"
      height={height}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Status: ${label}`}
      className={className}
      style={{ color, display: "block" }}
    >
      <path
        className="pulse-base"
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        opacity={0.28}
      />
      {state !== "flat" ? (
        <path
          className="pulse-travel"
          d={path}
          pathLength={100}
          strokeDasharray="8 92"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          style={{
            ["--pulse-dur" as string]: dur,
            filter: "drop-shadow(0 0 6px currentColor)",
          }}
        />
      ) : null}
    </svg>
  );
}
