"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getTransaction } from '@/lib/ethereum';
import { IconArrowLeft } from '@/components/Icons';
import { ethers } from 'ethers';

export default function TxDetail() {
    const { hash } = useParams();
    const router = useRouter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchTx() {
            try {
                const result = await getTransaction(hash);
                if (!result || !result.tx) { setError("Transaction non trouvée."); return; }
                setData(result);
            } catch {
                setError("Erreur lors de la récupération de la transaction.");
            } finally {
                setLoading(false);
            }
        }
        fetchTx();
    }, [hash]);

    if (loading) return (
        <div className="max-w-7xl mx-auto px-4 py-12">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton" style={{ height: 18, marginBottom: 12, width: `${50 + i * 7}%` }}></div>)}
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

    const { tx, receipt } = data;
    const gasUsed = receipt?.gasUsed || 0n;
    const txGasPrice = tx?.gasPrice || 0n;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
            <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="btn"><IconArrowLeft size={14} /></button>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-dark)' }}>Transaction Details</h1>
            </div>

            <div className="card">
                <div className="card-header">
                    <span>Overview</span>
                    {receipt && (
                        receipt.status === 1 ? (
                            <span className="badge badge-success">✓ Success</span>
                        ) : (
                            <span className="badge badge-error">✗ Failed</span>
                        )
                    )}
                </div>
                <div>
                    <div className="detail-row">
                        <span className="detail-label">Transaction Hash:</span>
                        <span className="detail-value font-mono" style={{ fontSize: 12 }}>{tx.hash}</span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label">Status:</span>
                        <span className="detail-value">
                            {receipt?.status === 1 ? (
                                <span className="badge badge-success">Success</span>
                            ) : (
                                <span className="badge badge-error">Failed</span>
                            )}
                        </span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label">Block:</span>
                        <span className="detail-value">
                            <Link href={`/block/${tx.blockNumber}`} style={{ fontWeight: 600 }}>{tx.blockNumber}</Link>
                        </span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label">From:</span>
                        <span className="detail-value font-mono">
                            <Link href={`/address/${tx.from}`}>{tx.from}</Link>
                        </span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label">To:</span>
                        <span className="detail-value font-mono">
                            {tx.to ? (
                                <Link href={`/address/${tx.to}`}>{tx.to}</Link>
                            ) : (
                                <span style={{ color: '#e65100' }}>Contract Creation</span>
                            )}
                        </span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label">Value:</span>
                        <span className="detail-value" style={{ fontWeight: 700, fontSize: 15 }}>
                            {ethers.formatEther(tx.value)} ETH
                        </span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label">Transaction Fee:</span>
                        <span className="detail-value">
                            {ethers.formatEther(BigInt(gasUsed) * BigInt(txGasPrice))} ETH
                        </span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label">Gas Price:</span>
                        <span className="detail-value">{ethers.formatUnits(txGasPrice, "gwei")} Gwei</span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label">Gas Used:</span>
                        <span className="detail-value">{gasUsed.toString()}</span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label">Nonce:</span>
                        <span className="detail-value">{tx.nonce}</span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label">Input Data:</span>
                        <div className="detail-value">
                            <div style={{
                                background: 'var(--bg-body)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 8, padding: '10px 14px',
                                fontFamily: 'monospace', fontSize: 11,
                                color: 'var(--text-muted)',
                                maxHeight: 200, overflowY: 'auto',
                                wordBreak: 'break-all'
                            }}>
                                {tx.data}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
