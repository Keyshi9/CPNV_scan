"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getBalance, getTransactionCount, getAllAddressTransactions } from '@/lib/ethereum';
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
    if (diff < 60) return `${diff} secs ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hrs ago`;
    return new Date(timestamp * 1000).toLocaleDateString();
}

const PAGE_SIZE = 25;

export default function AddressDetail() {
    const { addr } = useParams();
    const router = useRouter();
    const [balance, setBalance] = useState('0');
    const [txCount, setTxCount] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [scanning, setScanning] = useState(true);
    const [scanProgress, setScanProgress] = useState({ scanned: 0, total: 1 });
    const [currentPage, setCurrentPage] = useState(1);
    const [error, setError] = useState(null);
    const scanAbort = useRef(false);

    useEffect(() => {
        scanAbort.current = false;

        async function fetchData() {
            try {
                const [bal, count] = await Promise.all([
                    getBalance(addr),
                    getTransactionCount(addr)
                ]);
                setBalance(bal);
                setTxCount(count);

                await getAllAddressTransactions(addr, (progress) => {
                    if (scanAbort.current) return;
                    setTransactions(progress.transactions);
                    setScanProgress({ scanned: progress.scanned, total: progress.total });
                });

                setScanning(false);
            } catch (err) {
                console.error(err);
                setError("Erreur lors de la récupération des données.");
                setScanning(false);
            }
        }

        fetchData();
        return () => { scanAbort.current = true; };
    }, [addr]);

    const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
    const reversedTxs = [...transactions].reverse();
    const paginatedTxs = reversedTxs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const progressPercent = scanProgress.total > 0 ? Math.round((scanProgress.scanned / scanProgress.total) * 100) : 0;

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
                    <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-dark)' }}>Address</h1>
                    <p style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--green)', marginTop: 2 }}>{addr}</p>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card" style={{ padding: '20px 24px' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-light)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Balance
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, marginTop: 6, color: 'var(--text-dark)' }}>
                        {parseFloat(balance).toFixed(6)} <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>ETH</span>
                    </div>
                </div>

                <div className="card" style={{ padding: '20px 24px' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-light)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Transactions (Nonce)
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, marginTop: 6, color: 'var(--text-dark)' }}>
                        {txCount}
                    </div>
                </div>

                <div className="card" style={{ padding: '20px 24px' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-light)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Txs Found
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, marginTop: 6, color: 'var(--green)' }}>
                        {transactions.length}
                    </div>
                </div>
            </div>

            {/* Scan Progress */}
            {scanning && (
                <div className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)' }}>
                            <IconScan size={14} color="var(--green)" /> Scanning blockchain...
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
                            {scanning ? 'Scanning...' : 'No transactions found for this address.'}
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Txn Hash</th>
                                    <th>Block</th>
                                    <th>Age</th>
                                    <th></th>
                                    <th>Counterparty</th>
                                    <th>Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedTxs.map((tx) => {
                                    const isOut = tx.from.toLowerCase() === addr.toLowerCase();
                                    return (
                                        <tr key={tx.hash}>
                                            <td className="font-mono">
                                                <Link href={`/tx/${tx.hash}`}>{truncate(tx.hash, 10, 6)}</Link>
                                            </td>
                                            <td>
                                                <Link href={`/block/${tx.blockNumber}`}>{tx.blockNumber}</Link>
                                            </td>
                                            <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: 12 }}>
                                                {timeAgo(tx.timestamp)}
                                            </td>
                                            <td>
                                                <span className={isOut ? 'badge badge-out' : 'badge badge-in'}>
                                                    {isOut ? 'OUT' : 'IN'}
                                                </span>
                                            </td>
                                            <td className="font-mono" style={{ color: 'var(--text-muted)' }}>
                                                {isOut ? (
                                                    tx.to ? <Link href={`/address/${tx.to}`}>{truncate(tx.to)}</Link> : <span style={{ color: '#e65100' }}>Contract</span>
                                                ) : (
                                                    <Link href={`/address/${tx.from}`}>{truncate(tx.from)}</Link>
                                                )}
                                            </td>
                                            <td style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>
                                                {parseFloat(ethers.formatEther(tx.value)).toFixed(6)} Eth
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

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
