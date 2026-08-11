"use client";

import { useWallet } from "@/lib/WalletContext";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import VaultCard from "@/components/ui/VaultCard";
import Field from "@/components/ui/Field";
import Pulse from "@/components/ui/Pulse";
import { Coins } from "lucide-react";
import { useState } from "react";
import { parseEther, parseUnits, type Hex } from "viem";

const USDC_DECIMALS = 6;

export default function Claims() {
  const { isConnected, claim, connectWallet, isLoading, error } = useWallet();
  const toast = useToast();

  const [willCommitment, setWillCommitment] = useState("");
  const [ethAmount, setEthAmount] = useState("");
  const [usdcAmount, setUsdcAmount] = useState("");
  const [leafIndex, setLeafIndex] = useState("0");
  const [siblings, setSiblings] = useState(["", "", ""]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localError, setLocalError] = useState("");

  const updateSibling = (i: number, value: string) => {
    setSiblings((prev) => prev.map((s, idx) => (idx === i ? value : s)));
  };

  const isValidBytes32 = (v: string) => /^0x[0-9a-fA-F]{64}$/.test(v.trim());

  const handleClaim = async () => {
    setLocalError("");
    if (!isConnected) {
      setLocalError("Please connect your wallet first");
      return;
    }
    if (!isValidBytes32(willCommitment)) {
      setLocalError("Will commitment must be a 32-byte hex value (0x + 64 hex chars).");
      return;
    }
    if (siblings.some((s) => !isValidBytes32(s))) {
      setLocalError("All three sibling hashes must be 32-byte hex values.");
      return;
    }
    const idx = parseInt(leafIndex, 10);
    if (Number.isNaN(idx) || idx < 0 || idx > 7) {
      setLocalError("Leaf index must be between 0 and 7.");
      return;
    }
    if (!ethAmount && !usdcAmount) {
      setLocalError("Enter your ETH and/or USDC share.");
      return;
    }

    setIsProcessing(true);
    try {
      const ethWei = ethAmount ? parseEther(ethAmount) : 0n;
      const usdcBaseUnits = usdcAmount ? parseUnits(usdcAmount, USDC_DECIMALS) : 0n;
      await claim(
        willCommitment as Hex,
        ethWei,
        usdcBaseUnits,
        BigInt(idx),
        siblings as [Hex, Hex, Hex]
      );
      toast("Claim sent. Your share is on the way.", "alive");
      setWillCommitment("");
      setEthAmount("");
      setUsdcAmount("");
      setLeafIndex("0");
      setSiblings(["", "", ""]);
    } catch (err) {
      console.error("Failed to claim:", err);
      setLocalError(err instanceof Error ? err.message : "Failed to claim");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isConnected) {
    return (
      <main className="mx-auto max-w-[1200px] px-6 py-24">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-8 w-40">
            <Pulse state="flat" height={40} />
          </div>
          <h1 className="t-h1 mb-3">Connect to claim your share</h1>
          <p className="t-body mb-8 text-ink-muted">
            You&apos;ll need the claim details the will owner shared with you.
          </p>
          <Button onClick={connectWallet} loading={isLoading}>
            Connect wallet
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[720px] px-6 py-12">
      <div className="t-eyebrow mb-3">CLAIMS</div>
      <h1 className="t-h1 mb-4">Claim your share.</h1>
      <p className="t-body mb-10 text-ink-muted">
        Beneficiary allocations are never public — only the will owner knows
        who you are and what you&apos;re owed. There&apos;s nothing to browse
        here; enter the claim details they gave you directly.
      </p>

      <VaultCard eyebrow="Claim details">
        <div className="space-y-5">
          <Field
            label="Will commitment"
            mono
            placeholder="0x..."
            value={willCommitment}
            onChange={(e) => setWillCommitment(e.target.value)}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Your ETH share"
              mono
              type="number"
              placeholder="0.0"
              value={ethAmount}
              onChange={(e) => setEthAmount(e.target.value)}
            />
            <Field
              label="Your USDC share"
              mono
              type="number"
              placeholder="0"
              value={usdcAmount}
              onChange={(e) => setUsdcAmount(e.target.value)}
            />
          </div>
          <Field
            label="Leaf index (0-7)"
            mono
            type="number"
            placeholder="0"
            value={leafIndex}
            onChange={(e) => setLeafIndex(e.target.value)}
          />
          {siblings.map((s, i) => (
            <Field
              key={i}
              label={`Sibling hash ${i + 1} of 3`}
              mono
              placeholder="0x..."
              value={s}
              onChange={(e) => updateSibling(i, e.target.value)}
            />
          ))}
        </div>

        <div className="mt-6 border-t border-hairline pt-5">
          <Button onClick={handleClaim} loading={isProcessing}>
            <Coins size={15} /> Claim
          </Button>
        </div>
      </VaultCard>

      {(localError || error) && <p className="t-caption mt-6 text-danger">{localError || error}</p>}

      <p className="t-caption mt-8 max-w-[640px]">
        Claiming verifies your exact share against the will&apos;s sealed
        Merkle root and transfers it to your connected wallet. On a public
        chain, claiming reveals the amount you claimed — that&apos;s the one
        privacy trade-off of this phase; full execution privacy is the Aztec track.
      </p>
    </main>
  );
}
