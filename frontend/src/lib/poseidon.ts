let poseidonFn: ((inputs: bigint[]) => any) | null = null;
let poseidonFieldToBigInt: ((x: any) => bigint) | null = null;

async function ensurePoseidon(): Promise<void> {
    if (poseidonFn) return;

    try {
        const m = await import('circomlibjs');
        let poseidon: any;

        // Try different ways to get poseidon from circomlibjs
        if (m.poseidon) {
            poseidon = m.poseidon;
        } else if (m.buildPoseidon) {
            poseidon = await m.buildPoseidon();
        } else {
            throw new Error('No poseidon function found in circomlibjs');
        }

        if (!poseidon) throw new Error('Poseidon backend not available');

        poseidonFn = (arr: bigint[]) => {
            try {
                return poseidon(arr);
            } catch (e) {
                // Fallback: convert to strings if bigint conversion fails
                const strArr = arr.map(x => x.toString());
                return poseidon(strArr);
            }
        };

        // Handle different return types from circomlibjs
        poseidonFieldToBigInt = (x: any) => {
            if (typeof x === 'bigint') return x;
            if (typeof x === 'string') return BigInt(x);
            if (typeof x === 'number') return BigInt(x);

            // Try to extract from field object
            const F = (poseidon as any).F;
            if (F && F.toObject) {
                return BigInt(F.toObject(x));
            }
            if (F && F.toString) {
                return BigInt(F.toString(x));
            }

            // Last resort: convert to string then to BigInt
            return BigInt(String(x));
        };
    } catch (error) {
        console.error('Failed to load circomlibjs:', error);
        throw new Error('Poseidon backend not available: ' + error);
    }
}

// Helper to convert bigint to 0x-prefixed hex padded to 32 bytes
export function toHex32(value: bigint): string {
    return '0x' + value.toString(16).padStart(64, '0');
}

// Poseidon hash of an array of bigint-like inputs
export async function poseidonHashAsync(inputs: Array<bigint | string | number>): Promise<bigint> {
    await ensurePoseidon();
    const vals = inputs.map((x) => {
        if (typeof x === 'bigint') return x;
        if (typeof x === 'number') return BigInt(x);
        const s = String(x).trim();
        if (/^0x[0-9a-fA-F]+$/.test(s)) return BigInt(s);
        if (/^[+-]?\d+$/.test(s)) return BigInt(s);
        // Fallback: hash string into a field by char codes
        let acc = 0n;
        for (let i = 0; i < s.length; i++) acc = (acc * 131n + BigInt(s.charCodeAt(i))) & ((1n << 256n) - 1n);
        return acc;
    });
    const out = (poseidonFn as any)(vals);
    return (poseidonFieldToBigInt as any)(out);
}

// Merkle root over 8 leaves using Poseidon(left,right)
export async function poseidonMerkleRootAsync(leaves: bigint[]): Promise<bigint> {
    await ensurePoseidon();
    const padded = [...leaves];
    while (padded.length < 8) padded.push(0n);
    const l1: bigint[] = [];
    for (let i = 0; i < 4; i++) {
        const out = (poseidonFn as any)([padded[2 * i], padded[2 * i + 1]]);
        l1.push((poseidonFieldToBigInt as any)(out));
    }
    const l2: bigint[] = [];
    for (let i = 0; i < 2; i++) {
        const out = (poseidonFn as any)([l1[2 * i], l1[2 * i + 1]]);
        l2.push((poseidonFieldToBigInt as any)(out));
    }
    const rootOut = (poseidonFn as any)([l2[0], l2[1]]);
    return (poseidonFieldToBigInt as any)(rootOut);
}

export async function hash2Async(a: bigint, b: bigint): Promise<bigint> {
    await ensurePoseidon();
    const out = (poseidonFn as any)([a, b]);
    return (poseidonFieldToBigInt as any)(out);
}
export async function hash4Async(a: bigint, b: bigint, c: bigint, d: bigint): Promise<bigint> {
    await ensurePoseidon();
    const out = (poseidonFn as any)([a, b, c, d]);
    return (poseidonFieldToBigInt as any)(out);
}
export async function hash5Async(a: bigint, b: bigint, c: bigint, d: bigint, e: bigint): Promise<bigint> {
    await ensurePoseidon();
    const out = (poseidonFn as any)([a, b, c, d, e]);
    return (poseidonFieldToBigInt as any)(out);
}


