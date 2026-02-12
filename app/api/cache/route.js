import { NextResponse } from 'next/server';
import { syncCache, getNetworkGraphFromCache } from '@/lib/cache';

// GET /api/cache?type=all|transactions|tokens|network
// Syncs the cache (only new blocks) and returns requested data.

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'all';

        // Sync cache — only scans new blocks since last sync
        const cache = await syncCache();

        switch (type) {
            case 'transactions':
                return NextResponse.json({
                    transactions: cache.transactions,
                    lastScannedBlock: cache.lastScannedBlock,
                    lastSynced: cache.lastSynced,
                });

            case 'tokens':
                return NextResponse.json({
                    tokens: cache.tokens,
                    lastScannedBlock: cache.lastScannedBlock,
                    lastSynced: cache.lastSynced,
                });

            case 'network':
                const graphData = await getNetworkGraphFromCache(cache);
                return NextResponse.json({
                    ...graphData,
                    lastScannedBlock: cache.lastScannedBlock,
                    lastSynced: cache.lastSynced,
                });

            case 'all':
            default:
                return NextResponse.json({
                    transactions: cache.transactions,
                    tokens: cache.tokens,
                    contracts: cache.contracts,
                    lastScannedBlock: cache.lastScannedBlock,
                    lastSynced: cache.lastSynced,
                    txCount: cache.transactions.length,
                    tokenCount: cache.tokens.length,
                    contractCount: cache.contracts.length,
                });
        }
    } catch (error) {
        console.error('[api/cache] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
