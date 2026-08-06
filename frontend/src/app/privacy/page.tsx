export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-[680px] px-6 py-16 sm:py-24">
      <div className="t-eyebrow mb-3">LEGAL</div>
      <h1 className="t-h1 mb-4">Privacy Policy</h1>
      <p className="t-caption mb-12">Last updated August 6, 2026</p>

      <div className="space-y-10">
        <section>
          <h2 className="t-h2 mb-3">1. What ZK-AfterLife is</h2>
          <p className="t-body text-ink-muted">
            ZK-AfterLife is a non-custodial protocol for sealing a digital inheritance,
            made of smart contracts on public blockchains and a client-side web app.
            There is no ZK-AfterLife server holding your data, your funds, or your will
            — the app runs in your browser and talks directly to the chain.
          </p>
        </section>

        <section>
          <h2 className="t-h2 mb-3">2. What we don&apos;t collect</h2>
          <p className="t-body text-ink-muted">
            We don&apos;t run accounts, don&apos;t ask for an email address, and don&apos;t
            operate a backend database. Proof generation happens on your device — your
            will&apos;s contents never leave your browser unencrypted.
          </p>
        </section>

        <section>
          <h2 className="t-h2 mb-3">3. What&apos;s public and what&apos;s private</h2>
          <p className="t-body mb-3 text-ink-muted">
            Everything written to a public blockchain is public and permanent, whether we
            intend it or not.
          </p>
          <ul className="t-body list-disc space-y-2 pl-5 text-ink-muted">
            <li>Your wallet address and transaction history are public, as on any chain.</li>
            <li>
              Your will&apos;s contents — beneficiaries and allocations — are stored only
              as a cryptographic commitment and Merkle root, sealed until execution.
            </li>
            <li>
              At execution, a zero-knowledge proof is verified on-chain; the underlying
              will data itself stays private.
            </li>
            <li>
              At claim time, each beneficiary&apos;s transaction reveals the amount they
              claimed to anyone watching the chain. This is a real limit of a public
              rollup, not an oversight — true execution privacy is our Aztec track,
              still in progress.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="t-h2 mb-3">4. Third parties involved</h2>
          <p className="t-body mb-3 text-ink-muted">
            A few external services sit between you and the chain:
          </p>
          <ul className="t-body list-disc space-y-2 pl-5 text-ink-muted">
            <li>
              <span className="text-ink">Self Protocol</span> verifies you&apos;re a real,
              unique adult without revealing your government ID to us. Refer to Self
              Protocol&apos;s own policies for how it handles identity data.
            </li>
            <li>
              <span className="text-ink">RPC providers</span> relay your transactions to
              the blockchain and can see your IP address and wallet activity, as with
              any application that talks to a chain.
            </li>
            <li>
              <span className="text-ink">Your wallet</span> stays entirely under your
              control — we never have access to your private key or seed phrase.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="t-h2 mb-3">5. Cookies and analytics</h2>
          <p className="t-body text-ink-muted">
            We don&apos;t use tracking cookies or third-party analytics on this app as of
            this writing. If that ever changes, this page will say so first.
          </p>
        </section>

        <section>
          <h2 className="t-h2 mb-3">6. Data retention</h2>
          <p className="t-body text-ink-muted">
            We don&apos;t hold your data because we don&apos;t collect any centrally. What&apos;s
            written to the blockchain stays there permanently and cannot be deleted —
            not by us, and not by anyone.
          </p>
        </section>

        <section>
          <h2 className="t-h2 mb-3">7. Your controls</h2>
          <p className="t-body text-ink-muted">
            You hold your keys, so you hold the controls. You can stop using the app at
            any time; nothing further happens on our end, because there was never
            anything stored on our end to begin with.
          </p>
        </section>

        <section>
          <h2 className="t-h2 mb-3">8. Changes to this policy</h2>
          <p className="t-body text-ink-muted">
            We&apos;ll update this page and the date above if anything changes. Since the
            app has no accounts, we have no way to email you about it — check back here.
          </p>
        </section>

        <section>
          <h2 className="t-h2 mb-3">9. Contact</h2>
          <p className="t-body text-ink-muted">
            Questions or concerns: open an issue on the GitHub repository linked in the
            footer. ZK-AfterLife is an independent, experimental project — see the{" "}
            <a href="/terms" className="text-ink underline hover:text-seal">
              Terms of Service
            </a>{" "}
            for the full disclaimer.
          </p>
        </section>
      </div>

      <p className="t-caption mt-12 border-t border-hairline pt-6">
        ZK-AfterLife is experimental, unaudited software. This page describes how the
        protocol handles data in good faith — it is not a substitute for professional
        legal advice.
      </p>
    </main>
  );
}
