"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getBlock } from '@/lib/ethereum';
import { IconArrowLeft } from '@/components/Icons';
import { ethers } from 'ethers';

function truncate(str, start = 10, end = 6) {
    if (!str) return '';
    if (str.length <= start + end + 3) return str;
    return `${str.slice(0, start)}...${str.slice(-end)}`;
}

export default function BlockDetail() {
    const { id } = useParams();
    const router = useRouter();
    const [block, setBlock] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchBlock() {
            try {
                const data = await getBlock(isNaN(id) ? id : parseInt(id));
                if (!data) { setError("Bloc non trouvé."); return; }
                setBlock(data);
            } catch {
                setError("Erreur lors de la récupération du bloc.");
            } finally {
                setLoading(false);
            }
        }
        fetchBlock();
    }, [id]);

    if (loading) return (
        <div className="max-w-7xl mx-auto px-4 py-12">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton" style={{ height: 18, marginBottom: 12, width: `${60 + i * 5}%` }}></div>)}
        </div>
    );

    if (error) return (
        <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="error-banner">
                <h2 style={{ color: 'var(--red)', fontWeight: 700, fontSize: 18 }}>{error}</h2>
                <button onClick={() => router.back()} className="btn" style={{ marginTop: 12 }}><IconArrowLeft size={14} /></button>
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
            <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="btn"><IconArrowLeft size={14} /></button>
                <div>
                    <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-dark)' }}>
                        Block <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>#{block.number}</span>
                    </h1>
                </div>
            </div>

            <div className="card">
                <div className="card-header">Overview</div>
                <div>
                    <div className="detail-row">
                        <span className="detail-label">Block Height:</span>
                        <span className="detail-value" style={{ fontWeight: 600 }}>{block.number}</span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label">Timestamp:</span>
                        <span className="detail-value">{new Date(block.timestamp * 1000).toLocaleString()}</span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label">Transactions:</span>
                        <span className="detail-value">
                            <span style={{ fontWeight: 600 }}>{block.transactions.length}</span> transactions in this block
                        </span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label">Fee Recipient:</span>
                        <span className="detail-value font-mono">
                            <Link href={`/address/${block.miner}`}>{block.miner}</Link>
                        </span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label">Gas Used:</span>
                        <span className="detail-value">
                            {block.gasUsed.toString()} <span style={{ color: 'var(--text-light)' }}>/ {block.gasLimit.toString()}</span>
                        </span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label">Hash:</span>
                        <span className="detail-value font-mono" style={{ fontSize: 12 }}>{block.hash}</span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label">Parent Hash:</span>
                        <span className="detail-value font-mono" style={{ fontSize: 12 }}>
                            <Link href={`/block/${block.number - 1}`}>{block.parentHash}</Link>
                        </span>
                    </div>
                    {block.baseFeePerGas && (
                        <div className="detail-row">
                            <span className="detail-label">Base Fee Per Gas:</span>
                            <span className="detail-value">{ethers.formatUnits(block.baseFeePerGas, "gwei")} Gwei</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    Transactions ({block.transactions.length})
                </div>
                <div style={{ overflowX: 'auto' }}>
                    {block.prefetchedTransactions && block.prefetchedTransactions.length > 0 ? (
                        <table>
                            <thead>
                                <tr>
                                    <th>Txn Hash</th>
                                    <th>From</th>
                                    <th>To</th>
                                    <th>Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {block.prefetchedTransactions.map(tx => (
                                    <tr key={tx.hash}>
                                        <td className="font-mono">
                                            <Link href={`/tx/${tx.hash}`}>{truncate(tx.hash, 12, 6)}</Link>
                                        </td>
                                        <td className="font-mono" style={{ color: 'var(--text-muted)' }}>
                                            <Link href={`/address/${tx.from}`}>{truncate(tx.from)}</Link>
                                        </td>
                                        <td className="font-mono" style={{ color: 'var(--text-muted)' }}>
                                            {tx.to ? (
                                                <Link href={`/address/${tx.to}`}>{truncate(tx.to)}</Link>
                                            ) : (
                                                <span className="badge badge-success">Contract Creation</span>
                                            )}
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap' }}>{parseFloat(ethers.formatEther(tx.value)).toFixed(6)} Eth</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                            No transactions in this block.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
