import { ethers } from 'ethers';

// ============================================================
// Lite Scan — Ethereum Provider & RPC Helpers
// ============================================================

const RPC_URL = "http://10.229.43.182:8545";
const NETWORK_CONFIG = {
  chainId: 32383,
  name: "Ethereum CPNV"
};

let provider;

export function getProvider() {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(RPC_URL, NETWORK_CONFIG, {
      staticNetwork: true
    });
  }
  return provider;
}

// ---- Basic Queries ----

export async function getLatestBlockNumber() {
  const p = getProvider();
  return await p.getBlockNumber();
}

export async function getGasPrice() {
  try {
    const p = getProvider();
    const feeData = await p.getFeeData();
    return ethers.formatUnits(feeData.gasPrice || 0n, "gwei");
  } catch {
    return "0";
  }
}

export async function getBlock(blockHashOrNumber) {
  const p = getProvider();
  return await p.getBlock(blockHashOrNumber, true);
}

export async function getTransaction(hash) {
  const p = getProvider();
  const [tx, receipt] = await Promise.all([
    p.getTransaction(hash),
    p.getTransactionReceipt(hash)
  ]);
  return { tx, receipt };
}

export async function getBalance(address) {
  try {
    const p = getProvider();
    const balance = await p.getBalance(address);
    return ethers.formatEther(balance);
  } catch {
    return "0.0";
  }
}

export async function getTransactionCount(address) {
  try {
    const p = getProvider();
    return await p.getTransactionCount(address);
  } catch {
    return 0;
  }
}

// ---- Recent Blocks ----

export async function getRecentBlocks(count = 10) {
  const p = getProvider();
  const latest = await p.getBlockNumber();
  const promises = [];
  const start = Math.max(0, latest - count + 1);
  for (let i = latest; i >= start; i--) {
    promises.push(p.getBlock(i));
  }
  return await Promise.all(promises);
}

// ---- Recent Transactions (scan backwards through ALL blocks) ----
// Uses batched parallel requests for performance.
// Scans from latest block backwards until enough txs are found.

export async function getRecentTransactions(count = 10) {
  const p = getProvider();
  const latest = await p.getBlockNumber();
  let txs = [];
  const BATCH_SIZE = 20;

  // Scan backwards in batches
  for (let start = latest; start >= 0 && txs.length < count; start -= BATCH_SIZE) {
    const end = Math.max(start - BATCH_SIZE + 1, 0);
    const promises = [];
    for (let b = start; b >= end; b--) {
      promises.push(p.getBlock(b, true).catch(() => null));
    }

    const blocks = await Promise.all(promises);

    for (const block of blocks) {
      if (block && block.prefetchedTransactions) {
        for (const tx of block.prefetchedTransactions) {
          txs.push({
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            value: tx.value.toString(),
            blockNumber: block.number,
            timestamp: block.timestamp,
            gasPrice: tx.gasPrice?.toString() || "0",
          });
        }
      }
    }
  }

  // Sort by block number descending (newest first)
  txs.sort((a, b) => b.blockNumber - a.blockNumber);
  return txs.slice(0, count);
}

// ---- Full Transaction History Scan ----
// Scans the ENTIRE blockchain from block 0 to latest for ALL transactions.
// Returns progressively via callback.

export async function getAllTransactions(onProgress) {
  const p = getProvider();
  const latest = await p.getBlockNumber();
  const allTxs = [];
  const BATCH_SIZE = 20;

  for (let i = 0; i <= latest; i += BATCH_SIZE) {
    const end = Math.min(i + BATCH_SIZE - 1, latest);
    const promises = [];
    for (let b = i; b <= end; b++) {
      promises.push(p.getBlock(b, true).catch(() => null));
    }

    const blocks = await Promise.all(promises);

    for (const block of blocks) {
      if (block && block.prefetchedTransactions) {
        for (const tx of block.prefetchedTransactions) {
          allTxs.push({
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            value: tx.value.toString(),
            blockNumber: block.number,
            timestamp: block.timestamp,
            gasPrice: tx.gasPrice?.toString() || "0",
          });
        }
      }
    }

    if (onProgress) {
      onProgress({
        transactions: [...allTxs],
        scanned: Math.min(end + 1, latest + 1),
        total: latest + 1
      });
    }
  }

  return allTxs;
}

