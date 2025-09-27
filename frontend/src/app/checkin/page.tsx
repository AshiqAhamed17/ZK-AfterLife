"use client";

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import GlassCard from '@/components/ui/GlassCard';
import { useWallet } from '@/lib/WalletContext';
import { motion, useAnimation } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Heart,
  RefreshCw,
  Shield,
  Timer,
  TrendingUp
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface CheckInStatus {
  lastCheckIn: bigint;
  isInGracePeriod: boolean;
  gracePeriodStart: bigint;
  timeUntilGracePeriod: bigint;
  hasRegisteredWills?: boolean;
  willCommitment?: string;
}

/**
 * Techno-ZK CheckIn Page — UI/UX only refactor
 * - Everything logic-related is unchanged (hooks, function names, signatures)
 * - Only styling, layout, interactions, and motion changed
 */

/* -------------------------
   Lightweight TiltCard for parallax/tilt hover
   ------------------------- */
function TiltCard({ children, className = "", strength = 12 }: { children: React.ReactNode; className?: string; strength?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const controls = useAnimation();

  function handleMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const px = (x / rect.width) * 2 - 1; // -1..1
    const py = (y / rect.height) * 2 - 1;
    const rotateX = (-py * strength).toFixed(2);
    const rotateY = (px * strength).toFixed(2);
    controls.start({ rotateX, rotateY, scale: 1.02, transition: { type: "spring", stiffness: 260, damping: 24 } });
  }

  function handleLeave() {
    controls.start({ rotateX: 0, rotateY: 0, scale: 1, transition: { duration: 0.6, ease: "easeOut" } });
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      animate={controls}
      style={{ transformStyle: "preserve-3d" }}
      className={`relative perspective-1000 ${className}`}
    >
      {children}
    </motion.div>
  );
}

/* -------------------------
   Main Component
   ------------------------- */
