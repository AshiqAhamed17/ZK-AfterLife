"use client";

import { useWallet } from "@/lib/WalletContext";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import VaultCard from "@/components/ui/VaultCard";
import DataRow from "@/components/ui/DataRow";
import StatusBadge, { type BadgeTone } from "@/components/ui/StatusBadge";
import Pulse, { type PulseState } from "@/components/ui/Pulse";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

interface CheckInStatus {
  lastCheckIn: bigint;
  isInGracePeriod: boolean;
  gracePeriodStart: bigint;
  timeUntilGracePeriod: bigint;
  hasRegisteredWills?: boolean;
  willCommitment?: string;
}

export default function CheckIn() {
  const { isConnected, account, checkIn, getCheckInStatus, connectWallet, isLoading, error } =
    useWallet();
  const toast = useToast();
  const [checkInStatus, setCheckInStatus] = useState<CheckInStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (isConnected && account) {
      loadCheckInStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, account]);

  const loadCheckInStatus = async () => {
    try {
      const status = await getCheckInStatus(account!);
      setCheckInStatus(status);
    } catch (err) {
      console.error("Failed to load check-in status:", err);
    }
  };

  const handleCheckIn = async () => {
    if (!isConnected) {
      setLocalError("Connect your wallet first.");
      return;
    }
    setIsProcessing(true);
    setLocalError("");
    try {
      const txHash = await checkIn();
      console.log("Check-in successful with tx hash:", txHash);
      toast("Check-in recorded. You're active.", "alive");
      setTimeout(() => loadCheckInStatus(), 1800);
    } catch (err) {
      console.error("Failed to check in:", err);
      setLocalError(err instanceof Error ? err.message : "Failed to check in.");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const formatTimeRemaining = (seconds: bigint) => {
    const total = Number(seconds);
    const days = Math.floor(total / (24 * 60 * 60));
    const hours = Math.floor((total % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((total % (60 * 60)) / 60);
    if (days > 1) return `${days} days, ${hours} hours`;
    if (days === 1) return `1 day, ${hours} hours`;
    if (hours > 0) return `${hours} hours, ${minutes} minutes`;
    return `${Math.max(0, minutes)} minutes`;
  };

  const getStatusColor = () => {
    if (!checkInStatus) return "gray";
    if (checkInStatus.hasRegisteredWills === false) return "gray";
    if (checkInStatus.isInGracePeriod) return "red";
    if (checkInStatus.timeUntilGracePeriod < 30n * 24n * 60n * 60n) return "yellow";
    return "green";
  };

  const getStatusText = () => {
    if (!checkInStatus) return "Loading";
    if (checkInStatus.hasRegisteredWills === false) return "No will sealed";
    if (checkInStatus.isInGracePeriod) return "Grace period";
    if (checkInStatus.timeUntilGracePeriod < 30n * 24n * 60n * 60n) return "Due soon";
    return "Active";
  };

  if (!isConnected) {
    return (
      <main className="mx-auto max-w-[1200px] px-6 py-24">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-8 w-40">
            <Pulse state="flat" height={40} />
          </div>
          <h1 className="t-h1 mb-3">Connect to check in</h1>
          <p className="t-body mb-8 text-ink-muted">
            Checking in keeps your sealed will active.
          </p>
          <Button onClick={connectWallet} loading={isLoading}>
            Connect wallet
          </Button>
        </div>
      </main>
    );
  }

  const color = getStatusColor();
  const pulseState: PulseState = color === "red" ? "grace" : color === "gray" ? "flat" : "alive";
  const badgeTone: BadgeTone =
    color === "green" ? "alive" : color === "yellow" ? "grace" : color === "red" ? "danger" : "neutral";
  const noWills = checkInStatus?.hasRegisteredWills === false;

  return (
    <main className="mx-auto max-w-[1200px] px-6 py-12">
      <div className="t-eyebrow mb-3">CHECK-IN</div>
      <h1 className="t-h1 mb-10">Prove you&apos;re still here.</h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px] lg:items-start">
        {/* Pulse + action */}
        <VaultCard
          eyebrow="Liveness"
          action={<StatusBadge tone={badgeTone} dot={badgeTone === "alive"}>{getStatusText()}</StatusBadge>}
        >
          <Pulse state={pulseState} height={88} />

          <div className="mt-8">
            <div className="t-label mb-2">
              {checkInStatus?.isInGracePeriod ? "Grace period active" : "Next check-in due in"}
            </div>
            <div className="font-mono text-[2.25rem] leading-none tabular-nums text-ink">
              {checkInStatus ? formatTimeRemaining(checkInStatus.timeUntilGracePeriod) : "—"}
            </div>
          </div>

          <div className="mt-8">
            {noWills ? (
              <div className="rounded-card border border-hairline p-5">
                <p className="t-body mb-4 text-ink-muted">
                  You have no sealed will yet. Seal one to start heartbeat monitoring.
                </p>
                <Link href="/register">
                  <Button>Seal a will</Button>
                </Link>
              </div>
            ) : (
              <Button onClick={handleCheckIn} loading={isProcessing} disabled={isLoading}>
                Check in
              </Button>
            )}
          </div>

          {(localError || error) && !noWills ? (
            <p className="t-caption mt-4 text-danger">{localError || error}</p>
          ) : null}
        </VaultCard>

        {/* Status details */}
        <VaultCard
          eyebrow="Status"
          action={
            <button
              onClick={loadCheckInStatus}
              className="inline-flex items-center gap-1.5 t-caption text-ink-faint transition-colors hover:text-seal"
              aria-label="Refresh status"
            >
              <RefreshCw size={12} /> refresh
            </button>
          }
        >
          {checkInStatus ? (
            <>
              <DataRow
                label="Last check-in"
                value={checkInStatus.lastCheckIn > 0n ? formatDate(checkInStatus.lastCheckIn) : "Never"}
              />
              <DataRow
                label="Grace period"
                value={checkInStatus.isInGracePeriod ? "Active" : "Inactive"}
              />
              {checkInStatus.isInGracePeriod ? (
                <DataRow label="Grace started" value={formatDate(checkInStatus.gracePeriodStart)} />
              ) : null}
              {checkInStatus.willCommitment ? (
                <DataRow label="Commitment" address={checkInStatus.willCommitment} />
              ) : null}
            </>
          ) : (
            <p className="t-body text-ink-muted">Loading status…</p>
          )}
        </VaultCard>
      </div>

      <p className="t-caption mt-8 max-w-[640px]">
        Check in at least once a period to stay active. Missing a check-in opens a
        grace window (commonly 30 days) during which a trusted circle can veto before
        anything executes.
      </p>
    </main>
  );
}
