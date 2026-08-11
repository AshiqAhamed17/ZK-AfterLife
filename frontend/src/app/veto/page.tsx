"use client";

import { useWallet } from "@/lib/WalletContext";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import VaultCard from "@/components/ui/VaultCard";
import DataRow from "@/components/ui/DataRow";
import StatusBadge, { type BadgeTone } from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import Pulse from "@/components/ui/Pulse";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import type { Hex } from "viem";
import type { MyWill } from "@/services/registryService";

export default function Veto() {
  const { isConnected, account, getAllWills, isVetoMember, veto, connectWallet, isLoading, error } =
    useWallet();
  const toast = useToast();
  const [vetoableWills, setVetoableWills] = useState<MyWill[]>([]);
  const [amIVetoMember, setAmIVetoMember] = useState(false);
  const [selectedWill, setSelectedWill] = useState<MyWill | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localError, setLocalError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showVetoModal, setShowVetoModal] = useState(false);
  const [vetoReason, setVetoReason] = useState("");

  useEffect(() => {
    if (isConnected && account) loadVetoData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, account]);

  const loadVetoData = async () => {
    try {
      const [all, member] = await Promise.all([getAllWills(), isVetoMember(account!)]);
      setAmIVetoMember(member);
      setVetoableWills(all.filter((w) => w.will.graceStart !== 0n && !w.will.executed));
    } catch (err) {
      console.error("Failed to load veto data:", err);
      setLocalError("Failed to load veto data. Please try again.");
    }
  };

  const handleVetoWill = async (will: MyWill, reason: string) => {
    if (!isConnected) {
      setLocalError("Please connect your wallet first");
      return;
    }
    setIsProcessing(true);
    setLocalError("");
    try {
      console.log("Casting veto with reason:", reason);
      await veto(will.commitment);
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

  const statusFor = (w: MyWill): { tone: BadgeTone; label: string } => ({
    tone: "grace",
    label: `Grace · veto ${w.will.vetoCount}`,
  });

  const filteredWills = vetoableWills.filter((will) => {
    const q = searchTerm.toLowerCase();
    return (
      will.will.owner.toLowerCase().includes(q) || will.commitment.toLowerCase().includes(q)
    );
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

      {!amIVetoMember ? (
        <VaultCard className="mb-8">
          <p className="t-body text-ink-muted">
            Your connected address isn&apos;t part of the veto committee. You
            can see wills currently in grace, but only committee members can
            cast a veto.
          </p>
        </VaultCard>
      ) : null}

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
        <Button variant="secondary" onClick={loadVetoData}>
          Refresh
        </Button>
      </div>

      {filteredWills.length === 0 ? (
        <VaultCard>
          <h3 className="t-h3 mb-2">No wills in grace</h3>
          <p className="t-body text-ink-muted">
            Nothing is currently vetoable. A will appears here only while it
            is in its grace window.
          </p>
        </VaultCard>
      ) : (
        <div className="space-y-5">
          {filteredWills.map((will) => {
            const s = statusFor(will);
            return (
              <VaultCard
                key={will.commitment}
                eyebrow="Will in grace"
                action={<StatusBadge tone={s.tone}>{s.label}</StatusBadge>}
              >
                <DataRow label="Owner" address={will.will.owner} />
                <DataRow label="Last check-in" value={formatDate(will.will.lastCheckIn)} />
                <DataRow label="Grace started" value={formatDate(will.will.graceStart)} />
                <DataRow label="Commitment" address={will.commitment} />

                {amIVetoMember ? (
                  <div className="mt-6 border-t border-hairline pt-5">
                    <Button
                      variant="destructive"
                      disabled={isProcessing}
                      onClick={() => {
                        setSelectedWill(will);
                        setShowVetoModal(true);
                      }}
                    >
                      Veto execution
                    </Button>
                  </div>
                ) : null}
              </VaultCard>
            );
          })}
        </div>
      )}

      {(localError || error) && <p className="t-caption mt-6 text-danger">{localError || error}</p>}

      <p className="t-caption mt-8 max-w-[640px]">
        Only veto committee members can cast a veto, and only during a will&apos;s
        grace window. Reaching the veto threshold cancels grace and restarts
        the inactivity clock. Use it only when the owner is temporarily
        unavailable, not gone.
      </p>

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
          This extends the grace period and cannot be undone. Note why, for
          your own records — this isn&apos;t stored on-chain or anywhere else.
        </p>
        <textarea
          value={vetoReason}
          onChange={(e) => setVetoReason(e.target.value)}
          placeholder="Why are you vetoing this execution? (personal note, not saved)"
          rows={3}
          className="w-full rounded-control border border-hairline bg-surface-2 px-3 py-2.5 text-ink placeholder:text-ink-faint"
        />
      </Modal>
    </main>
  );
}