// ---- Full Address History Scan ----
// Scans the ENTIRE blockchain from block 0 to latest for txs to/from address.
// Uses batched parallel requests for performance.
// Returns { transactions, scanned, total } progressively via callback.

export async function getAllAddressTransactions(address, onProgress) {
  const p = getProvider();
  const latest = await p.getBlockNumber();
  const addr = address.toLowerCase();
  const allTxs = [];
  const BATCH_SIZE = 20; // Request 20 blocks in parallel

  for (let i = 0; i <= latest; i += BATCH_SIZE) {
    const end = Math.min(i + BATCH_SIZE - 1, latest);
    const promises = [];
    for (let b = i; b <= end; b++) {
      promises.push(p.getBlock(b, true).catch(() => null));
    }

    const blocks = await Promise.all(promises);

    for (const block of blocks) {
      if (block && block.prefetchedTransactions) {
        for (const tx of block.prefetchedTransactions) {
          if (tx.from?.toLowerCase() === addr || tx.to?.toLowerCase() === addr) {
            allTxs.push({
              hash: tx.hash,
              from: tx.from,
              to: tx.to,
              value: tx.value.toString(),
              blockNumber: block.number,
              timestamp: block.timestamp,
              gasPrice: tx.gasPrice?.toString() || "0",
            });
          }
        }
      }
    }

    // Report progress
    if (onProgress) {
      onProgress({
        transactions: [...allTxs],
        scanned: Math.min(end + 1, latest + 1),
        total: latest + 1
      });
    }
  }

  return allTxs;
}

// ---- ERC-20 Token Scanner ----
// Scans the entire blockchain for contract creation transactions,
// then probes each contract for ERC-20 interface (name, symbol, decimals, totalSupply).

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)"
];

export async function scanAllTokens(onProgress) {
  const p = getProvider();
  const latest = await p.getBlockNumber();
  const contractAddresses = new Set();
  const BATCH_SIZE = 20;

  // Phase 1: Find all contract creation transactions
  for (let i = 0; i <= latest; i += BATCH_SIZE) {
    const end = Math.min(i + BATCH_SIZE - 1, latest);
    const promises = [];
    for (let b = i; b <= end; b++) {
      promises.push(p.getBlock(b, true).catch(() => null));
    }

    const blocks = await Promise.all(promises);

    for (const block of blocks) {
      if (block && block.prefetchedTransactions) {
        for (const tx of block.prefetchedTransactions) {
          if (!tx.to || tx.to === '0x0000000000000000000000000000000000000000') {
            // Contract creation — get address from receipt
            try {
              const receipt = await p.getTransactionReceipt(tx.hash);
              if (receipt && receipt.contractAddress) {
                contractAddresses.add(receipt.contractAddress);
              }
            } catch { }
          }
        }
      }
    }

    if (onProgress) {
      onProgress({
        phase: 'scanning',
        scanned: Math.min(end + 1, latest + 1),
        total: latest + 1,
        contractsFound: contractAddresses.size,
        tokens: []
      });
    }
  }

  // Phase 2: Check each contract for ERC-20 compliance
  const tokens = [];
  const contracts = Array.from(contractAddresses);

  for (let i = 0; i < contracts.length; i++) {
    const addr = contracts[i];
    try {
      const contract = new ethers.Contract(addr, ERC20_ABI, p);
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        contract.name().catch(() => null),
        contract.symbol().catch(() => null),
        contract.decimals().catch(() => null),
        contract.totalSupply().catch(() => null),
      ]);

      // If at least name and symbol work, it's likely ERC-20
      if (name && symbol && totalSupply !== null) {
        const dec = decimals !== null ? Number(decimals) : 18;
        tokens.push({
          address: addr,
          name,
          symbol,
          decimals: dec,
          totalSupply: totalSupply.toString(),
          totalSupplyFormatted: parseFloat(ethers.formatUnits(totalSupply, dec)),
        });
      }
    } catch { }

    if (onProgress) {
      onProgress({
        phase: 'checking',
        scanned: i + 1,
        total: contracts.length,
        contractsFound: contracts.length,
        tokens: [...tokens]
      });
    }
  }

  // Sort by totalSupply descending
  tokens.sort((a, b) => b.totalSupplyFormatted - a.totalSupplyFormatted);
  return tokens;
}

