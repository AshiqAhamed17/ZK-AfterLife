import { Github } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-hairline">
      <div className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md">
            <Link
              href="/"
              className="inline-flex items-center gap-2 font-mono text-[15px] font-medium uppercase tracking-[0.12em] text-ink"
            >
              <span className="h-1.5 w-1.5 rounded-pill bg-seal" />
              ZK·Afterlife
            </Link>
            <p className="t-body mt-4 text-ink-muted">
              Pass on what matters, privately. A zero-knowledge inheritance protocol.
            </p>
            <p className="t-caption mt-3">
              On a public rollup, individual claims reveal their own amounts at claim
              time. Full execution privacy is the Aztec track.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <span className="t-eyebrow">Links</span>
            <a
              href="https://github.com/AshiqAhamed17/ZK-AfterLife"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 font-sans text-[14px] text-ink-muted transition-colors hover:text-ink"
            >
              <Github size={15} /> GitHub
            </a>
            <Link
              href="/privacy"
              className="font-sans text-[14px] text-ink-muted transition-colors hover:text-ink"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="font-sans text-[14px] text-ink-muted transition-colors hover:text-ink"
            >
              Terms
            </Link>
          </div>
        </div>

        <div className="mt-10 border-t border-hairline pt-6">
          <span className="t-caption">Noir · Self · EVM · not audited · testnet only</span>
        </div>
      </div>
    </footer>
  );
}
