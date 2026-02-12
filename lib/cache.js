import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';
import { getProvider } from './ethereum.js';

// ============================================================
// Server-Side Blockchain Cache — Incremental Sync
// ============================================================
// Stores scanned data in data/cache.json on disk.
// On each sync, only scans blocks after lastScannedBlock.

const CACHE_DIR = path.join(process.cwd(), 'data');
const CACHE_FILE = path.join(CACHE_DIR, 'cache.json');

const ERC20_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)"
];

// ---- Default empty cache ----
function emptyCache() {
    return {
        lastScannedBlock: -1,
        blocks: [],              // All blocks: { number, timestamp, miner, txCount, gasUsed, gasLimit }
        transactions: [],        // All txs: { hash, from, to, value, blockNumber, timestamp, gasPrice }
        contracts: [],            // Contract addresses found
        tokens: [],               // ERC-20 tokens: { address, name, symbol, decimals, totalSupply, totalSupplyFormatted }
        checkedContracts: [],     // Contracts already checked for ERC-20
        lastSynced: null,         // ISO timestamp of last sync
    };
}

// ---- Read cache from disk ----
export function readCache() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
            return JSON.parse(raw);
        }
    } catch (err) {
        console.error('[cache] Error reading cache:', err.message);
    }
    return emptyCache();
}

// ---- Write cache to disk ----
export function writeCache(cache) {
    try {
        if (!fs.existsSync(CACHE_DIR)) {
            fs.mkdirSync(CACHE_DIR, { recursive: true });
        }
        fs.writeFileSync(CACHE_FILE, JSON.stringify(cache), 'utf-8');
    } catch (err) {
        console.error('[cache] Error writing cache:', err.message);
    }
}

// ---- Sync cache: scan only new blocks ----
export async function syncCache() {
    const p = getProvider();
    const latest = await p.getBlockNumber();
    const cache = readCache();
    const startBlock = cache.lastScannedBlock + 1;

    // Already up to date?
    if (startBlock > latest) {
        return cache;
    }

    console.log(`[cache] Syncing blocks ${startBlock} → ${latest} (${latest - startBlock + 1} blocks)`);

    const BATCH_SIZE = 20;
    const newContracts = [];

    for (let i = startBlock; i <= latest; i += BATCH_SIZE) {
        const end = Math.min(i + BATCH_SIZE - 1, latest);
        const promises = [];
        for (let b = i; b <= end; b++) {
            promises.push(p.getBlock(b, true).catch(() => null));
        }

        const blocks = await Promise.all(promises);

        for (const block of blocks) {
            if (block) {
                // Store block metadata
                cache.blocks.push({
                    number: block.number,
                    timestamp: block.timestamp,
                    miner: block.miner,
                    txCount: block.transactions ? block.transactions.length : 0,
                    gasUsed: block.gasUsed?.toString() || '0',
                    gasLimit: block.gasLimit?.toString() || '0',
                });

                if (block.prefetchedTransactions) {
                    for (const tx of block.prefetchedTransactions) {
                        cache.transactions.push({
                            hash: tx.hash,
                            from: tx.from,
                            to: tx.to,
                            value: tx.value.toString(),
                            blockNumber: block.number,
                            timestamp: block.timestamp,
                            gasPrice: tx.gasPrice?.toString() || "0",
                        });

                        // Detect contract creation
                        if (!tx.to || tx.to === '0x0000000000000000000000000000000000000000') {
                            try {
                                const receipt = await p.getTransactionReceipt(tx.hash);
                                if (receipt && receipt.contractAddress) {
                                    const addr = receipt.contractAddress;
                                    if (!cache.contracts.includes(addr)) {
                                        cache.contracts.push(addr);
                                        newContracts.push(addr);
                                    }
                                }
                            } catch { }
                        }
                    }
                }
            }
        }
    }

    // Check new contracts for ERC-20
    for (const addr of newContracts) {
        if (cache.checkedContracts.includes(addr)) continue;
        cache.checkedContracts.push(addr);

        try {
            const contract = new ethers.Contract(addr, ERC20_ABI, p);
            const [name, symbol, decimals, totalSupply] = await Promise.all([
                contract.name().catch(() => null),
                contract.symbol().catch(() => null),
                contract.decimals().catch(() => null),
                contract.totalSupply().catch(() => null),
            ]);

            if (name && symbol && totalSupply !== null) {
                const dec = decimals !== null ? Number(decimals) : 18;
                // Remove old entry if exists (token supply may have changed)
                cache.tokens = cache.tokens.filter(t => t.address !== addr);
                cache.tokens.push({
                    address: addr,
                    name,
                    symbol,
                    decimals: dec,
                    totalSupply: totalSupply.toString(),
                    totalSupplyFormatted: parseFloat(ethers.formatUnits(totalSupply, dec)),
                });
            }
        } catch { }
    }

    // Sort tokens by supply
    cache.tokens.sort((a, b) => b.totalSupplyFormatted - a.totalSupplyFormatted);

    cache.lastScannedBlock = latest;
    cache.lastSynced = new Date().toISOString();

    writeCache(cache);
    console.log(`[cache] Sync complete. ${cache.transactions.length} txs, ${cache.tokens.length} tokens, ${cache.contracts.length} contracts.`);

    return cache;
}

// ---- Derived data: build network graph from cached transactions ----
export async function getNetworkGraphFromCache(cache) {
    const p = getProvider();
    const addressSet = new Set();
    const edgeMap = {};

    for (const tx of cache.transactions) {
        const from = tx.from?.toLowerCase();
        const to = tx.to?.toLowerCase();
        if (from) addressSet.add(from);
        if (to) {
            addressSet.add(to);
            const key = [from, to].sort().join('-');
            edgeMap[key] = (edgeMap[key] || 0) + 1;
        }
    }

    // Get balances
    const addresses = Array.from(addressSet);
    const nodes = [];

    // Batch balance queries
    for (const addr of addresses) {
        let balance = 0;
        try {
            const bal = await p.getBalance(addr);
            balance = parseFloat(ethers.formatEther(bal));
        } catch { }
        nodes.push({
            id: addr,
            label: `${addr.slice(0, 6)}...${addr.slice(-4)}`,
            balance
        });
    }

    const edges = Object.entries(edgeMap).map(([key, count]) => {
        const [source, target] = key.split('-');
        return { source, target, weight: count };
    });

    return { nodes, edges };
}
