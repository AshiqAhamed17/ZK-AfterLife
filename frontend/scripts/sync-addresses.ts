import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const broadcastDir = join(__dirname, '../../contracts/broadcast/Deploy.s.sol/31337');
const latestFile = join(broadcastDir, 'run-latest.json');
const contractsTs = join(__dirname, '../src/config/contracts.ts');

interface TxEntry {
    contractName?: string;
    contractAddress?: string;
}

function main() {
    if (!existsSync(latestFile)) {
        console.error('No broadcast run-latest.json found at', latestFile);
        process.exit(1);
    }
    if (!existsSync(contractsTs)) {
        console.error('contracts.ts not found at', contractsTs);
        process.exit(1);
    }

    const run = JSON.parse(readFileSync(latestFile, 'utf8'));
    const txs: TxEntry[] = run.transactions || [];

    const addrMap: Record<string, string> = {};
    for (const tx of txs) {
        if (tx.contractName && tx.contractAddress) {
            addrMap[tx.contractName] = tx.contractAddress;
        }
    }

    const src = readFileSync(contractsTs, 'utf8');
    // Simple replace for localhost addresses
    let out = src
        .replace(/(l1Heartbeat:\s*')[^']+('\s*,)/, `$1${addrMap['L1Heartbeat'] || '0x0000000000000000000000000000000000000000'}$2`)
        .replace(/(aztecExecutor:\s*')[^']+('\s*,)/, `$1${addrMap['AztecExecutor'] || '0x0000000000000000000000000000000000000000'}$2`)
        .replace(/(l1AztecBridge:\s*')[^']+('\s*,)/, `$1${addrMap['L1AztecBridge'] || '0x0000000000000000000000000000000000000000'}$2`);

    writeFileSync(contractsTs, out, 'utf8');
    console.log('Updated localhost addresses in contracts.ts');
}

main();
