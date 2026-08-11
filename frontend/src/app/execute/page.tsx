"use client";

import { useWallet } from "@/lib/WalletContext";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import VaultCard from "@/components/ui/VaultCard";
import DataRow from "@/components/ui/DataRow";
import Field from "@/components/ui/Field";
import StatTile from "@/components/ui/StatTile";
import StatusBadge, { type BadgeTone } from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import Pulse from "@/components/ui/Pulse";
import { Search, RefreshCw, Play, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { parseEther, parseUnits, type Hex } from "viem";
import type { MyWill } from "@/services/registryService";

const USDC_DECIMALS = 6;

interface WitnessBeneficiary {
  address: string;
  ethAmount: string;
  usdcAmount: string;
}

export default function ExecuteWill() {
  const {
    isConnected,
    account,
    getAllWills,
    triggerGracePeriod,
    executeWill,
    noirService,
    connectWallet,
    isLoading,
    error,
  } = useWallet();
  const toast = useToast();

  const [allWills, setAllWills] = useState<MyWill[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localError, setLocalError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "ready" | "grace">("all");
  const [isLoadingWills, setIsLoadingWills] = useState(false);

  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [selectedWill, setSelectedWill] = useState<MyWill | null>(null);
  const [witnessSalt, setWitnessSalt] = useState("");
  const [witnessDescription, setWitnessDescription] = useState("");
  const [witnessBeneficiaries, setWitnessBeneficiaries] = useState<WitnessBeneficiary[]>([
    { address: "", ethAmount: "", usdcAmount: "" },
  ]);

  useEffect(() => {
    if (isConnected) loadWills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  const loadWills = async () => {
    setIsLoadingWills(true);
    setLocalError("");
    try {
      setAllWills(await getAllWills());
    } catch (err) {
      console.error("Failed to load wills:", err);
      setLocalError("Failed to load will data. Please try again.");
    } finally {
      setIsLoadingWills(false);
    }
  };

  const now = () => BigInt(Math.floor(Date.now() / 1000));

  const isGraceElapsed = (w: MyWill) => {
    // gracePeriod isn't known per-will here; approximate readiness client-side
    // is not reliable without the contract's gracePeriod, so "ready" just
    // means grace has started — the contract enforces the real elapsed check.
    return w.will.graceStart !== 0n;
  };

  const openExecuteModal = (will: MyWill) => {
    setSelectedWill(will);
    setWitnessSalt("");
    setWitnessDescription("");
    setWitnessBeneficiaries([{ address: "", ethAmount: "", usdcAmount: "" }]);
    setShowExecuteModal(true);
  };

  const addWitnessBeneficiary = () => {
    if (witnessBeneficiaries.length < 8) {
      setWitnessBeneficiaries((prev) => [...prev, { address: "", ethAmount: "", usdcAmount: "" }]);
    }
  };

  const removeWitnessBeneficiary = (index: number) => {
    if (witnessBeneficiaries.length > 1) {
      setWitnessBeneficiaries((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const updateWitnessBeneficiary = (index: number, field: keyof WitnessBeneficiary, value: string) => {
    setWitnessBeneficiaries((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [field]: value } : b))
    );
  };

  const handleTriggerGrace = async (will: MyWill) => {
    setIsProcessing(true);
    setLocalError("");
    try {
      await triggerGracePeriod(will.commitment);
      toast("Grace period opened.", "grace");
      setTimeout(() => loadWills(), 2000);
    } catch (err) {
      console.error("Failed to trigger grace period:", err);
      setLocalError(err instanceof Error ? err.message : "Failed to trigger grace period");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecute = async () => {
    if (!selectedWill) return;
    setIsProcessing(true);
    setLocalError("");
    try {
      // Same wei / 6-decimal-base-unit conversion register/page.tsx used to seal
      // this will — the circuit's totals must match the on-chain escrowed integers,
      // not human decimal strings (see register/page.tsx for why).
      const willDataForProof = {
        willSalt: witnessSalt,
        willData: [witnessDescription || "Digital Will", "0", "0", "0"],
        beneficiaryCount: witnessBeneficiaries.length.toString(),
        beneficiaryAddresses: witnessBeneficiaries.map((b) => b.address),
        beneficiaryEth: witnessBeneficiaries.map((b) => parseEther(b.ethAmount || "0").toString()),
        beneficiaryUsdc: witnessBeneficiaries.map((b) =>
          parseUnits(b.usdcAmount || "0", USDC_DECIMALS).toString()
        ),
        beneficiaryNfts: witnessBeneficiaries.map(() => "0"),
      };

      const proofData = await noirService.generateWillProof(willDataForProof);

      if (proofData.willCommitment.toLowerCase() !== selectedWill.commitment.toLowerCase()) {
        throw new Error(
          "The supplied will data doesn't match this will's commitment. Check the salt, description, and beneficiaries."
        );
      }
      if (BigInt(proofData.merkleRoot) !== selectedWill.will.merkleRoot) {
        throw new Error(
          "The supplied beneficiary data doesn't match this will's Merkle root. Check every beneficiary's address, ETH, and USDC amount."
        );
      }

      await executeWill(selectedWill.commitment, proofData.proof as Hex);
      toast("Will executed. Assets distributed.", "seal");
      setShowExecuteModal(false);
      setTimeout(() => loadWills(), 2000);
    } catch (err) {
      console.error("Failed to execute will:", err);
      setLocalError(err instanceof Error ? err.message : "Failed to execute will");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const filteredWills = allWills.filter((will) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      will.will.owner.toLowerCase().includes(q) || will.commitment.toLowerCase().includes(q);
    const matchesFilter =
      filter === "all" ||
      (filter === "ready" && isGraceElapsed(will) && !will.will.executed) ||
      (filter === "grace" && will.will.graceStart !== 0n && !will.will.executed);
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

  const statusFor = (w: MyWill): { tone: BadgeTone; label: string } =>
    w.will.executed
      ? { tone: "neutral", label: "Executed" }
      : w.will.graceStart !== 0n
      ? { tone: "grace", label: "In grace" }
      : { tone: "alive", label: "Active" };

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-12">
      <div className="t-eyebrow mb-3">EXECUTE</div>
      <h1 className="t-h1 mb-10">Distribute a sealed will.</h1>

      <div className="mb-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
        <StatTile label="Total wills" value={isLoadingWills ? "…" : String(allWills.length)} />
        <StatTile
          label="In grace"
          value={isLoadingWills ? "…" : String(allWills.filter((w) => w.will.graceStart !== 0n && !w.will.executed).length)}
        />
        <StatTile
          label="Executed"
          value={isLoadingWills ? "…" : String(allWills.filter((w) => w.will.executed).length)}
        />
      </div>

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
          <option value="grace">In grace</option>
        </select>
        <Button variant="secondary" onClick={loadWills} disabled={isLoadingWills}>
          <RefreshCw size={15} className={isLoadingWills ? "animate-spin" : ""} /> Refresh
        </Button>
      </div>

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
                key={will.commitment}
                eyebrow="Will"
                action={<StatusBadge tone={s.tone} dot={s.tone === "alive"}>{s.label}</StatusBadge>}
              >
                <DataRow label="Owner" address={will.will.owner} />
                <DataRow label="Last check-in" value={formatDate(will.will.lastCheckIn)} />
                <DataRow label="Commitment" address={will.commitment} />

                {!will.will.executed && will.will.graceStart !== 0n ? (
                  <div className="mt-6 flex flex-wrap gap-3 border-t border-hairline pt-5">
                    <Button onClick={() => openExecuteModal(will)}>
                      <Play size={15} /> Execute
                    </Button>
                  </div>
                ) : null}

                {!will.will.executed && will.will.graceStart === 0n ? (
                  <div className="mt-6 flex flex-wrap gap-3 border-t border-hairline pt-5">
                    <Button
                      variant="secondary"
                      disabled={isProcessing}
                      onClick={() => handleTriggerGrace(will)}
                    >
                      Trigger grace period
                    </Button>
                  </div>
                ) : null}
              </VaultCard>
            );
          })}
        </div>
      )}

      {(localError || error) && (
        <p className="t-caption mt-6 text-danger">{localError || error}</p>
      )}

      <p className="t-caption mt-8 max-w-[640px]">
        A will becomes executable after the owner misses check-ins and the
        grace period ends with no veto. Executing requires the exact will
        data (salt, description, beneficiaries) the owner sealed with — the
        chain never stores it. Generating the proof happens in your browser.
      </p>

      <Modal
        open={showExecuteModal && !!selectedWill}
        onClose={() => setShowExecuteModal(false)}
        title="Execute this will"
        actions={
          <>
            <Button variant="ghost" onClick={() => setShowExecuteModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleExecute} loading={isProcessing}>
              Generate proof &amp; execute
            </Button>
          </>
        }
      >
        <p className="mb-4">
          Enter the exact salt, description, and beneficiary allocations this
          will was sealed with. A mismatch will fail before any transaction is sent.
        </p>
        <div className="space-y-4">
          <Field
            label="Will salt"
            mono
            placeholder="Salt from the sealed-success screen"
            value={witnessSalt}
            onChange={(e) => setWitnessSalt(e.target.value)}
          />
          <Field
            label="Description"
            placeholder="Digital Will"
            value={witnessDescription}
            onChange={(e) => setWitnessDescription(e.target.value)}
          />
          {witnessBeneficiaries.map((b, i) => (
            <div key={i} className="rounded-card border border-hairline p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="t-label">Beneficiary {String(i + 1).padStart(2, "0")}</span>
                {witnessBeneficiaries.length > 1 ? (
                  <button
                    onClick={() => removeWitnessBeneficiary(i)}
                    className="text-ink-faint hover:text-danger"
                    aria-label="Remove beneficiary"
                  >
                    <Trash2 size={14} />
                  </button>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field
                  label="Address"
                  mono
                  placeholder="0x..."
                  value={b.address}
                  onChange={(e) => updateWitnessBeneficiary(i, "address", e.target.value)}
                />
                <Field
                  label="ETH"
                  mono
                  type="number"
                  placeholder="0.0"
                  value={b.ethAmount}
                  onChange={(e) => updateWitnessBeneficiary(i, "ethAmount", e.target.value)}
                />
                <Field
                  label="USDC"
                  mono
                  type="number"
                  placeholder="0"
                  value={b.usdcAmount}
                  onChange={(e) => updateWitnessBeneficiary(i, "usdcAmount", e.target.value)}
                />
              </div>
            </div>
          ))}
          {witnessBeneficiaries.length < 8 ? (
            <Button variant="secondary" onClick={addWitnessBeneficiary} className="w-full">
              <Plus size={16} /> Add beneficiary
            </Button>
          ) : null}
        </div>
      </Modal>
    </main>
  );
}
