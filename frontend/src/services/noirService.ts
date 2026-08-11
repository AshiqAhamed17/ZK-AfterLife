// Real ZK proof service for zk-afterlife-agent. Proves only — chain calls
// live in registryService.ts. No mock fallback: if a real proof cannot be
// generated, this throws. A silently-returned mock proof is exactly the bug
// this file used to have.

import { hash2Async, hash4Async, hash5Async, toHex32 } from '@/lib/poseidon';

type NoirModule = typeof import('@noir-lang/noir_js');

export interface WillData {
  willSalt: string;
  willData: string[];
  beneficiaryCount: string;
  beneficiaryAddresses: string[];
  beneficiaryEth: string[];
  beneficiaryUsdc: string[];
  beneficiaryNfts: string[];
  calculatedTotals?: {
    totalEth: string;
    totalUsdc: string;
    totalNfts: string;
  };
}

export interface WillProof {
  willCommitment: string;
  merkleRoot: string;
  totalEth: string;
  totalUsdc: string;
  totalNftCount: string;
  proof: string;
  publicInputs: string[];
}

export interface BeneficiaryAllocation {
  address: string;
  ethAmount: string;
  usdcAmount: string;
  nftCount: string;
}

export class NoirService {
  private isInitialized = false;
  private noir: any | null = null;
  private backend: any | null = null;
  private acir: any | null = null;

  // Safely convert arbitrary strings (hex, decimal, or text) to a 256-bit bigint
  private stringToBigInt(value: string | undefined | null): bigint {
    if (value === undefined || value === null) return BigInt(0);
    const trimmed = value.trim();
    if (trimmed.length === 0) return BigInt(0);

    if (/^0x[0-9a-fA-F]+$/.test(trimmed)) {
      try { return BigInt(trimmed); } catch { /* fallthrough */ }
    }
    if (/^[+-]?\d+$/.test(trimmed)) {
      try { return BigInt(trimmed); } catch { /* fallthrough */ }
    }

    let hash = BigInt(0);
    const MOD_256 = (BigInt(1) << BigInt(256)) - BigInt(1);
    for (let i = 0; i < trimmed.length; i++) {
      hash = (hash * BigInt(131)) + BigInt(trimmed.charCodeAt(i));
      hash &= MOD_256;
    }
    return hash;
  }

  private bytesToHex(bytes: Uint8Array): string {
    let hex = '0x';
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
  }

