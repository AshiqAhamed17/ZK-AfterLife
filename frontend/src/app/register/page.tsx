"use client";

import { useWallet } from "@/lib/WalletContext";
import { getCurrentNetwork } from "@/config/contracts";
import { selfProtocolService, SelfVerificationResult } from "@/services/SelfProtocolService";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import VaultCard from "@/components/ui/VaultCard";
import DataRow from "@/components/ui/DataRow";
import StatusBadge from "@/components/ui/StatusBadge";
import Stepper from "@/components/ui/Stepper";
import Pulse from "@/components/ui/Pulse";
import { ArrowRight, Plus, Trash2, Eye, EyeOff, Copy, Loader2 } from "lucide-react";
import { parseEther, parseUnits, type Hex } from "viem";
import React, { useState } from "react";

interface Beneficiary {
  address: string;
  ethAmount: string;
  usdcAmount: string;
  name: string;
}

interface WillData {
  beneficiaries: Beneficiary[];
  description: string;
  willSalt: string;
  inactivityDays: string;
  graceDays: string;
  vetoMembers: string[];
  vetoThreshold: string;
}

const STEP_LABELS = ["Verify", "Details", "Beneficiaries", "Trusted circle", "Review"];
const USDC_DECIMALS = 6;
// Mirrors InheritanceRegistry's MIN_INACTIVITY_PERIOD / MIN_GRACE_PERIOD (seconds)
// and MAX_VETO_MEMBERS — client-side validation only; the contract enforces
// the real floor/cap regardless.
const MIN_PERIOD_SECONDS = 60;
const MAX_VETO_MEMBERS = 8;

