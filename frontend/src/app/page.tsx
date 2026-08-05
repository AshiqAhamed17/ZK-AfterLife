import Button from "@/components/ui/Button";
import VaultCard from "@/components/ui/VaultCard";
import DataRow from "@/components/ui/DataRow";
import Commitment from "@/components/ui/Commitment";
import StatusBadge from "@/components/ui/StatusBadge";
import Pulse from "@/components/ui/Pulse";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const STEPS = [
  {
    n: "01",
    title: "Seal",
    body: "Name your beneficiaries and their shares. We turn them into a single commitment and lock the assets. Nothing about the plan is visible on-chain.",
    detail: ["On-chain", "commitment only"],
  },
  {
    n: "02",
    title: "Check in",
    body: "A periodic check-in proves you are still here. Miss it, and a grace period begins, with a veto window for a trusted circle to stop a false alarm.",
    detail: ["Inactivity", "grace + veto window"],
  },
  {
    n: "03",
    title: "Execute",
    body: "After the grace period, a zero-knowledge proof distributes the exact shares to each beneficiary. Correctness, proven without disclosure.",
    detail: ["Proof", "verified on-chain"],
  },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-[1200px] px-6">
      {/* Hero */}
      <section
        className="relative mt-6 overflow-hidden rounded-[20px] border border-hairline"
        style={{
          background:
            "radial-gradient(120% 80% at 25% 8%, rgba(216,178,106,0.16), transparent 55%), radial-gradient(120% 90% at 85% 100%, var(--cool-glow), transparent 55%), #0c0c0e",
        }}
      >
        {/* ambient pulse */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 opacity-40">
          <Pulse state="alive" height={140} />
        </div>

        <div className="relative px-6 py-24 sm:px-14 sm:py-32">
          <div className="t-eyebrow mb-6">ZERO-KNOWLEDGE INHERITANCE</div>
          <h1 className="t-display max-w-[16ch]">
            Pass on what matters. <span className="italic text-seal">Privately.</span>
          </h1>
          <p className="t-body-l mt-6 max-w-[52ch] text-ink-muted">
            Seal a will during your life. If you go quiet, it executes on its own,
            distributing your assets without ever revealing who gets what.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link href="/register">
              <Button>
                Seal a will
                <ArrowRight size={16} />
              </Button>
            </Link>
            <Link href="#how">
              <Button variant="secondary">How it works</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Sealed-will artifact */}
      <section className="mt-8 grid gap-8 md:grid-cols-[1fr_1fr] md:items-center">
        <div>
          <div className="t-eyebrow mb-4">THE ARTIFACT</div>
          <h2 className="t-h1 mb-4">A will you can prove, but no one can read.</h2>
          <p className="t-body text-ink-muted">
            On a public chain, your plan lives only as a commitment. Amounts and
            beneficiaries stay sealed until they are needed, and even then only the
            rightful claimant resolves their own share.
          </p>
        </div>
        <VaultCard
          eyebrow="Sealed will"
          action={
            <StatusBadge tone="alive" dot>
              Active
            </StatusBadge>
          }
        >
          <DataRow label="Commitment" address="0x9f3ad4c2b1e04e21aa77bc41" />
          <DataRow label="Beneficiaries" value="3" />
          <div className="flex items-center justify-between border-b border-hairline py-3 last:border-b-0">
            <span className="t-label">Your share</span>
            <Commitment value="4.250000 ETH" revealable label="Your share" />
          </div>
          <DataRow label="Status" value="Sealed until execution" />
        </VaultCard>
      </section>

      {/* Numbered sequence */}
      <section id="how" className="mt-28 scroll-mt-20">
        <div className="t-eyebrow mb-10">HOW IT WORKS</div>
        <div>
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="grid gap-6 border-t border-hairline py-12 md:grid-cols-[120px_1fr_240px] md:gap-12"
            >
              <div className="t-h1 text-seal">{s.n}</div>
              <div>
                <h3 className="t-h2 mb-3">{s.title}</h3>
                <p className="t-body max-w-[52ch] text-ink-muted">{s.body}</p>
              </div>
              <div className="flex items-start md:justify-end">
                <div className="flex items-center gap-2 font-mono text-[13px] text-ink-faint">
                  <span className="text-ink-muted">{s.detail[0]}</span>
                  <span>·</span>
                  <span>{s.detail[1]}</span>
                </div>
              </div>
            </div>
          ))}
          <div className="border-t border-hairline" />
        </div>
      </section>

      {/* Closing */}
      <section className="mt-24 mb-24">
        <div
          className="relative overflow-hidden rounded-[20px] border border-hairline px-6 py-20 text-center sm:px-14"
          style={{
            background:
              "radial-gradient(90% 120% at 50% 0%, rgba(216,178,106,0.12), transparent 60%), #0c0c0e",
          }}
        >
          <h2 className="t-h1 mx-auto max-w-[22ch]">
            Your wishes, sealed until they are needed.
          </h2>
          <div className="mt-8 flex justify-center">
            <Link href="/register">
              <Button>
                Seal a will
                <ArrowRight size={16} />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