// ---- Transaction Heatmap Data ----
// Scans all blocks and aggregates transaction counts per hour.
// Returns a Map of "YYYY-MM-DD-HH" -> count.

export async function getTransactionHeatmapData(onProgress) {
  const p = getProvider();
  const latest = await p.getBlockNumber();
  const hourlyCounts = {};
  const BATCH_SIZE = 20;

  for (let i = 0; i <= latest; i += BATCH_SIZE) {
    const end = Math.min(i + BATCH_SIZE - 1, latest);
    const promises = [];
    for (let b = i; b <= end; b++) {
      promises.push(p.getBlock(b, false).catch(() => null));
    }

    const blocks = await Promise.all(promises);

    for (const block of blocks) {
      if (block) {
        const d = new Date(block.timestamp * 1000);
        const dateStr = d.toISOString().split('T')[0];
        const hour = d.getUTCHours();
        const key = `${dateStr}-${String(hour).padStart(2, '0')}`;
        const txCount = block.transactions ? block.transactions.length : 0;
        hourlyCounts[key] = (hourlyCounts[key] || 0) + txCount;
      }
    }

    if (onProgress) {
      onProgress({
        scanned: Math.min(end + 1, latest + 1),
        total: latest + 1,
        data: { ...hourlyCounts }
      });
    }
  }

  return hourlyCounts;
}

// ---- Network Graph Data ----
// Scans all transactions to build a graph of addresses (nodes) and interactions (edges).
// Nodes are sized by ETH balance, edges represent tx interactions.

export async function getNetworkGraphData(onProgress) {
  const p = getProvider();
  const latest = await p.getBlockNumber();
  const addressSet = new Set();
  const edgeMap = {};   // "from-to" -> count
  const BATCH_SIZE = 20;

  // Phase 1: Scan all blocks for transactions
  for (let i = 0; i <= latest; i += BATCH_SIZE) {
    const end = Math.min(i + BATCH_SIZE - 1, latest);
    const promises = [];
    for (let b = i; b <= end; b++) {
      promises.push(p.getBlock(b, true).catch(() => null));
    }

    const blocks = await Promise.all(promises);

    for (const block of blocks) {
      if (block && block.prefetchedTransactions) {
        for (const tx of block.prefetchedTransactions) {
          const from = tx.from?.toLowerCase();
          const to = tx.to?.toLowerCase();
          if (from) addressSet.add(from);
          if (to) {
            addressSet.add(to);
            const key = [from, to].sort().join('-');
            edgeMap[key] = (edgeMap[key] || 0) + 1;
          }
        }
      }
    }

    if (onProgress) {
      onProgress({
        phase: 'scanning',
        scanned: Math.min(end + 1, latest + 1),
        total: latest + 1,
        addressCount: addressSet.size,
        edgeCount: Object.keys(edgeMap).length
      });
    }
  }

  // Phase 2: Get ETH balance for each address
  const addresses = Array.from(addressSet);
  const nodes = [];

  for (let i = 0; i < addresses.length; i++) {
    const addr = addresses[i];
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

    if (onProgress) {
      onProgress({
        phase: 'balances',
        scanned: i + 1,
        total: addresses.length,
        addressCount: addresses.length,
        edgeCount: Object.keys(edgeMap).length
      });
    }
  }

  // Build edges array
  const edges = Object.entries(edgeMap).map(([key, count]) => {
    const [source, target] = key.split('-');
    return { source, target, weight: count };
  });

  return { nodes, edges };
}
