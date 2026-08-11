import Link from "next/link";
import Button from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";

export default function Withdraw() {
  return (
    <main className="mx-auto max-w-[680px] px-6 py-16 sm:py-24">
      <div className="t-eyebrow mb-3">WITHDRAW</div>
      <h1 className="t-h1 mb-6">There is no way to unseal a will.</h1>

      <p className="t-body-l mb-6 text-ink-muted">
        Earlier versions of this app let an owner pull ETH back out of a
        sealed will before it executed. That function is gone on purpose.
      </p>

      <p className="t-body mb-6 text-ink-muted">
        <code className="font-mono text-[14px] text-ink">InheritanceRegistry</code>{" "}
        has no owner-recall function once a will is registered. Once you seal
        a will, the assets stay locked until the protocol itself moves
        them — either back to beneficiaries after execution, or never. This
        is a deliberate trust property: a will you can unilaterally unseal
        isn&apos;t really sealed. The people counting on it should be able to
        trust that you can&apos;t change your mind under pressure, and that no
        bug or compromised key lets anyone else pull the funds back out early
        either.
      </p>

      <p className="t-body mb-10 text-ink-muted">
        If you sealed a will by mistake, the honest options are: keep checking
        in so it never lapses, or accept that it will eventually execute and
        distribute to the beneficiaries you named.
      </p>

      <div className="flex flex-wrap gap-3 border-t border-hairline pt-8">
        <Link href="/execute">
          <Button variant="secondary">
            Execute a will <ArrowRight size={16} />
          </Button>
        </Link>
        <Link href="/claims">
          <Button variant="secondary">
            Claim your share <ArrowRight size={16} />
          </Button>
        </Link>
        <Link href="/checkin">
          <Button>
            Check in <ArrowRight size={16} />
          </Button>
        </Link>
      </div>
    </main>
  );
}
