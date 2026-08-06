export default function TermsPage() {
  return (
    <main className="mx-auto max-w-[680px] px-6 py-16 sm:py-24">
      <div className="t-eyebrow mb-3">LEGAL</div>
      <h1 className="t-h1 mb-4">Terms of Service</h1>
      <p className="t-caption mb-12">Last updated August 6, 2026</p>

      <div className="space-y-10">
        <section>
          <h2 className="t-h2 mb-3">1. What you&apos;re agreeing to</h2>
          <p className="t-body text-ink-muted">
            By using ZK-AfterLife, you agree to these terms. If you don&apos;t agree,
            don&apos;t use the app. This is experimental software, provided as-is, with
            no warranty of any kind.
          </p>
        </section>

        <section>
          <h2 className="t-h2 mb-3">2. What this is, and isn&apos;t</h2>
          <p className="t-body text-ink-muted">
            ZK-AfterLife is a non-custodial smart-contract protocol for
            inactivity-triggered asset distribution. Sealing a will here is a technical
            action, not a substitute for a legal will, and inactivity is not proof of
            death — it&apos;s a proxy you choose to rely on. Talk to a lawyer for anything
            that needs to hold up in court.
          </p>
        </section>

        <section>
          <h2 className="t-h2 mb-3">3. Experimental, unaudited software</h2>
          <p className="t-body text-ink-muted">
            The contracts, circuits, and app that make up ZK-AfterLife have not been
            professionally audited. They may contain bugs, including bugs that cause
            loss of funds. Deployments referenced by this app may run on testnets with
            demo-scale timing, not production values. Use only funds you can afford to
            lose.
          </p>
        </section>

        <section>
          <h2 className="t-h2 mb-3">4. Your responsibilities</h2>
          <p className="t-body mb-3 text-ink-muted">You are solely responsible for:</p>
          <ul className="t-body list-disc space-y-2 pl-5 text-ink-muted">
            <li>Securing your wallet and private keys.</li>
            <li>Entering correct beneficiary addresses and allocations.</li>
            <li>Checking in as often as your chosen inactivity window requires.</li>
            <li>Understanding gas costs before you send a transaction.</li>
            <li>Verifying you&apos;re interacting with the correct, current contract addresses.</li>
          </ul>
        </section>

        <section>
          <h2 className="t-h2 mb-3">5. No custody, no recovery</h2>
          <p className="t-body text-ink-muted">
            We never hold your assets and cannot recover them for you. If you lose a
            private key, misconfigure a will, or send funds to the wrong address,
            there&apos;s no support desk that can reverse it — that&apos;s how
            self-custodial, on-chain systems work.
          </p>
        </section>

        <section>
          <h2 className="t-h2 mb-3">6. Third-party dependencies</h2>
          <p className="t-body text-ink-muted">
            This protocol depends on third-party infrastructure — Self Protocol for
            identity verification, RPC providers for chain access, and the underlying
            blockchains themselves. We aren&apos;t responsible for their outages, policy
            changes, or failures.
          </p>
        </section>

        <section>
          <h2 className="t-h2 mb-3">7. No liability</h2>
          <p className="t-body text-ink-muted">
            To the maximum extent permitted by law, ZK-AfterLife and its contributors
            are not liable for any loss arising from your use of the protocol,
            including smart-contract bugs, zero-knowledge circuit errors, lost keys, or
            third-party service failures.
          </p>
        </section>

        <section>
          <h2 className="t-h2 mb-3">8. Acceptable use</h2>
          <p className="t-body text-ink-muted">
            Don&apos;t use ZK-AfterLife for illegal purposes, to launder funds, or to
            defraud beneficiaries. We have no ability to freeze or reverse on-chain
            activity — the enforcement here is the code, not us.
          </p>
        </section>

        <section>
          <h2 className="t-h2 mb-3">9. Changes to these terms</h2>
          <p className="t-body text-ink-muted">
            We may update these terms as the protocol evolves; the date above will
            reflect that. Continued use after an update means you accept the new terms.
          </p>
        </section>

        <section>
          <h2 className="t-h2 mb-3">10. Open source</h2>
          <p className="t-body text-ink-muted">
            ZK-AfterLife&apos;s contracts, circuits, and frontend are open source. You&apos;re
            welcome to read, audit, and fork the code — see the GitHub link in the
            footer.
          </p>
        </section>
      </div>

      <p className="t-caption mt-12 border-t border-hairline pt-6">
        ZK-AfterLife is experimental, unaudited software provided with no warranty. See
        the{" "}
        <a href="/privacy" className="text-ink underline hover:text-seal">
          Privacy Policy
        </a>{" "}
        for how the protocol handles data.
      </p>
    </main>
  );
}
