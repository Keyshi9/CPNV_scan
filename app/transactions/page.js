"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getAllTransactions } from '@/lib/ethereum';
import { IconArrowLeft, IconScan } from '@/components/Icons';
import { ethers } from 'ethers';

function truncate(str, start = 10, end = 6) {
    if (!str) return '';
    if (str.length <= start + end + 3) return str;
    return `${str.slice(0, start)}...${str.slice(-end)}`;
}

function timeAgo(timestamp) {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    if (diff < 5) return "just now";
    if (diff < 60) return `${diff} secs ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hrs ago`;
    return new Date(timestamp * 1000).toLocaleDateString();
}

const PAGE_SIZE = 25;

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState([]);
    const [scanning, setScanning] = useState(true);
    const [scanProgress, setScanProgress] = useState({ scanned: 0, total: 1 });
    const [currentPage, setCurrentPage] = useState(1);
    const scanAbort = useRef(false);

    useEffect(() => {
        scanAbort.current = false;

        async function fetchAll() {
            try {
                await getAllTransactions((progress) => {
                    if (scanAbort.current) return;
                    setTransactions(progress.transactions);
                    setScanProgress({ scanned: progress.scanned, total: progress.total });
                });
                setScanning(false);
            } catch (err) {
                console.error(err);
                setScanning(false);
            }
        }

        fetchAll();
        return () => { scanAbort.current = true; };
    }, []);

    // Pagination — newest first
    const reversedTxs = [...transactions].reverse();
    const totalPages = Math.max(1, Math.ceil(reversedTxs.length / PAGE_SIZE));
    const paginatedTxs = reversedTxs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const progressPercent = scanProgress.total > 0 ? Math.round((scanProgress.scanned / scanProgress.total) * 100) : 0;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
            <div className="flex items-center gap-3">
                <Link href="/" className="btn"><IconArrowLeft size={14} /></Link>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-dark)' }}>
                    All Transactions
                </h1>
            </div>

            {/* Scan Progress */}
            {scanning && (
                <div className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <IconScan size={14} color="var(--green)" /> Scanning entire blockchain...
                        </span>
                        <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--green)' }}>
                            {scanProgress.scanned.toLocaleString()} / {scanProgress.total.toLocaleString()} blocks ({progressPercent}%)
                        </span>
                    </div>
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 8 }}>
                        {transactions.length} transaction(s) found so far. Results update in real-time.
                    </p>
                </div>
            )}

            {/* Transactions Table */}
            <div className="card">
                <div className="card-header">
                    <span>Transactions ({transactions.length}{scanning ? '+' : ''})</span>
                    {!scanning && (
                        <span style={{ fontSize: 11, color: 'var(--text-light)' }}>
                            Full history · {scanProgress.total.toLocaleString()} blocks scanned
                        </span>
                    )}
                </div>
                <div style={{ overflowX: 'auto' }}>
                    {paginatedTxs.length === 0 ? (
                        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                            {scanning ? 'Scanning blockchain...' : 'No transactions found.'}
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Txn Hash</th>
                                    <th>Block</th>
                                    <th>Age</th>
                                    <th>From</th>
                                    <th>To</th>
                                    <th>Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedTxs.map(tx => (
                                    <tr key={tx.hash}>
                                        <td className="font-mono">
                                            <Link href={`/tx/${tx.hash}`}>{truncate(tx.hash, 12, 6)}</Link>
                                        </td>
                                        <td><Link href={`/block/${tx.blockNumber}`}>{tx.blockNumber}</Link></td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>{timeAgo(tx.timestamp)}</td>
                                        <td className="font-mono" style={{ color: 'var(--text-muted)' }}>
                                            <Link href={`/address/${tx.from}`}>{truncate(tx.from, 8, 4)}</Link>
                                        </td>
                                        <td className="font-mono" style={{ color: 'var(--text-muted)' }}>
                                            {tx.to ? (
                                                <Link href={`/address/${tx.to}`}>{truncate(tx.to, 8, 4)}</Link>
                                            ) : <span className="badge badge-success">Contract</span>}
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap' }}>{parseFloat(ethers.formatEther(tx.value)).toFixed(6)} Eth</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="pagination" style={{ borderTop: '1px solid var(--border-light)' }}>
                        <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>«</button>
                        <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>‹</button>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)', padding: '0 8px' }}>
                            Page {currentPage} of {totalPages}
                        </span>
                        <button className="page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>›</button>
                        <button className="page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}>»</button>
                    </div>
                )}
            </div>
        </div>
    );
}
