"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { IconArrowLeft } from '@/components/Icons';

function truncate(str, start = 10, end = 6) {
    if (!str) return '';
    if (str.length <= start + end + 3) return str;
    if (end === 0) return `${str.slice(0, start)}...`;
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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastSynced, setLastSynced] = useState(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch('/api/cache?type=tokens');
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                setTokens(data.tokens);
                setLastSynced(data.lastSynced);
                setLoading(false);
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
            <div className="flex items-center gap-3">
                <Link href="/" className="btn"><IconArrowLeft size={14} /></Link>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-dark)' }}>Token Tracker</h1>
            </div>

            {loading && (
                <div className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="skeleton" style={{ width: 20, height: 20, borderRadius: '50%' }}></div>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading cached data...</span>
                    </div>
                </div>
            )}

            {error && (
                <div className="error-banner">
                    <p style={{ color: 'var(--red)', fontWeight: 600 }}>Error: {error}</p>
                </div>
            )}

            <div className="card">
                <div className="card-header">
                    <span>ERC-20 Tokens ({tokens.length})</span>
                    {lastSynced && (
                        <span style={{ fontSize: 11, color: 'var(--text-light)' }}>
                            Synced: {new Date(lastSynced).toLocaleTimeString()}
                        </span>
                    )}
                </div>
                <div style={{ overflowX: 'auto' }}>
                    {tokens.length === 0 && !loading ? (
                        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                            No ERC-20 tokens found on this blockchain.
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
                                                padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600
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
