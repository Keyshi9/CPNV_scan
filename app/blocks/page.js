"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getRecentBlocks } from '@/lib/ethereum';
import { IconBlock, IconArrowLeft } from '@/components/Icons';

function timeAgo(timestamp) {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    if (diff < 5) return "just now";
    if (diff < 60) return `${diff} secs ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
    return `${Math.floor(diff / 3600)} hrs ago`;
}

function truncate(str, start = 8, end = 4) {
    if (!str) return '';
    if (str.length <= start + end + 3) return str;
    return `${str.slice(0, start)}...${str.slice(-end)}`;
}

export default function BlocksPage() {
    const [blocks, setBlocks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchBlocks() {
            try {
                const data = await getRecentBlocks(25);
                setBlocks(data.filter(Boolean));
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchBlocks();
    }, []);

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
            <div className="flex items-center gap-3">
                <Link href="/" className="btn"><IconArrowLeft size={14} /></Link>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-dark)' }}>Blocks</h1>
            </div>

            <div className="card">
                <div className="card-header">Latest 25 Blocks</div>
                <div style={{ overflowX: 'auto' }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Block</th>
                                <th>Age</th>
                                <th>Txn</th>
                                <th>Fee Recipient</th>
                                <th>Gas Used</th>
                                <th>Gas Limit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array(10).fill(0).map((_, i) => (
                                    <tr key={i}>
                                        <td><div className="skeleton" style={{ width: 60, height: 14 }}></div></td>
                                        <td><div className="skeleton" style={{ width: 80, height: 14 }}></div></td>
                                        <td><div className="skeleton" style={{ width: 30, height: 14 }}></div></td>
                                        <td><div className="skeleton" style={{ width: 120, height: 14 }}></div></td>
                                        <td><div className="skeleton" style={{ width: 80, height: 14 }}></div></td>
                                        <td><div className="skeleton" style={{ width: 80, height: 14 }}></div></td>
                                    </tr>
                                ))
                            ) : blocks.map(block => (
                                <tr key={block.number}>
                                    <td><Link href={`/block/${block.number}`} style={{ fontWeight: 600 }}>{block.number}</Link></td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{timeAgo(block.timestamp)}</td>
                                    <td><Link href={`/block/${block.number}`}>{block.transactions.length}</Link></td>
                                    <td className="font-mono" style={{ color: 'var(--text-muted)' }}>
                                        <Link href={`/address/${block.miner}`}>{truncate(block.miner, 10, 6)}</Link>
                                    </td>
                                    <td style={{ color: 'var(--text-muted)' }}>{block.gasUsed.toString()}</td>
                                    <td style={{ color: 'var(--text-muted)' }}>{block.gasLimit.toString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
