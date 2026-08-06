"use client";

import { useWallet } from "@/lib/WalletContext";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import VaultCard from "@/components/ui/VaultCard";
import DataRow from "@/components/ui/DataRow";
import StatTile from "@/components/ui/StatTile";
import StatusBadge, { type BadgeTone } from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import Pulse from "@/components/ui/Pulse";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

interface VetoableWill {
  willCommitment: string;
  owner: string;
  lastCheckIn: bigint;
  gracePeriodStart: bigint;
  timeInGracePeriod: bigint;
  beneficiaries: {
    address: string;
    ethAmount: string;
    usdcAmount: string;
    nftCount: string;
    name: string;
  }[];
  vetoCount: number;
  maxVetoes: number;
  isVetoed: boolean;
}

export default function Veto() {
  const { isConnected, account, castVeto, getVetoStatus, getCheckInStatus, connectWallet, isLoading, error } =
    useWallet();
  const toast = useToast();
  const [vetoableWills, setVetoableWills] = useState<VetoableWill[]>([]);
  const [selectedWill, setSelectedWill] = useState<VetoableWill | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localError, setLocalError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "vetoable" | "vetoed">("all");
  const [showVetoModal, setShowVetoModal] = useState(false);
  const [vetoReason, setVetoReason] = useState("");

  useEffect(() => {
    if (isConnected) loadVetoData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  const loadVetoData = async () => {
    try {
      const [vetoStatus, checkInStatus] = await Promise.all([getVetoStatus(), getCheckInStatus()]);
      console.log("Veto status:", vetoStatus, "Check-in status:", checkInStatus);
      // No enumeration of all wills available yet; show empty state.
      setVetoableWills([]);
    } catch (err) {
      console.error("Failed to load veto data:", err);
      setLocalError("Failed to load veto data. Please try again.");
    }
  };

  const handleVetoWill = async (_will: VetoableWill, reason: string) => {
    if (!isConnected) {
      setLocalError("Please connect your wallet first");
      return;
    }
    setIsProcessing(true);
    setLocalError("");
    try {
      console.log("Casting veto with reason:", reason);
      const txHash = await castVeto();
      console.log("Veto cast with tx hash:", txHash);
      toast("Veto cast. Grace period extended.", "grace");
      setShowVetoModal(false);
      setVetoReason("");
      setTimeout(() => loadVetoData(), 2000);
    } catch (err) {
      console.error("Failed to veto will:", err);
      setLocalError(err instanceof Error ? err.message : "Failed to veto will");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const statusFor = (w: VetoableWill): { tone: BadgeTone; label: string } =>
    w.isVetoed
      ? { tone: "danger", label: "Vetoed" }
      : w.vetoCount > 0
      ? { tone: "grace", label: `${w.vetoCount}/${w.maxVetoes} vetoes` }
      : { tone: "alive", label: "No vetoes" };

  const filteredWills = vetoableWills.filter((will) => {
    const matchesSearch =
      will.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      will.willCommitment.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "vetoable" && !will.isVetoed) ||
      (filter === "vetoed" && will.isVetoed);
    return matchesSearch && matchesFilter;
  });

  if (!isConnected) {
    return (
      <main className="mx-auto max-w-[1200px] px-6 py-24">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-8 w-40">
            <Pulse state="grace" height={40} />
          </div>
          <h1 className="t-h1 mb-3">Connect to veto</h1>
          <p className="t-body mb-8 text-ink-muted">
            A trusted circle can stop a false alarm during grace.
          </p>
          <Button onClick={connectWallet} loading={isLoading}>
            Connect wallet
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-12">
      <div className="t-eyebrow mb-3">VETO</div>
      <h1 className="t-h1 mb-10">Stop a premature execution.</h1>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
        <StatTile label="Wills in grace" value={String(vetoableWills.length)} />
        <StatTile label="Vetoable" value={String(vetoableWills.filter((w) => !w.isVetoed).length)} />
        <StatTile label="Vetoed" value={String(vetoableWills.filter((w) => w.isVetoed).length)} />
        <StatTile
          label="Beneficiaries"
          value={String(vetoableWills.reduce((sum, w) => sum + w.beneficiaries.length, 0))}
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
          <option value="vetoable">Vetoable</option>
          <option value="vetoed">Vetoed</option>
        </select>
      </div>

      {/* List */}
      {filteredWills.length === 0 ? (
        <VaultCard>
          <h3 className="t-h3 mb-2">No wills in grace</h3>
          <p className="t-body text-ink-muted">
            Nothing is currently vetoable. A will appears here only while it is in its grace
            window, and only veto members can act on it.
          </p>
        </VaultCard>
      ) : (
        <div className="space-y-5">
          {filteredWills.map((will) => {
            const s = statusFor(will);
            return (
              <VaultCard
                key={will.willCommitment}
                eyebrow="Will in grace"
                action={<StatusBadge tone={s.tone}>{s.label}</StatusBadge>}
              >
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <DataRow label="Owner" address={will.owner} />
                    <DataRow label="Last check-in" value={formatDate(will.lastCheckIn)} />
                    <DataRow label="Grace started" value={formatDate(will.gracePeriodStart)} />
                    <DataRow label="Vetoes" value={`${will.vetoCount}/${will.maxVetoes}`} />
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
                          {b.ethAmount} ETH
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 border-t border-hairline pt-5">
                  <Button
                    variant="destructive"
                    disabled={will.isVetoed || isProcessing}
                    onClick={() => {
                      setSelectedWill(will);
                      setShowVetoModal(true);
                    }}
                  >
                    {will.isVetoed ? "Vetoed" : "Veto execution"}
                  </Button>
                </div>
              </VaultCard>
            );
          })}
        </div>
      )}

      {(localError || error) && <p className="t-caption mt-6 text-danger">{localError || error}</p>}

      <p className="t-caption mt-8 max-w-[640px]">
        Only veto members can cast a veto, and only during a will&apos;s grace window. Each
        veto extends grace (commonly by 30 days), up to a maximum. Use it only when the owner
        is temporarily unavailable, not gone.
      </p>

      {/* Veto confirm modal */}
      <Modal
        open={showVetoModal && !!selectedWill}
        onClose={() => setShowVetoModal(false)}
        title="Veto this execution?"
        actions={
          <>
            <Button variant="ghost" onClick={() => setShowVetoModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={isProcessing}
              disabled={!vetoReason.trim()}
              onClick={() => selectedWill && handleVetoWill(selectedWill, vetoReason)}
            >
              Confirm veto
            </Button>
          </>
        }
      >
        <p className="mb-4">
          This extends the grace period and cannot be undone. Note a reason for the record.
        </p>
        <textarea
          value={vetoReason}
          onChange={(e) => setVetoReason(e.target.value)}
          placeholder="Why are you vetoing this execution?"
          rows={3}
          className="w-full rounded-control border border-hairline bg-surface-2 px-3 py-2.5 text-ink placeholder:text-ink-faint"
        />
      </Modal>
    </main>
  );
}