export default function RegisterWill() {
  const {
    isConnected,
    account,
    isSelfVerified,
    mockVerifySelf,
    register,
    noirService,
    connectWallet,
    isLoading,
    error,
  } = useWallet();
  const [step, setStep] = useState(0);
  const [isSelfVerifiedState, setIsSelfVerifiedState] = useState(false);
  const [selfVerificationMethod, setSelfVerificationMethod] = useState<
    "passport" | "aadhaar" | null
  >(null);
  const [verificationStep, setVerificationStep] = useState<
    "select" | "instructions" | "qr" | "verifying" | "completed"
  >("select");
  const [qrCode, setQrCode] = useState<string>("");
  const [deepLink, setDeepLink] = useState<string>("");
  const [verificationStatus, setVerificationStatus] = useState<string>("");
  const [willData, setWillData] = useState<WillData>({
    beneficiaries: [{ address: "", ethAmount: "", usdcAmount: "", name: "" }],
    description: "",
    willSalt: Math.random().toString(36).substring(2, 15),
    inactivityDays: "365",
    graceDays: "30",
    vetoMembers: [""],
    vetoThreshold: "1",
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [localError, setLocalError] = useState("");
  const [sealedCommitment, setSealedCommitment] = useState("");

  const addBeneficiary = () => {
    if (willData.beneficiaries.length < 8) {
      setWillData((prev) => ({
        ...prev,
        beneficiaries: [...prev.beneficiaries, { address: "", ethAmount: "", usdcAmount: "", name: "" }],
      }));
    }
  };

  const removeBeneficiary = (index: number) => {
    if (willData.beneficiaries.length > 1) {
      setWillData((prev) => ({
        ...prev,
        beneficiaries: prev.beneficiaries.filter((_, i) => i !== index),
      }));
    }
  };

  const updateBeneficiary = (index: number, field: keyof Beneficiary, value: string) => {
    setWillData((prev) => ({
      ...prev,
      beneficiaries: prev.beneficiaries.map((ben, i) => (i === index ? { ...ben, [field]: value } : ben)),
    }));
  };

  const addVetoMember = () => {
    if (willData.vetoMembers.length < MAX_VETO_MEMBERS) {
      setWillData((prev) => ({ ...prev, vetoMembers: [...prev.vetoMembers, ""] }));
    }
  };

  const removeVetoMember = (index: number) => {
    if (willData.vetoMembers.length > 1) {
      setWillData((prev) => ({
        ...prev,
        vetoMembers: prev.vetoMembers.filter((_, i) => i !== index),
      }));
    }
  };

  const updateVetoMember = (index: number, value: string) => {
    setWillData((prev) => ({
      ...prev,
      vetoMembers: prev.vetoMembers.map((m, i) => (i === index ? value : m)),
    }));
  };

  const vetoValidationError = (): string | null => {
    const members = willData.vetoMembers.map((m) => m.trim()).filter(Boolean);
    if (members.length === 0) return "Add at least one trusted circle member";
    if (members.some((m) => !/^0x[0-9a-fA-F]{40}$/.test(m))) {
      return "Every trusted circle member needs a valid address";
    }
    // Check for duplicate addresses (case-insensitive)
    const lowerCaseMembers = members.map((m) => m.toLowerCase());
    const uniqueMembers = new Set(lowerCaseMembers);
    if (uniqueMembers.size !== members.length) {
      return "Trusted circle members must all be different addresses";
    }
    // Check for zero address
    const zeroAddress = "0x0000000000000000000000000000000000000000";
    if (members.some((m) => m.toLowerCase() === zeroAddress)) {
      return "The zero address can't be a trusted circle member";
    }
    const threshold = parseInt(willData.vetoThreshold || "0", 10);
    if (!threshold || threshold < 1 || threshold > members.length) {
      return "Veto threshold must be between 1 and the number of trusted circle members";
    }
    const inactivitySeconds = parseFloat(willData.inactivityDays || "0") * 86400;
    const graceSeconds = parseFloat(willData.graceDays || "0") * 86400;
    if (inactivitySeconds < MIN_PERIOD_SECONDS) return "Inactivity period is too short";
    if (graceSeconds < MIN_PERIOD_SECONDS) return "Grace period is too short";
    return null;
  };

  const validateForm = () => {
    if (willData.beneficiaries.some((b) => !b.address.trim() || !b.name.trim())) {
      return "Please fill in all beneficiary details";
    }
    if (willData.beneficiaries.some((b) => !b.ethAmount && !b.usdcAmount)) {
      return "Each beneficiary must have at least one asset allocation";
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!isConnected || !account) {
      setLocalError("Please connect your wallet first");
      return;
    }
    const validationError = validateForm();
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    setIsProcessing(true);
    setLocalError("");
    try {
      const verified = await isSelfVerified(account);
      if (!verified) {
        setLocalError("Your wallet isn't verified with Self yet. Complete identity verification first.");
        setIsProcessing(false);
        return;
      }

      const description = willData.description.trim() || "Digital Will";
      // The circuit's beneficiary_eth/beneficiary_usdc are wei / 6-decimal-base-unit
      // integers — the same integers register()/executeWill() use on-chain — not
      // human decimal strings. noirService.stringToBigInt only parses plain
      // integers; feeding it "0.01" silently hashes the text instead of the
      // amount, corrupting the circuit's declared totals against the escrowed ones.
      const willDataForProof = {
        willSalt: willData.willSalt,
        willData: [description, "0", "0", "0"],
        beneficiaryCount: willData.beneficiaries.length.toString(),
        beneficiaryAddresses: willData.beneficiaries.map((b) => b.address),
        beneficiaryEth: willData.beneficiaries.map((b) => parseEther(b.ethAmount || "0").toString()),
        beneficiaryUsdc: willData.beneficiaries.map((b) =>
          parseUnits(b.usdcAmount || "0", USDC_DECIMALS).toString()
        ),
        beneficiaryNfts: willData.beneficiaries.map(() => "0"),
      };

      // Register needs no proof — only the commitment, root, and totals
      // (InheritanceRegistry.register takes no proof parameter).
      const willCommitment = await noirService.generateWillCommitmentAsync(willDataForProof);
      const merkleRoot = await noirService.generateMerkleRootAsync(willDataForProof);

      const totalEthWei = willData.beneficiaries.reduce(
        (sum, b) => sum + parseEther(b.ethAmount || "0"),
        0n
      );
      const totalUsdcBaseUnits = willData.beneficiaries.reduce(
        (sum, b) => sum + parseUnits(b.usdcAmount || "0", USDC_DECIMALS),
        0n
      );
      const merkleRootBigInt = BigInt(merkleRoot);

      const inactivityPeriodSeconds = BigInt(
        Math.round(parseFloat(willData.inactivityDays || "0") * 86400)
      );
      const gracePeriodSeconds = BigInt(Math.round(parseFloat(willData.graceDays || "0") * 86400));
      const vetoMembersAddrs = willData.vetoMembers.map((m) => m.trim()).filter(Boolean) as Hex[];
      const vetoThresholdBigInt = BigInt(parseInt(willData.vetoThreshold || "1", 10));

      await register(
        willCommitment as Hex,
        merkleRootBigInt,
        totalEthWei,
        totalUsdcBaseUnits,
        inactivityPeriodSeconds,
        gracePeriodSeconds,
        vetoMembersAddrs,
        vetoThresholdBigInt
      );

      setSealedCommitment(willCommitment);
      setStep(5);
    } catch (err) {
      console.error("Failed to register will:", err);
      setLocalError(err instanceof Error ? err.message : "Failed to register will");
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  const handleVerificationMethodSelect = (method: "passport" | "aadhaar") => {
    setSelfVerificationMethod(method);
    setVerificationStep("instructions");
  };

  // Testnet-only: this network's SelfHumanVerifier is a MockSelfVerifier —
  // Self's real identity hub only exists on Celo/Celo Sepolia today, so the
  // real QR/passport-scan flow above can never complete here. The mock has
  // no access control by design, so any connected wallet can verify itself.
  const handleMockVerify = async () => {
    if (!account) return;
    setIsProcessing(true);
    setLocalError("");
    try {
      await mockVerifySelf(account);
      setIsSelfVerifiedState(true);
      setVerificationStep("completed");
      setTimeout(() => setStep(1), 1500);
    } catch (err) {
      console.error("Mock verification failed:", err);
      setLocalError(err instanceof Error ? err.message : "Failed to verify");
    } finally {
      setIsProcessing(false);
    }
  };

  const generateQRCode = async () => {
    if (!account || !selfVerificationMethod) return;
    setVerificationStep("qr");
    try {
      const qrResult = await selfProtocolService.generateQRCode(selfVerificationMethod, account);
      setQrCode(qrResult.qrCode);
      setDeepLink(qrResult.deepLink);
    } catch (err) {
      console.error("Failed to generate QR code:", err);
      setLocalError("Failed to generate QR code. Please try again.");
      setVerificationStep("instructions");
    }
  };

  const startVerification = async () => {
    if (!account || !selfVerificationMethod) return;
    setVerificationStep("verifying");
    setVerificationStatus("Waiting for verification...");
    try {
      const result: SelfVerificationResult = await selfProtocolService.waitForVerification(
        selfVerificationMethod,
        account,
        (status) => setVerificationStatus(status)
      );
      if (result.success) {
        setIsSelfVerifiedState(true);
        setVerificationStep("completed");
        setTimeout(() => setStep(1), 2000);
      } else {
        throw new Error("Verification failed");
      }
    } catch (err) {
      console.error("Verification failed:", err);
      setLocalError("Verification failed. Please try again.");
      setVerificationStep("qr");
    }
  };

  const resetVerification = () => {
    setVerificationStep("select");
    setSelfVerificationMethod(null);
    setQrCode("");
    setDeepLink("");
    setVerificationStatus("");
    setIsSelfVerifiedState(false);
  };

  React.useEffect(() => {
    const checkExistingVerification = async () => {
      if (account && step === 0) {
        try {
          const verified = await isSelfVerified(account);
          if (verified) {
            setIsSelfVerifiedState(true);
            setVerificationStep("completed");
          }
        } catch {
          // no existing verification
        }
      }
    };
    checkExistingVerification();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, step]);

  const totalEthToLock = willData.beneficiaries
    .reduce((sum, ben) => sum + parseFloat(ben.ethAmount || "0"), 0)
    .toFixed(6);

  if (!isConnected) {
    return (
      <main className="mx-auto max-w-[1200px] px-6 py-24">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-8 w-40">
            <Pulse state="flat" height={40} />
          </div>
          <h1 className="t-h1 mb-3">Connect to seal a will</h1>
          <p className="t-body mb-8 text-ink-muted">
            Your wallet holds the assets and signs the sealing transaction.
          </p>
          <Button onClick={connectWallet} loading={isLoading}>
            Connect wallet
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[860px] px-6 py-12">
      <div className="t-eyebrow mb-3">SEAL A WILL</div>
      <h1 className="t-h1 mb-8">Turn your wishes into a proof.</h1>

      {step < 5 ? (
        <div className="mb-10">
          <Stepper steps={STEP_LABELS} current={step} />
        </div>
      ) : null}

      {/* Step 0 — Verify */}
      {step === 0 && isSelfVerifiedState ? (
        <VaultCard eyebrow="Identity" action={<StatusBadge tone="alive" dot>Verified</StatusBadge>}>
          <h2 className="t-h3 mb-2">You&apos;re verified</h2>
          <p className="t-body mb-6 text-ink-muted">
            Human and 18+ confirmed. Let&apos;s set up your will.
          </p>
          <Button onClick={() => setStep(1)}>
            Continue <ArrowRight size={16} />
          </Button>
        </VaultCard>
      ) : null}

      {step === 0 && !isSelfVerifiedState ? (
        <VaultCard eyebrow="Identity">
          <h2 className="t-h3 mb-2">Verify you&apos;re human and 18+</h2>
          <p className="t-body mb-6 text-ink-muted">
            Self Protocol proves humanity and age without revealing your documents.
          </p>

          {verificationStep === "select" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                onClick={() => handleVerificationMethodSelect("passport")}
                className="rounded-card border border-hairline p-5 text-left transition-colors hover:border-seal"
              >
                <div className="t-h3">Passport</div>
                <p className="t-body mt-1 text-ink-muted">International passport, NFC.</p>
              </button>
              <button
                onClick={() => handleVerificationMethodSelect("aadhaar")}
                className="rounded-card border border-hairline p-5 text-left transition-colors hover:border-seal"
              >
                <div className="t-h3">Aadhaar</div>
                <p className="t-body mt-1 text-ink-muted">Indian Aadhaar, QR.</p>
              </button>
            </div>
          ) : null}

          {verificationStep === "select" && getCurrentNetwork().selfVerifierIsMock ? (
            <div className="mt-5 border-t border-hairline pt-5">
              <p className="t-caption mb-3 max-w-[520px]">
                Self&apos;s real identity hub only exists on Celo today, so passport/Aadhaar
                verification can&apos;t complete on this network. This testnet deploy uses a
                mock gate instead — everything else (the circuit, the registry, the proof) is real.
              </p>
              <Button variant="secondary" onClick={handleMockVerify} loading={isProcessing}>
                Skip verification (testnet mock)
              </Button>
            </div>
          ) : null}

          {verificationStep === "instructions" ? (
            <div>
              <ol className="space-y-3">
                {selfVerificationMethod &&
                  selfProtocolService.getInstructions(selfVerificationMethod).map((ins, i) => (
                    <li key={i} className="flex gap-3 rounded-card border border-hairline p-4">
                      <span className="font-mono text-[13px] text-seal">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="t-body text-ink-muted">{ins}</span>
                    </li>
                  ))}
              </ol>
              <div className="mt-6 flex gap-3">
                <Button variant="secondary" onClick={resetVerification}>
                  Back
                </Button>
                <Button onClick={generateQRCode}>Generate QR code</Button>
              </div>
            </div>
          ) : null}

          {verificationStep === "qr" ? (
            <div className="flex flex-col items-center gap-5">
              <div className="rounded-card bg-white p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCode} alt="Self verification QR code" className="h-48 w-48" />
              </div>
              <p className="t-body text-center text-ink-muted">
                Open the Self app and scan to verify.
              </p>
              {deepLink ? (
                <Button variant="secondary" onClick={() => window.open(deepLink, "_blank")}>
                  Open in Self app
                </Button>
              ) : null}
              <Button onClick={startVerification}>I&apos;ve scanned it</Button>
            </div>
          ) : null}

          {verificationStep === "verifying" ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 size={28} className="animate-spin text-seal" />
              <p className="t-body text-ink-muted">{verificationStatus}</p>
            </div>
          ) : null}

          {verificationStep === "completed" ? (
            <div className="flex flex-col items-start gap-3">
              <StatusBadge tone="alive" dot>
                Verified
              </StatusBadge>
              <p className="t-body text-ink-muted">Proceeding to your will…</p>
            </div>
          ) : null}

          {localError ? <p className="t-caption mt-4 text-danger">{localError}</p> : null}
        </VaultCard>
      ) : null}

      {/* Step 1 — Details */}
      {step === 1 ? (
        <div className="space-y-6">
          <VaultCard eyebrow="Will details">
            <label className="t-eyebrow mb-2 block">Description</label>
            <textarea
              value={willData.description}
              onChange={(e) => setWillData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="A short note about this will and any instructions."
              rows={4}
              className="w-full rounded-control border border-hairline bg-surface-1 px-3 py-2.5 text-ink placeholder:text-ink-faint"
            />
            <p className="t-caption mt-4 max-w-[520px]">
              V1 supports ETH and USDC only. NFT allocations aren&apos;t
              supported yet — that&apos;s an additive follow-up.
            </p>
          </VaultCard>
          <div className="flex justify-end">
            <Button onClick={() => setStep(2)} disabled={!willData.description.trim()}>
              Next <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      ) : null}

      {/* Step 2 — Beneficiaries */}
      {step === 2 ? (
        <div className="space-y-6">
          {willData.beneficiaries.map((b, index) => (
            <VaultCard
              key={index}
              eyebrow={`Beneficiary ${String(index + 1).padStart(2, "0")}`}
              action={
                willData.beneficiaries.length > 1 ? (
                  <button
                    onClick={() => removeBeneficiary(index)}
                    className="text-ink-faint transition-colors hover:text-danger"
                    aria-label="Remove beneficiary"
                  >
                    <Trash2 size={16} />
                  </button>
                ) : undefined
              }
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Name"
                  placeholder="Beneficiary name"
                  value={b.name}
                  onChange={(e) => updateBeneficiary(index, "name", e.target.value)}
                />
                <Field
                  label="Address"
                  mono
                  placeholder="0x..."
                  value={b.address}
                  onChange={(e) => updateBeneficiary(index, "address", e.target.value)}
                />
              </div>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <Field
                  label="ETH"
                  mono
                  type="number"
                  placeholder="0.0"
                  value={b.ethAmount}
                  onChange={(e) => updateBeneficiary(index, "ethAmount", e.target.value)}
                />
                <Field
                  label="USDC"
                  mono
                  type="number"
                  placeholder="0"
                  value={b.usdcAmount}
                  onChange={(e) => updateBeneficiary(index, "usdcAmount", e.target.value)}
                />
              </div>
            </VaultCard>
          ))}

          {willData.beneficiaries.length < 8 ? (
            <Button variant="secondary" onClick={addBeneficiary} className="w-full">
              <Plus size={16} /> Add beneficiary
            </Button>
          ) : null}

          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={willData.beneficiaries.some((b) => !b.address.trim() || !b.name.trim())}
            >
              Next <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      ) : null}

      {/* Step 3 — Trusted circle */}
      {step === 3 ? (
        <div className="space-y-6">
          <VaultCard eyebrow="Safety settings">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Inactivity period (days)"
                mono
                type="number"
                placeholder="365"
                value={willData.inactivityDays}
                onChange={(e) => setWillData((prev) => ({ ...prev, inactivityDays: e.target.value }))}
              />
              <Field
                label="Grace period (days)"
                mono
                type="number"
                placeholder="30"
                value={willData.graceDays}
                onChange={(e) => setWillData((prev) => ({ ...prev, graceDays: e.target.value }))}
              />
            </div>
            <p className="t-caption mt-4 max-w-[520px]">
              If you miss check-ins for this long, anyone can open a grace
              window. Your trusted circle can veto during grace before
              anything executes.
            </p>
          </VaultCard>

          <VaultCard eyebrow="Trusted circle">
            {willData.vetoMembers.map((member, index) => (
              <div key={index} className="mb-4 flex items-end gap-3 last:mb-0">
                <div className="flex-1">
                  <Field
                    label={`Member ${String(index + 1).padStart(2, "0")}`}
                    mono
                    placeholder="0x..."
                    value={member}
                    onChange={(e) => updateVetoMember(index, e.target.value)}
                  />
                </div>
                {willData.vetoMembers.length > 1 ? (
                  <button
                    onClick={() => removeVetoMember(index)}
                    className="mb-2.5 text-ink-faint transition-colors hover:text-danger"
                    aria-label="Remove trusted member"
                  >
                    <Trash2 size={16} />
                  </button>
                ) : null}
              </div>
            ))}
            {willData.vetoMembers.length < MAX_VETO_MEMBERS ? (
              <Button variant="secondary" onClick={addVetoMember} className="mt-2 w-full">
                <Plus size={16} /> Add trusted member
              </Button>
            ) : null}
            <div className="mt-5">
              <Field
                label="Veto threshold"
                mono
                type="number"
                placeholder="1"
                value={willData.vetoThreshold}
                onChange={(e) => setWillData((prev) => ({ ...prev, vetoThreshold: e.target.value }))}
              />
              <p className="t-caption mt-1.5">
                How many of your trusted circle must veto to cancel a false alarm.
              </p>
            </div>
          </VaultCard>

          {vetoValidationError() ? (
            <p className="t-caption text-danger">{vetoValidationError()}</p>
          ) : null}

          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button onClick={() => setStep(4)} disabled={!!vetoValidationError()}>
              Next <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      ) : null}

      {/* Step 4 — Review */}
      {step === 4 ? (
        <div className="space-y-6">
          <VaultCard eyebrow="Review">
            <DataRow label="Description" value={willData.description || "Digital Will"} />
            <DataRow label="Beneficiaries" value={String(willData.beneficiaries.length)} />
            <DataRow label="ETH to lock" value={`${totalEthToLock} ETH`} />
          </VaultCard>

          <VaultCard eyebrow="Safety settings">
            <DataRow label="Inactivity period" value={`${willData.inactivityDays || "0"} days`} />
            <DataRow label="Grace period" value={`${willData.graceDays || "0"} days`} />
            <DataRow
              label="Trusted circle"
              value={`${willData.vetoMembers.filter((m) => m.trim()).length} members, threshold ${willData.vetoThreshold}`}
            />
          </VaultCard>

          <VaultCard eyebrow="Beneficiaries">
            {willData.beneficiaries.map((b, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-4 border-b border-hairline py-3 last:border-b-0"
              >
                <div>
                  <div className="t-body text-ink">{b.name}</div>
                  <div className="font-mono text-[13px] text-ink-faint">
                    {b.address.length > 12 ? `${b.address.slice(0, 6)}··${b.address.slice(-4)}` : b.address}
                  </div>
                </div>
                <div className="font-mono text-[13px] tabular-nums text-ink-muted">
                  {b.ethAmount || "0"} ETH · {b.usdcAmount || "0"} USDC
                </div>
              </div>
            ))}
          </VaultCard>

          <p className="t-caption max-w-[560px]">
            Sealing locks {totalEthToLock} ETH (and any declared USDC) in the
            contract until execution. Only the commitment is stored on-chain;
            your plan stays private. Keep your description, will salt, and
            beneficiary details safe — you&apos;ll need them again to execute.
          </p>

          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(3)}>
              Back
            </Button>
            <Button onClick={handleSubmit} loading={isProcessing}>
              Seal will <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      ) : null}

      {/* Step 5 — Success */}
      {step === 5 ? (
        <VaultCard eyebrow="Sealed" action={<StatusBadge tone="alive" dot>Active</StatusBadge>}>
          <h2 className="t-h2 mb-2">Your will is sealed.</h2>
          <p className="t-body mb-6 text-ink-muted">
            The commitment is on-chain; your plan stays private until execution.
          </p>

          <div className="rounded-card border border-hairline p-5">
            <div className="t-eyebrow mb-2">Commitment · keep this safe</div>
            <div className="flex items-center justify-between gap-3">
              <code className="truncate font-mono text-[13px] text-ink">
                {showPrivateKey ? sealedCommitment : "•".repeat(20)}
              </code>
              <div className="flex gap-3 text-ink-faint">
                <button onClick={() => setShowPrivateKey((v) => !v)} aria-label="Toggle commitment visibility" className="hover:text-ink">
                  {showPrivateKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button onClick={() => copyToClipboard(sealedCommitment)} aria-label="Copy commitment" className="hover:text-seal">
                  <Copy size={16} />
                </button>
              </div>
            </div>
          </div>

          <p className="t-caption mt-4 max-w-[560px]">
            You&apos;ll need this commitment, your will salt (
            <code className="font-mono">{willData.willSalt}</code>), and the
            same description and beneficiary details to execute this will
            later — the chain never stores them.
          </p>

          <div className="mt-8 flex flex-wrap gap-3 border-t border-hairline pt-6">
            <Button onClick={() => (window.location.href = "/checkin")}>
              Set up check-ins <ArrowRight size={16} />
            </Button>
            <Button variant="ghost" onClick={() => (window.location.href = "/app")}>
              Back to dashboard
            </Button>
          </div>
        </VaultCard>
      ) : null}

      {(localError || error) && step !== 0 ? (
        <p className="t-caption mt-6 text-danger">{localError || error}</p>
      ) : null}
    </main>
  );
}