export default function CheckIn() {
  const { isConnected, account, checkIn, getCheckInStatus, isLoading, error } = useWallet();
  const [checkInStatus, setCheckInStatus] = useState<CheckInStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [localError, setLocalError] = useState("");
  const successPulse = useRef(false);

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
      setLocalError("Please connect your wallet first");
      return;
    }

    setIsProcessing(true);
    setLocalError("");

    try {
      const txHash = await checkIn();
      console.log("Check-in successful with tx hash:", txHash);
      setIsSuccess(true);
      successPulse.current = true;

      // Reload status after successful check-in
      setTimeout(() => {
        loadCheckInStatus();
        setIsSuccess(false);
        successPulse.current = false;
      }, 1800);
    } catch (err) {
      console.error("Failed to check in:", err);
      setLocalError(err instanceof Error ? err.message : "Failed to check in");
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
    if (checkInStatus.timeUntilGracePeriod < 30n * 24n * 60n * 60n) return "yellow"; // 30 days
    return "green";
  };

  const getStatusText = () => {
    if (!checkInStatus) return "Loading...";
    if (checkInStatus.hasRegisteredWills === false) return "No Registered Wills";
    if (checkInStatus.isInGracePeriod) return "Grace Period Active";
    if (checkInStatus.timeUntilGracePeriod < 30n * 24n * 60n * 60n) return "Check-in Due Soon";
    return "Active";
  };

  /* ---------- Layout when wallet not connected (keeps original logic) ---------- */
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#020114] via-[#04021a] to-[#00040a] text-white antialiased">
        <div className="container mx-auto px-6 py-20">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-2xl mx-auto">
            <GlassCard className="p-10 backdrop-blur-md bg-black/40 border border-white/6">
              <div className="text-center">
                <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-[#7c3aed]/20 to-[#06b6d4]/12 flex items-center justify-center mb-4 shadow-lg">
                  <Heart className="text-red-400" size={36} />
                </div>
                <h2 className="text-2xl font-semibold mb-2">Wallet Required</h2>
                <p className="text-sm text-gray-300 max-w-prose mx-auto mb-6">
                  Connect your wallet to manage heartbeat check-ins and keep your will active.
                </p>
                <div className="flex justify-center">
                  <Button onClick={() => (window.location.href = "/")} className="bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] text-black px-6 py-3 rounded-xl">
                    Connect Wallet
                  </Button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    );
  }

  /* ---------- MAIN DASHBOARD ---------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020114] via-[#04021a] to-[#00040a] text-white antialiased">
      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl md:text-4xl font-extralight tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-[#a78bfa] to-[#60a5fa]">
                  Heartbeat Check-in
                </h1>
                <Badge className="text-sm bg-[#0b1220]/50 border border-white/6 text-[#9be7ff]">Techno-ZK</Badge>
              </div>
              <p className="mt-1 text-sm text-gray-400 max-w-xl">
                Keep your will active with periodic heartbeat transactions. Prevent premature activation with trustless grace & veto flows.
              </p>
            </div>

            {/* Top-right: compact wallet + small status */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-gray-400">Connected</div>
                <div className="text-sm font-mono">{account?.slice(0, 6)}...{account?.slice(-4)}</div>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border border-white/6 bg-gradient-to-br ${getStatusColor() === "green" ? "from-green-900/20 to-green-700/10" : getStatusColor() === "yellow" ? "from-yellow-900/10 to-yellow-700/10" : getStatusColor() === "red" ? "from-red-900/10 to-red-700/10" : "from-gray-900/10 to-gray-700/10"}`}>
                {getStatusColor() === "green" ? <CheckCircle className="text-green-400" /> : getStatusColor() === "yellow" ? <AlertTriangle className="text-yellow-400" /> : getStatusColor() === "red" ? <AlertCircle className="text-red-400" /> : <Clock className="text-gray-400" />}
              </div>
            </div>
          </div>

          {/* Top Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <TiltCard>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="p-5 rounded-2xl backdrop-blur-md border border-white/6 bg-black/30 hover:shadow-[0_10px_40px_rgba(14,11,33,0.6)]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-300">Status</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor() === "green" ? "bg-green-900/30 text-green-300" : getStatusColor() === "yellow" ? "bg-yellow-900/20 text-yellow-300" : getStatusColor() === "red" ? "bg-red-900/20 text-red-300" : "bg-gray-800 text-gray-300"}`}>
                        {getStatusText()}
                      </div>
                      {/* subtle pulsing ring when success */}
                      {isSuccess && <motion.div animate={{ scale: [1, 1.14, 1] }} transition={{ repeat: 2, duration: 0.8 }} className="w-2 h-2 rounded-full bg-white/10 ring-2 ring-[#7c3aed]/40" />}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-300">Next action</div>
                    <div className="text-base font-medium mt-1">{checkInStatus ? formatTimeRemaining(checkInStatus.timeUntilGracePeriod) : "Loading..."}</div>
                  </div>
                </div>
              </motion.div>
            </TiltCard>

            <TiltCard>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-5 rounded-2xl backdrop-blur-md border border-white/6 bg-black/30">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-300">Last Check-in</p>
                    <p className="text-base font-medium mt-2">{checkInStatus ? (checkInStatus.lastCheckIn > 0n ? formatDate(checkInStatus.lastCheckIn) : "Never") : "Loading..."}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#0ea5a1]/8 to-[#7c3aed]/8 flex items-center justify-center">
                      <Calendar className="text-[#7c3aed]" />
                    </div>
                  </div>
                </div>
              </motion.div>
            </TiltCard>

            <TiltCard>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="p-5 rounded-2xl backdrop-blur-md border border-white/6 bg-black/30">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-300">Grace Status</p>
                    <p className={`mt-2 text-base font-medium ${checkInStatus?.isInGracePeriod ? "text-red-300" : "text-green-300"}`}>{checkInStatus ? (checkInStatus.isInGracePeriod ? "Active" : "Inactive") : "Loading..."}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#f97316]/8 to-[#ef4444]/8 flex items-center justify-center">
                      <Timer className="text-[#f97316]" />
                    </div>
                  </div>
                </div>
              </motion.div>
            </TiltCard>
          </div>

          {/* Main two-column area */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Check-in action card */}
            <TiltCard>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="p-8 rounded-3xl backdrop-blur-lg border border-white/6 bg-black/30 hover:shadow-[0_20px_80px_rgba(10,8,30,0.6)]">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#0ea5a1]/15 to-[#7c3aed]/12 flex items-center justify-center">
                    <Heart className="text-red-400" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Send Heartbeat</h3>
                    <p className="text-sm text-gray-400 max-w-prose">Update your last check-in timestamp to keep your will active.</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="p-4 rounded-xl bg-[#071026]/60 border border-white/4 flex items-start gap-3">
                    <div className="mt-1">
                      <Shield className="text-[#60a5fa]" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-200">How it works</div>
                      <div className="text-xs text-gray-400 mt-1">Sending a heartbeat triggers an on-chain transaction that updates your activity timestamp and prevents execution while active.</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-[#071026]/40 border border-white/4">
                      <div className="text-xs text-gray-400">Connected Wallet</div>
                      <div className="text-sm font-mono mt-1">{account}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-[#071026]/40 border border-white/4">
                      <div className="text-xs text-gray-400">Network</div>
                      <div className="text-sm mt-1">Sepolia Testnet</div>
                    </div>
                  </div>

                  {/* Animated Check-in Button (morphs between states) */}
                  <div>
                    <motion.div
                      initial={false}
                      animate={isProcessing ? { scale: 0.995 } : isSuccess ? { scale: 1.02 } : { scale: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 24 }}
                    >
                      <Button
                        onClick={handleCheckIn}
                        disabled={isProcessing || isLoading || (checkInStatus?.hasRegisteredWills === false)}
                        className={`w-full rounded-xl px-6 py-3 font-semibold text-black ${isProcessing ? "bg-gradient-to-r from-[#60a5fa] to-[#7c3aed] opacity-90 cursor-wait" : isSuccess ? "bg-gradient-to-r from-[#34d399] to-[#60a5fa] shadow-[0_10px_40px_rgba(34,197,94,0.08)]" : "bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] hover:scale-[1.01]"}`}
                      >
                        {isProcessing ? (
                          <div className="flex items-center justify-center gap-3">
                            <RefreshCw className="animate-spin" />
                            Processing…
                          </div>
                        ) : isSuccess ? (
                          <div className="flex items-center justify-center gap-3">
                            <CheckCircle />
                            Sent
                          </div>
                        ) : checkInStatus && checkInStatus.hasRegisteredWills === false ? (
                          <div className="flex items-center justify-center gap-3">
                            <AlertTriangle />
                            No Wills
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-3">
                            <Heart />
                            Send Heartbeat
                          </div>
                        )}
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </TiltCard>

            {/* Right: Details & info */}
            <TiltCard>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} className="p-8 rounded-3xl backdrop-blur-lg border border-white/6 bg-black/30">
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#7c3aed]/12 to-[#06b6d4]/10 flex items-center justify-center">
                    <TrendingUp className="text-[#7c3aed]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Status Details</h3>
                    <p className="text-sm text-gray-400">Monitor your will activity, grace period and commitments.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {checkInStatus ? (
                    <>
                      {checkInStatus.hasRegisteredWills === false ? (
                        <div className="p-4 rounded-lg bg-yellow-900/8 border border-yellow-800/8">
                          <div className="flex items-center gap-3">
                            <AlertTriangle className="text-yellow-400" />
                            <div>
                              <div className="font-medium text-yellow-300">No Registered Wills</div>
                              <div className="text-sm text-yellow-200">Register a will to enable heartbeat monitoring and avoid accidental execution.</div>
                              <div className="mt-3">
                                <Button onClick={() => (window.location.href = "/register")} className="text-black bg-yellow-400 px-3 py-2 rounded-lg">Register Will</Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="p-3 rounded-lg bg-[#071026]/40 border border-white/4 flex items-center justify-between">
                            <div>
                              <div className="text-xs text-gray-400">Last Check-in</div>
                              <div className="text-sm">{checkInStatus.lastCheckIn > 0n ? formatDate(checkInStatus.lastCheckIn) : "Never"}</div>
                            </div>
                            <Calendar className="text-gray-400" />
                          </div>

                          <div className="p-3 rounded-lg bg-[#071026]/40 border border-white/4 flex items-center justify-between">
                            <div>
                              <div className="text-xs text-gray-400">Grace Period</div>
                              <div className={`text-sm ${checkInStatus.isInGracePeriod ? "text-red-300" : "text-green-300"}`}>{checkInStatus.isInGracePeriod ? "Active" : "Inactive"}</div>
                            </div>
                            <AlertCircle className="text-gray-400" />
                          </div>

                          {checkInStatus.isInGracePeriod && (
                            <div className="p-3 rounded-lg bg-red-900/8 border border-red-800/8 flex items-center justify-between">
                              <div>
                                <div className="text-xs text-red-300">Grace Started</div>
                                <div className="text-sm">{formatDate(checkInStatus.gracePeriodStart)}</div>
                              </div>
                              <Timer className="text-red-400" />
                            </div>
                          )}

                          <div className="p-3 rounded-lg bg-[#071026]/40 border border-white/4 flex items-center justify-between">
                            <div>
                              <div className="text-xs text-gray-400">Next Check-in Due</div>
                              <div className="text-sm">{formatTimeRemaining(checkInStatus.timeUntilGracePeriod)}</div>
                            </div>
                            <Clock className="text-gray-400" />
                          </div>

                          {checkInStatus.willCommitment && (
                            <div className="p-3 rounded-lg bg-[#071026]/40 border border-white/4 flex items-center justify-between">
                              <div>
                                <div className="text-xs text-blue-300">Will Commitment</div>
                                <div className="text-sm font-mono">{`${checkInStatus.willCommitment.slice(0, 8)}...${checkInStatus.willCommitment.slice(-8)}`}</div>
                              </div>
                              <Shield className="text-blue-300" />
                            </div>
                          )}

                          <div>
                            <Button onClick={loadCheckInStatus} variant="outline" className="w-full mt-2">
                              <RefreshCw className="mr-2" />
                              Refresh Status
                            </Button>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <RefreshCw className="animate-spin mx-auto mb-4 text-gray-400" size={32} />
                      <div className="text-sm text-gray-400">Loading status…</div>
                    </div>
                  )}
                </div>
              </motion.div>
            </TiltCard>
          </div>

          {/* feedback messages */}
          <div className="max-w-5xl mx-auto mt-6 space-y-3">
            {isSuccess && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-lg bg-gradient-to-r from-[#064e3b]/10 to-[#083344]/10 border border-green-800/20">
                <div className="flex items-start gap-3">
                  <CheckCircle className="text-green-400" />
                  <div>
                    <div className="font-medium text-green-300">Check-in Successful</div>
                    <div className="text-sm text-green-200">Your heartbeat was recorded. Your will remains active.</div>
                  </div>
                </div>
              </motion.div>
            )}

            {(localError || error) && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-lg bg-gradient-to-r from-[#3b0000]/6 to-[#2b0010]/6 border border-red-800/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-red-400" />
                  <div>
                    <div className="font-medium text-red-300">Error</div>
                    <div className="text-sm text-red-200">{localError || error}</div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Info panel */}
          <div className="max-w-5xl mx-auto mt-6">
            <TiltCard>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="p-6 rounded-2xl backdrop-blur-md border border-white/6 bg-black/25">
                <div className="flex items-start gap-3">
                  <Shield className="text-[#60a5fa]" />
                  <div>
                    <h4 className="text-sm font-medium text-gray-200">About Heartbeat Check-ins</h4>
                    <div className="text-xs text-gray-400 mt-2 space-y-1">
                      <div>• Heartbeat check-ins keep your will active and prevent automatic execution.</div>
                      <div>• Check in periodically — recommended at least once per year.</div>
                      <div>• Missing a check-in triggers a grace window (commonly 30 days) before execution.</div>
                      <div>• During grace window, trusted parties may veto execution.</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </TiltCard>
          </div>
        </motion.div>
      </div>

      {/* internal styles */}
      <style jsx>{`
        .perspective-1000 { perspective: 1200px; }
      `}</style>
    </div>
  );
}