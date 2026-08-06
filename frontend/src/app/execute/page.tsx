"use client";

import { useWallet } from "@/lib/WalletContext";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import VaultCard from "@/components/ui/VaultCard";
import DataRow from "@/components/ui/DataRow";
import StatTile from "@/components/ui/StatTile";
import StatusBadge, { type BadgeTone } from "@/components/ui/StatusBadge";
import Pulse from "@/components/ui/Pulse";
import { Search, RefreshCw, Play, Users } from "lucide-react";
import { useEffect, useState } from "react";

interface ExecutableWill {
  willCommitment: string;
  owner: string;
  lastCheckIn: bigint;
  gracePeriodStart: bigint;
  isExecutable: boolean;
  isInGracePeriod: boolean;
  beneficiaries: {
    address: string;
    ethAmount: string;
    usdcAmount: string;
    nftCount: string;
    name: string;
  }[];
}

export default function ExecuteWill() {
  const {
    isConnected,
    account,
    executeWill,
    getAllRegisteredWills,
    canUserClaimFromWill,
    claimFromWill,
    noirService,
    connectWallet,
    isLoading,
    error,
  } = useWallet();
  const toast = useToast();

  const [executableWills, setExecutableWills] = useState<ExecutableWill[]>([]);
  const [allWills, setAllWills] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localError, setLocalError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "executable" | "grace-period" | "claimable">("all");
  const [isLoadingWills, setIsLoadingWills] = useState(false);

  useEffect(() => {
    if (isConnected) loadExecutableWills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  const loadExecutableWills = async () => {
    if (!isConnected || !account) return;
    setIsLoadingWills(true);
    setLocalError("");
    try {
      const wills = await getAllRegisteredWills();
      setAllWills(wills);
      const data: ExecutableWill[] = wills.map((will) => ({
        willCommitment: will.willCommitment,
        owner: will.owner,
        lastCheckIn: will.lastCheckIn,
        gracePeriodStart: will.gracePeriodStart,
        isExecutable: will.isExecutable,
        isInGracePeriod: will.isInGracePeriod,
        beneficiaries: [
          {
            address: account,
            ethAmount: will.totalEth,
            usdcAmount: will.totalUsdc,
            nftCount: will.totalNfts,
            name: "Beneficiary 1",
          },
        ],
      }));
      setExecutableWills(data);
    } catch (err) {
      console.error("Failed to load executable wills:", err);
      setLocalError("Failed to load will data. Please try again.");
    } finally {
      setIsLoadingWills(false);
    }
  };

  const handleExecuteWill = async (will: ExecutableWill) => {
    if (!isConnected) {
      setLocalError("Please connect your wallet first");
      return;
    }
    setIsProcessing(true);
    setLocalError("");
    try {
      const beneficiaries = will.beneficiaries.map((ben) => ({
        address: ben.address,
        ethAmount: BigInt(ben.ethAmount),
        usdcAmount: BigInt(ben.usdcAmount),
        nftCount: BigInt(ben.nftCount),
      }));
      const willData = {
        willSalt: "5",
        willData: ["1", "2", "3", "4"],
        beneficiaryCount: beneficiaries.length.toString(),
        beneficiaryAddresses: beneficiaries.map((b) => b.address),
        beneficiaryEth: beneficiaries.map((b) => b.ethAmount.toString()),
        beneficiaryUsdc: beneficiaries.map((b) => b.usdcAmount.toString()),
        beneficiaryNfts: beneficiaries.map((b) => b.nftCount.toString()),
      };
      const proofData = await noirService.generateWillProof(willData);
      const txHash = await executeWill(will.willCommitment, beneficiaries, proofData.proof);
      console.log("Will executed with tx hash:", txHash);
      toast("Will executed. Assets distributed.", "seal");
      setTimeout(() => loadExecutableWills(), 2000);
    } catch (err) {
      console.error("Failed to execute will:", err);
      setLocalError(err instanceof Error ? err.message : "Failed to execute will");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClaimFromWill = async (will: ExecutableWill) => {
    if (!isConnected || !account) {
      setLocalError("Please connect your wallet first");
      return;
    }
    setIsProcessing(true);
    setLocalError("");
    try {
      const canClaim = await canUserClaimFromWill(will.willCommitment, account);
      if (!canClaim) {
        setLocalError("You are not eligible to claim from this will");
        return;
      }
      const txHash = await claimFromWill(will.willCommitment);
      console.log("Claimed from will with tx hash:", txHash);
      toast("Claim sent. Your share is on the way.", "alive");
      setTimeout(() => loadExecutableWills(), 2000);
    } catch (err) {
      console.error("Failed to claim from will:", err);
      setLocalError(err instanceof Error ? err.message : "Failed to claim from will");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const filteredWills = executableWills.filter((will) => {
    const matchesSearch =
      will.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      will.willCommitment.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "executable" && will.isExecutable) ||
      (filter === "grace-period" && will.isInGracePeriod) ||
      (filter === "claimable" && (will.isExecutable || will.isInGracePeriod));
    return matchesSearch && matchesFilter;
  });

  if (!isConnected) {
    return (
      <main className="mx-auto max-w-[1200px] px-6 py-24">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-8 w-40">
            <Pulse state="flat" height={40} />
          </div>
          <h1 className="t-h1 mb-3">Connect to execute</h1>
          <p className="t-body mb-8 text-ink-muted">
            Executing a will distributes its assets to beneficiaries.
          </p>
          <Button onClick={connectWallet} loading={isLoading}>
            Connect wallet
          </Button>
        </div>
      </main>
    );
  }

  const statusFor = (w: ExecutableWill): { tone: BadgeTone; label: string } =>
    w.isExecutable
      ? { tone: "alive", label: "Executable" }
      : w.isInGracePeriod
      ? { tone: "grace", label: "Grace period" }
      : { tone: "neutral", label: "Registered" };

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-12">
      <div className="t-eyebrow mb-3">EXECUTE</div>
      <h1 className="t-h1 mb-10">Distribute a sealed will.</h1>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
        <StatTile label="Total wills" value={isLoadingWills ? "…" : String(allWills.length)} />
        <StatTile
          label="Executable"
          value={isLoadingWills ? "…" : String(allWills.filter((w) => w.isExecutable).length)}
        />
        <StatTile
          label="In grace"
          value={isLoadingWills ? "…" : String(allWills.filter((w) => w.isInGracePeriod).length)}
        />
        <StatTile
          label="Claimable"
          value={
            isLoadingWills
              ? "…"
              : String(allWills.filter((w) => w.isExecutable || w.isInGracePeriod).length)
          }
        />
      </div>

      {/* Search + filter */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            placeholder="Search by owner or commitment"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-11 w-full rounded-control border border-hairline bg-surface-1 pl-9 pr-3 font-mono text-[14px] text-ink placeholder:text-ink-faint"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="h-11 rounded-control border border-hairline bg-surface-1 px-3 font-mono text-[13px] text-ink"
        >
          <option value="all">All wills</option>
          <option value="executable">Executable</option>
          <option value="grace-period">Grace period</option>
          <option value="claimable">Claimable</option>
        </select>
        <Button variant="secondary" onClick={loadExecutableWills} disabled={isLoadingWills}>
          <RefreshCw size={15} className={isLoadingWills ? "animate-spin" : ""} /> Refresh
        </Button>
      </div>

      {/* List */}
      {isLoadingWills ? (
        <VaultCard>
          <p className="t-body text-ink-muted">Loading wills from the chain…</p>
        </VaultCard>
      ) : filteredWills.length === 0 ? (
        <VaultCard>
          <h3 className="t-h3 mb-2">{allWills.length === 0 ? "No wills found" : "No matches"}</h3>
          <p className="t-body text-ink-muted">
            {allWills.length === 0
              ? "No wills in recent blocks. Seal a will, then it appears here (RPC free tiers only index recent blocks)."
              : "Try a different search or filter."}
          </p>
        </VaultCard>
      ) : (
        <div className="space-y-5">
          {filteredWills.map((will) => {
            const s = statusFor(will);
            return (
              <VaultCard
                key={will.willCommitment}
                eyebrow="Will"
                action={<StatusBadge tone={s.tone} dot={s.tone === "alive"}>{s.label}</StatusBadge>}
              >
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <DataRow label="Owner" address={will.owner} />
                    <DataRow label="Last check-in" value={formatDate(will.lastCheckIn)} />
                    <DataRow label="Commitment" address={will.willCommitment} />
                  </div>
                  <div>
                    <div className="t-label mb-2">Beneficiaries ({will.beneficiaries.length})</div>
                    {will.beneficiaries.map((b, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-3 border-b border-hairline py-2 last:border-b-0"
                      >
                        <span className="t-body text-ink">{b.name}</span>
                        <span className="font-mono text-[13px] tabular-nums text-ink-muted">
                          {b.ethAmount} ETH · {b.usdcAmount} USDC
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3 border-t border-hairline pt-5">
                  {will.isExecutable ? (
                    <Button onClick={() => handleExecuteWill(will)} loading={isProcessing}>
                      <Play size={15} /> Execute
                    </Button>
                  ) : null}
                  {will.isExecutable || will.isInGracePeriod ? (
                    <Button
                      variant="secondary"
                      onClick={() => handleClaimFromWill(will)}
                      loading={isProcessing}
                    >
                      <Users size={15} /> Claim your share
                    </Button>
                  ) : null}
                </div>
              </VaultCard>
            );
          })}
        </div>
      )}

      {(localError || error) && (
        <p className="t-caption mt-6 text-danger">{localError || error}</p>
      )}

      <p className="t-caption mt-8 max-w-[640px]">
        A will becomes executable after the owner misses check-ins and the grace period
        ends with no veto. Execution generates a zero-knowledge proof and distributes the
        sealed shares. Beneficiaries can then claim their exact amount.
      </p>
    </main>
  );
}
