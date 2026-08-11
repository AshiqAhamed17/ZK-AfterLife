import { parseAbi } from "viem";

export const SELF_HUMAN_VERIFIER_ABI = parseAbi([
  "function isFullyVerified(address userAddress) view returns (bool)",
]);
