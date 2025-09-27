import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

export const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(),
});

export function getHeartbeatContractAddress(): `0x${string}` | null {
    return process.env.NEXT_PUBLIC_HEARTBEAT_ADDRESS as `0x${string}` | null;
}


