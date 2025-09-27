// Placeholder Noir integration
export type NoirProof = {
    proof: string;
    publicInputs: string[];
};

export async function generateWillProof(): Promise<NoirProof> {
    // TODO: hook up @noir-lang/noir_js with compiled circuit
    return { proof: '', publicInputs: [] };
}


