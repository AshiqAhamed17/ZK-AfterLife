"use client";

import { useWallet } from "@/lib/WalletContext";
import Button from "./ui/Button";
import Pulse from "./ui/Pulse";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const NAV = [
  { href: "/app", label: "Dashboard" },
  { href: "/register", label: "Seal" },
  { href: "/checkin", label: "Check-in" },
  { href: "/execute", label: "Execute" },
  { href: "/claims", label: "Claims" },
  { href: "/withdraw", label: "Withdraw" },
  { href: "/veto", label: "Veto" },
];

function formatAddress(a: string) {
  return `${a.slice(0, 6)}··${a.slice(-4)}`;
}

export default function Header() {
  const { isConnected, account, balance, connectWallet, disconnectWallet, isLoading } =
    useWallet();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const wallet = isConnected ? (
    <div className="flex items-center gap-3">
      {/* Pulse chip — resting brand motif; real per-account status wired in Phase 1d */}
      <span className="hidden w-10 sm:block" aria-hidden>
        <Pulse state="alive" height={18} />
      </span>
      <span className="font-mono text-[13px] tabular-nums text-ink-muted">
        {parseFloat(balance || "0").toFixed(3)} ETH
      </span>
      <span className="rounded-pill border border-hairline px-3 py-1 font-mono text-[12px] tabular-nums text-ink">
        {account ? formatAddress(account) : ""}
      </span>
      <Button variant="ghost" onClick={disconnectWallet} className="h-9 px-3">
        Disconnect
      </Button>
    </div>
  ) : (
    <Button onClick={connectWallet} disabled={isLoading} loading={isLoading} className="h-9 px-4">
      Connect wallet
    </Button>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-mono text-[15px] font-medium uppercase tracking-[0.12em] text-ink"
        >
          <span className="h-1.5 w-1.5 rounded-pill bg-seal" />
          ZK·Afterlife
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`font-sans text-[14px] transition-colors hover:text-ink ${
                  active ? "text-seal" : "text-ink-muted"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <span className="mx-1 h-4 w-px bg-hairline" />
          {wallet}
        </nav>

        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-control border border-hairline text-ink lg:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {menuOpen ? (
        <div className="border-t border-hairline bg-bg lg:hidden">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-1 px-6 py-4">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`py-2 font-sans text-[15px] ${
                    active ? "text-seal" : "text-ink-muted"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="mt-3 border-t border-hairline pt-4">{wallet}</div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
