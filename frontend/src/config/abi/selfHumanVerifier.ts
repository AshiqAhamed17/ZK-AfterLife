import { parseAbi } from "viem";

export const SELF_HUMAN_VERIFIER_ABI = parseAbi([
  "function isFullyVerified(address userAddress) view returns (bool)",
]);

// MockSelfVerifier (test double, no real Self Protocol hub — see
// NetworkConfig.selfVerifierIsMock) additionally exposes a permissionless
// setVerified, used only on networks where the real Self hub can't be
// reached same-chain.
export const MOCK_SELF_VERIFIER_ABI = parseAbi([
  "function setVerified(address user, bool value) external",
]);
