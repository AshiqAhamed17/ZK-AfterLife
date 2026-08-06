"use client";

import { useWallet } from "@/lib/WalletContext";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import VaultCard from "@/components/ui/VaultCard";
import DataRow from "@/components/ui/DataRow";
import StatTile from "@/components/ui/StatTile";
import StatusBadge, { type BadgeTone } from "@/components/ui/StatusBadge";
import Commitment from "@/components/ui/Commitment";
import Pulse from "@/components/ui/Pulse";
import { Coins, Play, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

interface ExecutedWill {
  willCommitment: string;
  owner: string;
  executionTime: bigint;
  totalEth: string;
  totalUsdc: string;
  totalNfts: string;
  canClaim: boolean;
}

export default function Claims() {
  const {
    isConnected,
    account,
    getExecutedWillsForBeneficiary,
    claimFromExecutedWill,
    checkAndExecuteWills,
    executeWillSimple,
    executeWillAlternative,
    getAllRegisteredWills,
    connectWallet,
    isLoading,
    error,
  } = useWallet();
  const toast = useToast();

  const [executedWills, setExecutedWills] = useState<ExecutedWill[]>([]);
  const [isLoadingWills, setIsLoadingWills] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localError, setLocalError] = useState("");
  const [processingWill, setProcessingWill] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    if (isConnected && account) {
      loadExecutedWills();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, account]);

  const loadExecutedWills = async () => {
    if (!account) return;
    setIsLoadingWills(true);
    setLocalError("");
    try {
      console.log("Loading executed wills for beneficiary:", account);
      console.log("Checking for wills ready to execute...");
      await checkAndExecuteWills();
      const wills = await getExecutedWillsForBeneficiary(account);
      console.log("Found executed wills:", wills);
      setExecutedWills(wills);
    } catch (err) {
      console.error("Failed to load executed wills:", err);
      setLocalError("Failed to load executed wills. Please try again.");
    } finally {
      setIsLoadingWills(false);
    }
  };

  const handleManualExecute = async () => {
    if (!isConnected) {
      setLocalError("Please connect your wallet first");
      return;
    }
    setIsExecuting(true);
    setLocalError("");
    try {
      const registeredWills = await getAllRegisteredWills();
      if (!registeredWills || registeredWills.length === 0) {
        setLocalError("No registered wills found. Please register a will first.");
        return;
      }
      const willCommitment = registeredWills[0].willCommitment;
      console.log("Manually executing will:", willCommitment);
      let txHash;
      try {
        txHash = await executeWillSimple(willCommitment);
        console.log("Manual execution successful (main method):", txHash);
      } catch (mainError) {
        console.warn("Main execution failed, trying alternative method:", mainError);
        txHash = await executeWillAlternative(willCommitment);
        console.log("Manual execution successful (alternative method):", txHash);
      }
      toast("Will executed. Assets distributed.", "seal");
      setTimeout(() => loadExecutedWills(), 2000);
    } catch (err) {
      console.error("Failed to execute will with both methods:", err);
      setLocalError(err instanceof Error ? err.message : "Failed to execute will");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClaim = async (willCommitment: string) => {
    if (!isConnected) {
      setLocalError("Please connect your wallet first");
      return;
    }
    setIsProcessing(true);
    setProcessingWill(willCommitment);
    setLocalError("");
    try {
      const txHash = await claimFromExecutedWill(willCommitment);
      console.log("Claim successful with tx hash:", txHash);
      toast("Claim sent. Your share is on the way.", "alive");
      setTimeout(() => loadExecutedWills(), 2000);
    } catch (err) {
      console.error("Failed to claim:", err);
      setLocalError(err instanceof Error ? err.message : "Failed to claim ETH");
    } finally {
      setIsProcessing(false);
      setProcessingWill(null);
    }
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const formatEther = (wei: string) => {
    const eth = Number(wei) / 1e18;
    return eth.toFixed(4);
  };

  if (!isConnected) {
    return (
      <main className="mx-auto max-w-[1200px] px-6 py-24">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-8 w-40">
            <Pulse state="flat" height={40} />
          </div>
          <h1 className="t-h1 mb-3">Connect to claim your share.</h1>
          <p className="t-body mb-8 text-ink-muted">
            When a will you&apos;re named in executes, your share appears here to claim.
          </p>
          <Button onClick={connectWallet} loading={isLoading}>
            Connect wallet
          </Button>
        </div>
      </main>
    );
  }

  const statusFor = (w: ExecutedWill): { tone: BadgeTone; label: string } =>
    w.canClaim ? { tone: "alive", label: "Claimable" } : { tone: "neutral", label: "Claimed" };

  const claimableCount = executedWills.filter((w) => w.canClaim).length;
  const totalEthClaimable = executedWills
    .filter((w) => w.canClaim)
    .reduce((sum, w) => sum + parseFloat(w.totalEth), 0);

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-12">
      <div className="t-eyebrow mb-3">CLAIMS</div>
      <h1 className="t-h1 mb-10">Claim your share of a sealed will.</h1>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
        <StatTile label="Executed wills" value={isLoadingWills ? "…" : String(executedWills.length)} />
        <StatTile label="Claimable" value={isLoadingWills ? "…" : String(claimableCount)} />
        <StatTile
          label="Claimed"
          value={isLoadingWills ? "…" : String(executedWills.length - claimableCount)}
        />
        <StatTile
          label="Your share"
          value={isLoadingWills ? "…" : formatEther(totalEthClaimable.toString())}
          unit="ETH"
        />
      </div>

      {/* Actions */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row">
        <Button variant="secondary" onClick={loadExecutedWills} disabled={isLoadingWills}>
          <RefreshCw size={15} className={isLoadingWills ? "animate-spin" : ""} /> Refresh
        </Button>
        <Button variant="secondary" onClick={handleManualExecute} loading={isExecuting}>
          <Play size={15} /> Check for ready wills
        </Button>
      </div>

      {/* List */}
      {isLoadingWills ? (
        <VaultCard>
          <p className="t-body text-ink-muted">Loading claims from the chain…</p>
        </VaultCard>
      ) : executedWills.length === 0 ? (
        <VaultCard>
          <h3 className="t-h3 mb-2">No claims yet</h3>
          <p className="t-body text-ink-muted">
            Nothing has been distributed to you yet. When a will you&apos;re named in
            executes, your share appears here.
          </p>
        </VaultCard>
      ) : (
        <div className="space-y-5">
          {executedWills.map((will) => {
            const s = statusFor(will);
            return (
              <VaultCard
                key={will.willCommitment}
                eyebrow="Executed will"
                action={<StatusBadge tone={s.tone} dot={s.tone === "alive"}>{s.label}</StatusBadge>}
              >
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <DataRow label="Commitment" address={will.willCommitment} />
                    <DataRow label="Executed" value={formatDate(will.executionTime)} />
                    <DataRow label="USDC" value={`${formatEther(will.totalUsdc)} USDC`} />
                    <DataRow label="NFTs" value={will.totalNfts} />
                  </div>
                  <div className="flex items-center justify-between border-b border-hairline py-3 md:border-b-0 md:py-0">
                    <span className="t-label">Your share</span>
                    <Commitment
                      value={`${formatEther(will.totalEth)} ETH`}
                      revealable
                      label="Your share"
                    />
                  </div>
                </div>

                {will.canClaim && (
                  <div className="mt-6 border-t border-hairline pt-5">
                    <Button
                      onClick={() => handleClaim(will.willCommitment)}
                      loading={isProcessing && processingWill === will.willCommitment}
                    >
                      <Coins size={15} /> Claim your share
                    </Button>
                  </div>
                )}
              </VaultCard>
            );
          })}
        </div>
      )}

      {(localError || error) && (
        <p className="t-caption mt-6 text-danger">{localError || error}</p>
      )}

      <p className="t-caption mt-8 max-w-[640px]">
        A claim becomes available once a will executes. Each beneficiary claims their
        own exact share — on a public chain, claiming reveals that amount at the time
        you claim it.
      </p>
    </main>
  );
}