  /**
   * Load the circuit artifact and the real UltraHonk proving backend.
   * Throws on any failure — no fallback mode. Idempotent.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const res = await fetch('/circuits/will_circuit.json');
    if (!res.ok) throw new Error('Failed to load circuit artifact');
    this.acir = await res.json();

    const noirMod: NoirModule = await import('@noir-lang/noir_js');
    const { Noir } = noirMod as any;

    const bbModule = await import('@aztec/bb.js');
    const { UltraHonkBackend } = bbModule as any;
    if (!UltraHonkBackend) {
      throw new Error('UltraHonkBackend not found in @aztec/bb.js');
    }

    this.noir = new Noir(this.acir);
    const acirBytes = this.acir?.bytecode || this.acir?.acir || this.acir;
    this.backend = new UltraHonkBackend(acirBytes);

    this.isInitialized = true;
  }

  // Generate will commitment hash (Poseidon-based). Pure hashing — does not
  // require initialize() (no wasm/backend dependency).
  async generateWillCommitmentAsync(willData: WillData): Promise<string> {
    const dataFields = willData.willData.map((d) => this.stringToBigInt(d));
    const salt = this.stringToBigInt(willData.willSalt);
    const commitment = await hash5Async(dataFields[0] || 0n, dataFields[1] || 0n, dataFields[2] || 0n, dataFields[3] || 0n, salt);
    return toHex32(commitment);
  }

  // Generate merkle root (Poseidon-based). Same: pure hashing, no backend.
  async generateMerkleRootAsync(willData: WillData): Promise<string> {
    const leaves: bigint[] = [];
    const count = parseInt(willData.beneficiaryCount || '0');
    for (let i = 0; i < Math.min(8, count); i++) {
      const addr = this.stringToBigInt(willData.beneficiaryAddresses[i]);
      const eth = this.stringToBigInt(willData.beneficiaryEth[i]);
      const usdc = this.stringToBigInt(willData.beneficiaryUsdc[i]);
      const nft = this.stringToBigInt(willData.beneficiaryNfts[i]);
      leaves.push(await hash4Async(addr, eth, usdc, nft));
    }
    while (leaves.length < 8) leaves.push(0n);
    const l1 = [
      await hash2Async(leaves[0], leaves[1]),
      await hash2Async(leaves[2], leaves[3]),
      await hash2Async(leaves[4], leaves[5]),
      await hash2Async(leaves[6], leaves[7]),
    ];
    const l2 = [await hash2Async(l1[0], l1[1]), await hash2Async(l1[2], l1[3])];
    const root = await hash2Async(l2[0], l2[1]);
    return toHex32(root);
  }

  /**
   * Generate a real ZK proof for will execution. Throws if the backend is
   * unavailable or proving fails — never returns a mock proof.
   */
  async generateWillProof(willData: WillData): Promise<WillProof> {
    await this.initialize();

    const willCommitment = await this.generateWillCommitmentAsync(willData);
    const merkleRoot = await this.generateMerkleRootAsync(willData);

    const totalEth = willData.beneficiaryEth.reduce((sum, eth) => sum + this.stringToBigInt(eth), BigInt(0)).toString();
    const totalUsdc = willData.beneficiaryUsdc.reduce((sum, usdc) => sum + this.stringToBigInt(usdc), BigInt(0)).toString();
    const totalNftCount = willData.beneficiaryNfts.reduce((sum, nft) => sum + this.stringToBigInt(nft), BigInt(0)).toString();

    if (!this.noir || !this.backend) {
      throw new Error('Noir/UltraHonk backend not initialized — cannot generate a real proof.');
    }

    const asField = (b: bigint) => '0x' + b.toString(16);
    const inputs = {
      will_commitment: asField(BigInt(willCommitment)),
      merkle_root: asField(BigInt(merkleRoot)),
      total_eth: asField(BigInt(totalEth)),
      total_usdc: asField(BigInt(totalUsdc)),
      total_nft_count: asField(BigInt(totalNftCount)),
      will_salt: asField(this.stringToBigInt(willData.willSalt)),
      will_data: willData.willData.map((d) => asField(this.stringToBigInt(d))),
      beneficiary_count: asField(BigInt(parseInt(willData.beneficiaryCount || '0'))),
      beneficiary_addresses: Array.from({ length: 8 }, (_, i) => asField(this.stringToBigInt(willData.beneficiaryAddresses[i] || '0'))),
      beneficiary_eth: Array.from({ length: 8 }, (_, i) => asField(this.stringToBigInt(willData.beneficiaryEth[i] || '0'))),
      beneficiary_usdc: Array.from({ length: 8 }, (_, i) => asField(this.stringToBigInt(willData.beneficiaryUsdc[i] || '0'))),
      beneficiary_nfts: Array.from({ length: 8 }, (_, i) => asField(this.stringToBigInt(willData.beneficiaryNfts[i] || '0'))),
    };

    const exec = await this.noir.execute(inputs);
    const witness = exec.witness ?? exec;

    const generated = await this.backend.generateProof(witness);
    const proofBytes: Uint8Array = (generated as any).proof;
    const pubInputsRaw: any[] = (generated as any).publicInputs || [];
    const proofHex = this.bytesToHex(proofBytes);
    const pubInputs: string[] = pubInputsRaw.map((x: any) => typeof x === 'bigint' ? asField(x) : String(x));

    const isValid = await this.backend.verifyProof(generated);
    if (!isValid) {
      throw new Error('Generated proof failed local verification.');
    }

    return {
      willCommitment,
      merkleRoot,
      totalEth,
      totalUsdc,
      totalNftCount,
      proof: proofHex,
      publicInputs: pubInputs.length > 0 ? pubInputs : [willCommitment, merkleRoot],
    };
  }

  // Validate will data
  validateWillData(willData: WillData): string[] {
    const errors: string[] = [];
    const beneficiaryCount = parseInt(willData.beneficiaryCount);

    if (beneficiaryCount <= 0 || beneficiaryCount > 8) {
      errors.push('Beneficiary count must be between 1 and 8');
    }
    if (willData.beneficiaryAddresses.length < beneficiaryCount) {
      errors.push('Insufficient beneficiary data provided');
    }

    let totalEth = BigInt(0);
    let totalUsdc = BigInt(0);
    let totalNfts = BigInt(0);

    for (let i = 0; i < beneficiaryCount; i++) {
      const eth = this.stringToBigInt(willData.beneficiaryEth[i] || '0');
      const usdc = this.stringToBigInt(willData.beneficiaryUsdc[i] || '0');
      const nft = this.stringToBigInt(willData.beneficiaryNfts[i] || '0');

      totalEth += eth;
      totalUsdc += usdc;
      totalNfts += nft;

      if (eth < BigInt(0) || usdc < BigInt(0) || nft < BigInt(0)) {
        errors.push(`Negative allocation found for beneficiary ${i}`);
      }
    }

    if (totalNfts !== BigInt(0)) {
      errors.push('NFTs are not supported in V1 — every beneficiary NFT count must be 0');
    }
    if (totalEth === BigInt(0) && totalUsdc === BigInt(0)) {
      errors.push('At least one beneficiary must have a non-zero allocation');
    }

    return errors;
  }

  getStatus(): { isInitialized: boolean; mode: string } {
    return {
      isInitialized: this.isInitialized,
      mode: this.backend ? 'real-zk' : 'uninitialized',
    };
  }
}
