import type { Metadata } from "next";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import Field from "@/components/ui/Field";
import VaultCard from "@/components/ui/VaultCard";
import DataRow from "@/components/ui/DataRow";
import StatTile from "@/components/ui/StatTile";
import Pulse from "@/components/ui/Pulse";
import Commitment from "@/components/ui/Commitment";

export const metadata: Metadata = {
  title: "Styleguide · ZK-AfterLife",
  description: "Design tokens and type scale for the Quiet Cryptography system.",
};

/* -- small building blocks -------------------------------------------------- */

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-hairline py-16">
      <div className="t-eyebrow mb-3">{eyebrow}</div>
      <h2 className="t-h2 mb-8">{title}</h2>
      {children}
    </section>
  );
}

function Swatch({
  name,
  value,
  note,
  ring,
}: {
  name: string;
  value: string;
  note?: string;
  ring?: boolean;
}) {
  return (
    <div>
      <div
        className="h-20 w-full rounded-card"
        style={{
          background: value,
          boxShadow: ring ? "inset 0 0 0 1px var(--color-hairline)" : undefined,
        }}
      />
      <div className="mt-2 t-data text-ink">{name}</div>
      <div className="t-caption">{value}</div>
      {note ? <div className="t-caption text-ink-faint">{note}</div> : null}
    </div>
  );
}

/* -- page ------------------------------------------------------------------- */

