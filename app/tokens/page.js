"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { scanAllTokens } from '@/lib/ethereum';
import { IconArrowLeft, IconScan } from '@/components/Icons';

function truncate(str, start = 10, end = 6) {
    if (!str) return '';
    if (str.length <= start + end + 3) return str;
    return `${str.slice(0, start)}...${str.slice(-end)}`;
}

function formatSupply(val) {
    if (val >= 1e12) return (val / 1e12).toFixed(2) + 'T';
    if (val >= 1e9) return (val / 1e9).toFixed(2) + 'B';
    if (val >= 1e6) return (val / 1e6).toFixed(2) + 'M';
    if (val >= 1e3) return (val / 1e3).toFixed(2) + 'K';
    return val.toFixed(2);
}

export default function TokensPage() {
    const [tokens, setTokens] = useState([]);
    const [scanning, setScanning] = useState(true);
    const [progress, setProgress] = useState({ phase: 'scanning', scanned: 0, total: 1, contractsFound: 0 });
    const scanAbort = useRef(false);

    useEffect(() => {
        scanAbort.current = false;

        async function scan() {
            try {
                const result = await scanAllTokens((p) => {
                    if (scanAbort.current) return;
                    setProgress(p);
                    if (p.tokens && p.tokens.length > 0) {
                        setTokens([...p.tokens].sort((a, b) => b.totalSupplyFormatted - a.totalSupplyFormatted));
                    }
                });
                setTokens(result);
                setScanning(false);
            } catch (err) {
                console.error(err);
                setScanning(false);
            }
        }

        scan();
        return () => { scanAbort.current = true; };
    }, []);

    const progressPercent = progress.total > 0 ? Math.round((progress.scanned / progress.total) * 100) : 0;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
            <div className="flex items-center gap-3">
                <Link href="/" className="btn"><IconArrowLeft size={14} /></Link>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-dark)' }}>Token Tracker</h1>
            </div>

            {/* Scan Progress */}
            {scanning && (
                <div className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <IconScan size={14} color="var(--green)" />
                            {progress.phase === 'scanning'
                                ? 'Phase 1: Scanning blocks for contracts...'
                                : `Phase 2: Checking ${progress.total} contracts for ERC-20...`
                            }
                        </span>
                        <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--green)' }}>
                            {progress.scanned.toLocaleString()} / {progress.total.toLocaleString()} ({progressPercent}%)
                        </span>
                    </div>
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 8 }}>
                        {progress.contractsFound} contract(s) found · {tokens.length} ERC-20 token(s) detected
                    </p>
                </div>
            )}

            {/* Tokens Table */}
            <div className="card">
                <div className="card-header">
                    <span>ERC-20 Tokens ({tokens.length}{scanning ? '+' : ''})</span>
                    {!scanning && (
                        <span style={{ fontSize: 11, color: 'var(--text-light)' }}>
                            Sorted by Total Supply (largest first)
                        </span>
                    )}
                </div>
                <div style={{ overflowX: 'auto' }}>
                    {tokens.length === 0 ? (
                        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                            {scanning ? 'Scanning blockchain for tokens...' : 'No ERC-20 tokens found on this blockchain.'}
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Token</th>
                                    <th>Symbol</th>
                                    <th>Decimals</th>
                                    <th>Total Supply</th>
                                    <th>Contract</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tokens.map((token, i) => (
                                    <tr key={token.address}>
                                        <td style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{i + 1}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{
                                                    width: 32, height: 32, borderRadius: '50%',
                                                    background: `hsl(${(i * 47) % 360}, 55%, 50%)`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0
                                                }}>
                                                    {token.symbol.slice(0, 2)}
                                                </div>
                                                <span style={{ fontWeight: 600 }}>{token.name}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{
                                                background: 'var(--green-bg)', color: 'var(--green)',
                                                padding: '3px 10px', borderRadius: 6,
                                                fontSize: 12, fontWeight: 600
                                            }}>
                                                {token.symbol}
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--text-muted)' }}>{token.decimals}</td>
                                        <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                                            {formatSupply(token.totalSupplyFormatted)}
                                            <span style={{ color: 'var(--text-light)', fontWeight: 400, marginLeft: 4, fontSize: 11 }}>
                                                {token.symbol}
                                            </span>
                                        </td>
                                        <td className="font-mono">
                                            <Link href={`/address/${token.address}`}>{truncate(token.address, 10, 6)}</Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
