"use client";

import { useWallet } from "@/lib/WalletContext";
import Button from "@/components/ui/Button";
import VaultCard from "@/components/ui/VaultCard";
import DataRow from "@/components/ui/DataRow";
import StatTile from "@/components/ui/StatTile";
import Pulse from "@/components/ui/Pulse";
import Link from "next/link";
import { ArrowRight, FileSignature, HeartPulse, PlayCircle, Ban } from "lucide-react";

const ACTIONS = [
  { href: "/register", title: "Seal a will", body: "Name beneficiaries and lock assets behind a commitment.", Icon: FileSignature },
  { href: "/checkin", title: "Check in", body: "Prove you are still here and reset the inactivity clock.", Icon: HeartPulse },
  { href: "/execute", title: "Execute", body: "After grace, prove and distribute the sealed shares.", Icon: PlayCircle },
  { href: "/veto", title: "Veto", body: "A trusted circle can stop a false alarm during grace.", Icon: Ban },
];

function truncate(a: string) {
  return `${a.slice(0, 6)}··${a.slice(-4)}`;
}

export default function AppHome() {
  const { isConnected, account, balance, connectWallet, isLoading } = useWallet();

  if (!isConnected) {
    return (
      <main className="mx-auto max-w-[1200px] px-6 py-24">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-8 w-40">
            <Pulse state="flat" height={40} />
          </div>
          <h1 className="t-h1 mb-3">Connect to see your dashboard</h1>
          <p className="t-body mb-8 text-ink-muted">
            Your wallet is how you seal, check in on, and execute a will.
          </p>
          <Button onClick={connectWallet} loading={isLoading}>
            Connect wallet
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1200px] px-6 py-12">
      <div className="t-eyebrow mb-3">DASHBOARD</div>
      <h1 className="t-h1 mb-10">Your inheritance, at a glance.</h1>

      {/* Liveness hero */}
      <VaultCard eyebrow="Liveness" className="mb-8">
        <div className="grid gap-8 md:grid-cols-[1fr_320px] md:items-center">
          <div>
            <Pulse state="alive" height={72} />
            <p className="t-body mt-5 text-ink-muted">
              Check in regularly to keep your will sealed. If you go quiet, a grace
              period begins before anything can execute.
            </p>
            <div className="mt-6">
              <Link href="/checkin">
                <Button>
                  Check in
                  <ArrowRight size={16} />
                </Button>
              </Link>
            </div>
          </div>
          <div className="rounded-card border border-hairline p-5">
            <DataRow label="Wallet" address={account ?? ""} />
            <DataRow label="Balance" value={`${parseFloat(balance || "0").toFixed(4)} ETH`} />
          </div>
        </div>
      </VaultCard>

      {/* Stat tiles (placeholder counts until data wiring in Phase 1d) */}
      <div className="mb-12 grid grid-cols-2 gap-5 lg:grid-cols-4">
        <StatTile label="Wills sealed" value="0" />
        <StatTile label="Beneficiaries" value="0" />
        <StatTile label="Executed" value="0" />
        <StatTile label="Vetoes" value="0" />
      </div>

      {/* Actions */}
      <div className="t-eyebrow mb-5">ACTIONS</div>
      <div className="grid gap-5 sm:grid-cols-2">
        {ACTIONS.map(({ href, title, body, Icon }) => (
          <Link key={href} href={href} className="block">
            <VaultCard interactive className="h-full">
              <div className="flex items-start justify-between">
                <Icon size={22} strokeWidth={1.5} className="text-ink-muted" />
                <ArrowRight size={18} className="text-ink-faint" />
              </div>
              <h3 className="t-h3 mt-4">{title}</h3>
              <p className="t-body mt-2 text-ink-muted">{body}</p>
            </VaultCard>
          </Link>
        ))}
      </div>
    </main>
  );
}