export default function Styleguide() {
  const base = [
    { name: "bg", value: "#0c0c0e", note: "app canvas", ring: true },
    { name: "surface-1", value: "#141416", note: "raised card", ring: true },
    { name: "surface-2", value: "#1a1b1e", note: "nested / hover", ring: true },
    { name: "hairline", value: "#26272b", note: "1px borders" },
  ];
  const ink = [
    { name: "ink", value: "#f5f3ee", note: "primary text" },
    { name: "ink-muted", value: "#9ba1aa", note: "secondary" },
    { name: "ink-faint", value: "#5c616b", note: "tertiary / disabled" },
  ];
  const accent = [
    { name: "seal", value: "#d8b26a", note: "brand accent" },
    { name: "seal-hi", value: "#eac98a", note: "hover / highlight" },
  ];
  const status = [
    { name: "alive", value: "#5ce1a6", note: "liveness" },
    { name: "grace", value: "#e5a94d", note: "grace / caution" },
    { name: "danger", value: "#e5544b", note: "execute / destructive" },
  ];

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-20 md:px-16">
      {/* Header */}
      <div className="t-eyebrow mb-4">ZK-AFTERLIFE · DESIGN SYSTEM</div>
      <h1 className="t-display mb-4">
        Quiet <span className="italic">Cryptography</span>
      </h1>
      <p className="t-body-l max-w-[560px] text-ink-muted">
        The cold precision of cryptography, in service of a warm human act · passing
        on what matters, privately. Every token and type role below is drawn from{" "}
        <span className="t-data text-ink">design.md</span>.
      </p>

      {/* Cinematic light demo */}
      <Section eyebrow="Atmosphere" title="Cinematic light, not flat fills">
        <div
          className="relative h-64 overflow-hidden rounded-card border border-hairline"
          style={{
            background:
              "radial-gradient(120% 80% at 30% 10%, rgba(216,178,106,0.16), transparent 55%), radial-gradient(120% 90% at 80% 100%, var(--cool-glow), transparent 55%), #0c0c0e",
          }}
        >
          <div className="absolute bottom-6 left-6">
            <div className="t-eyebrow mb-2">The hero canvas</div>
            <div className="t-h1">
              Pass on what matters. <span className="italic text-seal">Privately.</span>
            </div>
          </div>
        </div>
      </Section>

      {/* Color */}
      <Section eyebrow="Color" title="Tokens">
        <div className="space-y-10">
          {[
            { label: "Base · obsidian", items: base },
            { label: "Ink · heirloom paper", items: ink },
            { label: "Accent · seal gold", items: accent },
            { label: "Semantic status", items: status },
          ].map((group) => (
            <div key={group.label}>
              <div className="t-label mb-4">{group.label}</div>
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
                {group.items.map((s) => (
                  <Swatch key={s.name} {...s} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Typography */}
      <Section eyebrow="Typography" title="Three voices, one type scale">
        <div className="space-y-8">
          {[
            { cls: "t-display", label: "Display · serif 60/64", sample: "Pass on what matters" },
            { cls: "t-h1", label: "H1 · serif 40/46", sample: "Your wishes, sealed" },
            { cls: "t-h2", label: "H2 · sans 26/32 · 600", sample: "Name your beneficiaries" },
            { cls: "t-h3", label: "H3 · sans 19/26 · 600", sample: "Grace period" },
            { cls: "t-body-l", label: "Body-L · sans 18/30", sample: "A calm, exact sentence that reads like an estate letter · never a DeFi dashboard." },
            { cls: "t-body", label: "Body · sans 15/24", sample: "Sensitive values stay sealed until they are needed." },
          ].map((r) => (
            <div key={r.cls} className="grid grid-cols-1 gap-2 md:grid-cols-[220px_1fr] md:items-baseline">
              <div className="t-caption">{r.label}</div>
              <div className={r.cls}>{r.sample}</div>
            </div>
          ))}

          <div className="grid grid-cols-1 gap-2 md:grid-cols-[220px_1fr] md:items-baseline">
            <div className="t-caption">Eyebrow · mono 13 · caps</div>
            <div className="t-eyebrow">01 · SEAL A WILL</div>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[220px_1fr] md:items-baseline">
            <div className="t-caption">Data · mono 15 · tabular</div>
            <div className="t-data text-ink">0x9f3a··4e21 · 4.250000 ETH · GRACE 29d</div>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[220px_1fr] md:items-baseline">
            <div className="t-caption">Caption · mono 12</div>
            <div className="t-caption">Sealed commitment · resolves on your view only</div>
          </div>
        </div>
      </Section>

      {/* Radius */}
      <Section eyebrow="Form" title="Radius & surfaces">
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          {[
            { label: "card · 10px", cls: "rounded-card" },
            { label: "control · 8px", cls: "rounded-control" },
            { label: "pill · 999px", cls: "rounded-pill" },
            { label: "sharp · 0 (data)", cls: "rounded-none" },
          ].map((r) => (
            <div key={r.label}>
              <div className={`h-20 w-full border border-hairline bg-surface-1 ${r.cls}`} />
              <div className="mt-2 t-data text-ink">{r.label}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Buttons */}
      <Section eyebrow="Component" title="Button">
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="primary">Seal a will</Button>
          <Button variant="secondary">How it works</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="destructive">Execute will</Button>
          <Button variant="primary" loading>
            Sealing
          </Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </div>
        <p className="t-body mt-6 max-w-[560px] text-ink-muted">
          One seal-gold primary per view. Secondary is a hairline outline, ghost is
          text only, destructive turns solid on hover. Focus shows the seal ring.
        </p>
      </Section>

      {/* Status badge */}
      <Section eyebrow="Component" title="Status badge">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge tone="alive" dot>Active</StatusBadge>
          <StatusBadge tone="grace">Grace · 29d</StatusBadge>
          <StatusBadge tone="seal">Sealed</StatusBadge>
          <StatusBadge tone="neutral">Executed</StatusBadge>
          <StatusBadge tone="danger">Vetoed</StatusBadge>
        </div>
      </Section>

      {/* Field */}
      <Section eyebrow="Component" title="Field">
        <div className="grid max-w-[520px] gap-6">
          <Field label="Beneficiary name" placeholder="e.g. Priya" />
          <Field label="Ethereum address" placeholder="0x..." mono />
          <Field
            label="ETH amount"
            placeholder="0.0"
            mono
            error="Amount exceeds your sealed balance."
          />
        </div>
      </Section>

      {/* Card primitives */}
      <Section eyebrow="Component" title="Vault card · data row · stat tile">
        <div className="grid gap-6 md:grid-cols-2">
          <VaultCard
            eyebrow="Sealed will"
            action={<StatusBadge tone="alive" dot>Active</StatusBadge>}
          >
            <DataRow label="Commitment" address="0x9f3ad4c2b1e04e21aa77bc41" />
            <DataRow label="Owner" address="0x1234ab56cd78ef90aa11bb22" />
            <DataRow label="Total ETH" value="4.250000" />
            <DataRow label="Beneficiaries" value="3" />
          </VaultCard>
          <div className="grid grid-cols-2 gap-6">
            <StatTile label="Assets sealed" value="4.25" unit="ETH" />
            <StatTile label="Beneficiaries" value="3" />
            <StatTile label="Next check-in" value="29" unit="days" />
            <StatTile label="Grace window" value="30" unit="days" />
          </div>
        </div>
      </Section>

      {/* Signature: Pulse */}
      <Section eyebrow="Signature" title="The Pulse">
        <div className="max-w-[520px] space-y-8">
          <div>
            <div className="t-label mb-2">Alive · steady green beat</div>
            <Pulse state="alive" />
          </div>
          <div>
            <div className="t-label mb-2">Grace · slower amber</div>
            <Pulse state="grace" />
          </div>
          <div>
            <div className="t-label mb-2">Flat · inactive / executed</div>
            <Pulse state="flat" />
          </div>
        </div>
        <p className="t-body mt-6 max-w-[560px] text-ink-muted">
          The line&apos;s color and rhythm are the account status, not decoration.
          Reduced-motion shows a still trace with the text label.
        </p>
      </Section>

      {/* Signature: Commitment */}
      <Section eyebrow="Signature" title="The Seal">
        <div className="flex flex-col gap-5">
          <Commitment value="0x9f3ad4c2b1e04e21" revealable label="Commitment" />
          <Commitment value="4.250000 ETH" revealable label="Your share" />
        </div>
        <p className="t-body mt-6 max-w-[560px] text-ink-muted">
          Click to resolve a sealed value. On your authenticated view it decrypts;
          to everyone else it stays sealed.
        </p>
      </Section>

      {/* Accent usage reminder */}
      <Section eyebrow="Discipline" title="One accent, used sparingly">
        <div className="flex flex-wrap items-center gap-4">
          <button className="rounded-control bg-seal px-5 py-3 font-mono text-[13px] font-medium uppercase tracking-wide text-bg">
            Seal a will
          </button>
          <button className="rounded-control border border-hairline px-5 py-3 font-mono text-[13px] font-medium uppercase tracking-wide text-ink transition-colors hover:border-seal">
            How it works
          </button>
          <span className="rounded-pill border border-alive px-3 py-1 t-caption text-alive">
            ACTIVE
          </span>
          <span className="rounded-pill border border-grace px-3 py-1 t-caption text-grace">
            GRACE · 29d
          </span>
          <span className="rounded-pill border border-danger px-3 py-1 t-caption text-danger">
            EXECUTE
          </span>
        </div>
        <p className="t-body mt-6 max-w-[560px] text-ink-muted">
          Seal gold is the only brand-filled element · one primary action per view.
          Green and red are status only, never decoration.
        </p>
      </Section>
    </main>
  );
}
