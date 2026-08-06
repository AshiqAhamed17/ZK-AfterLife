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
import { Coins, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

interface RegisteredWill {
  willCommitment: string;
  owner: string;
  totalEth: string;
  totalUsdc: string;
  totalNfts: string;
  registrationTime: bigint;
  canWithdraw: boolean;
}

export default function Withdraw() {
  const {
    isConnected,
    account,
    directWithdrawEth,
    getWillDetails,
    isWillRegistered,
    connectWallet,
    isLoading,
    error,
  } = useWallet();
  const toast = useToast();

  const [registeredWills, setRegisteredWills] = useState<RegisteredWill[]>([]);
  const [isLoadingWills, setIsLoadingWills] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localError, setLocalError] = useState("");
  const [processingWill, setProcessingWill] = useState<string | null>(null);

  // Known will commitments to check
  const knownWillCommitments = [
    "0x06ecb45ac40d9b09be15cf448ee3a5b2c73ba07ee2948dbb5fcc4b44417d7b90", // New will from logs
    "0x15a7f53aa83b747f82626993c29aeaa61819864086b68a3cb63a0c599b83d925",
    "0x2d7c52135eb2ae75eaa93d36268571575a632a7340aefe97af8025e5c34c2f70",
    "0x279597a979e43225e84ac83f27351459c4690b4ca6030d4a5c71d44bd50bac47",
    "0x2f1968ac4dd60060271bc2697f92bc773b63856bfc59b54622ddd80889503131",
    "0x174bd33d68608ac4f2c9bc21f21ea01173619f99d6dcc832a397de3c7024276f",
  ];

  useEffect(() => {
    if (isConnected && account) {
      loadRegisteredWills();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, account]);

  const loadRegisteredWills = async () => {
    if (!account) return;

    setIsLoadingWills(true);
    setLocalError("");

    try {
      console.log("Loading registered wills for direct withdrawal...");
      const wills = [];

      for (const commitment of knownWillCommitments) {
        try {
          console.log("Checking will:", commitment);

          // Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 5000)
          );

          const checkPromise = isWillRegistered(commitment);
          const isRegistered = (await Promise.race([checkPromise, timeoutPromise])) as boolean;

          if (isRegistered) {
            console.log("Found registered will:", commitment);

            try {
              const willDetails = await getWillDetails(commitment);
              if (willDetails && willDetails.exists) {
                wills.push({
                  willCommitment: commitment,
                  owner: willDetails.owner,
                  totalEth: willDetails.totalEth.toString(),
                  totalUsdc: willDetails.totalUsdc.toString(),
                  totalNfts: willDetails.totalNfts.toString(),
                  registrationTime: willDetails.registrationTime,
                  canWithdraw: true, // Allow withdrawal for demo
                });
                console.log("Successfully added will to list:", commitment);
              }
            } catch (detailsError) {
              console.error("Failed to get will details:", commitment, detailsError);
              // Continue with other wills even if one fails
            }
          } else {
            console.log("Will not registered:", commitment);
          }
        } catch (error) {
          console.log("Will check failed or timeout:", commitment, error);
          // Continue with other wills even if one fails
        }
      }

      console.log("Found registered wills:", wills.length);
      setRegisteredWills(wills);
    } catch (error) {
      console.error("Failed to load registered wills:", error);
      setLocalError("Failed to load wills. Please try again.");
    } finally {
      setIsLoadingWills(false);
    }
  };

  const handleDirectWithdraw = async (willCommitment: string) => {
    if (!isConnected) {
      setLocalError("Please connect your wallet first");
      return;
    }

    setIsProcessing(true);
    setProcessingWill(willCommitment);
    setLocalError("");

    try {
      console.log("Direct withdrawal for will:", willCommitment);
      const txHash = await directWithdrawEth(willCommitment);
      console.log("Direct withdrawal successful:", txHash);
      toast("ETH withdrawn to your wallet.", "alive");

      setTimeout(() => {
        loadRegisteredWills();
      }, 2000);
    } catch (err) {
      console.error("Failed to withdraw ETH:", err);
      setLocalError(err instanceof Error ? err.message : "Failed to withdraw ETH");
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
    return eth.toFixed(6);
  };

  if (!isConnected) {
    return (
      <main className="mx-auto max-w-[1200px] px-6 py-24">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-8 w-40">
            <Pulse state="alive" height={40} />
          </div>
          <h1 className="t-h1 mb-3">Connect to withdraw.</h1>
          <p className="t-body mb-8 text-ink-muted">
            Only the will&apos;s owner can withdraw, and only before it executes.
          </p>
          <Button onClick={connectWallet} loading={isLoading}>
            Connect wallet
          </Button>
        </div>
      </main>
    );
  }

  const statusFor = (w: RegisteredWill): { tone: BadgeTone; label: string } =>
    w.canWithdraw ? { tone: "alive", label: "Withdrawable" } : { tone: "neutral", label: "Locked" };

  const totalEth = registeredWills.reduce((sum, w) => sum + parseFloat(w.totalEth), 0);

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-12">
      <div className="t-eyebrow mb-3">WITHDRAW</div>
      <h1 className="t-h1 mb-10">Reclaim ETH before execution.</h1>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
        <StatTile label="Registered wills" value={isLoadingWills ? "…" : String(registeredWills.length)} />
        <StatTile
          label="Withdrawable"
          value={isLoadingWills ? "…" : String(registeredWills.filter((w) => w.canWithdraw).length)}
        />
        <StatTile label="Total ETH" value={isLoadingWills ? "…" : formatEther(totalEth.toString())} unit="ETH" />
      </div>

      {/* Actions */}
      <div className="mb-8">
        <Button variant="secondary" onClick={loadRegisteredWills} disabled={isLoadingWills}>
          <RefreshCw size={15} className={isLoadingWills ? "animate-spin" : ""} /> Refresh
        </Button>
      </div>

      {/* List */}
      {isLoadingWills ? (
        <VaultCard>
          <p className="t-body text-ink-muted">Loading wills from the chain…</p>
        </VaultCard>
      ) : registeredWills.length === 0 ? (
        <VaultCard>
          <h3 className="t-h3 mb-2">No registered wills found</h3>
          <p className="t-body text-ink-muted">
            No withdrawable wills were found for this wallet. Seal a will, then it
            appears here (RPC free tiers only index recent blocks).
          </p>
        </VaultCard>
      ) : (
        <div className="space-y-5">
          {registeredWills.map((will) => {
            const s = statusFor(will);
            return (
              <VaultCard
                key={will.willCommitment}
                eyebrow="Registered will"
                action={<StatusBadge tone={s.tone} dot={s.tone === "alive"}>{s.label}</StatusBadge>}
              >
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <DataRow label="Owner" address={will.owner} />
                    <DataRow label="Registered" value={formatDate(will.registrationTime)} />
                    <DataRow label="USDC" value={`${formatEther(will.totalUsdc)} USDC`} />
                    <DataRow label="NFTs" value={will.totalNfts} />
                  </div>
                  <div className="flex items-center justify-between border-b border-hairline py-3 md:border-b-0 md:py-0">
                    <span className="t-label">Sealed amount</span>
                    <Commitment
                      value={`${formatEther(will.totalEth)} ETH`}
                      revealable
                      label="Sealed amount"
                    />
                  </div>
                </div>

                {will.canWithdraw && (
                  <div className="mt-6 border-t border-hairline pt-5">
                    <Button
                      onClick={() => handleDirectWithdraw(will.willCommitment)}
                      loading={isProcessing && processingWill === will.willCommitment}
                    >
                      <Coins size={15} /> Withdraw ETH
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
        Withdrawal bypasses execution and returns the sealed ETH straight to the
        owner. Only the will&apos;s owner can withdraw, and only before the will
        executes.
      </p>
    </main>
  );
}
