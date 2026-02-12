"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ethers } from 'ethers';
import { IconArrowLeft } from '@/components/Icons';

function truncate(str, start = 8, end = 4) {
  if (!str) return '';
  if (str.length <= start + end + 3) return str;
  if (end === 0) return `${str.slice(0, start)}...`;
  return `${str.slice(0, start)}...${str.slice(-end)}`;
}

function timeAgo(timestamp) {
  const diff = Math.floor(Date.now() / 1000) - timestamp;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hrs ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

const PER_PAGE = 25;

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [lastSynced, setLastSynced] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/cache?type=transactions');
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        // Sort newest first
        const sorted = [...data.transactions].sort((a, b) => b.blockNumber - a.blockNumber || b.timestamp - a.timestamp);
        setTransactions(sorted);
        setLastSynced(data.lastSynced);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const totalPages = Math.ceil(transactions.length / PER_PAGE);
  const paginated = transactions.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="btn"><IconArrowLeft size={14} /></Link>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-dark)' }}>All Transactions</h1>
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
          <span>Transactions ({transactions.length})</span>
          {lastSynced && (
            <span style={{ fontSize: 11, color: 'var(--text-light)' }}>
              Synced: {new Date(lastSynced).toLocaleTimeString()}
            </span>
          )}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Tx Hash</th>
                <th>Block</th>
                <th>Age</th>
                <th>From</th>
                <th>To</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(tx => (
                <tr key={tx.hash}>
                  <td className="font-mono">
                    <Link href={`/tx/${tx.hash}`}>{truncate(tx.hash, 10, 6)}</Link>
                  </td>
                  <td>
                    <Link href={`/block/${tx.blockNumber}`}>{tx.blockNumber}</Link>
                  </td>
                  <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {tx.timestamp ? timeAgo(tx.timestamp) : '—'}
                  </td>
                  <td className="font-mono">
                    <Link href={`/address/${tx.from}`}>{truncate(tx.from, 8, 4)}</Link>
                  </td>
                  <td className="font-mono">
                    {tx.to ? (
                      <Link href={`/address/${tx.to}`}>{truncate(tx.to, 8, 4)}</Link>
                    ) : (
                      <span className="badge badge-success">Contract Creation</span>
                    )}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {parseFloat(ethers.formatEther(tx.value)).toFixed(5)} ETH
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (page <= 4) {
                pageNum = i + 1;
              } else if (page >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = page - 3 + i;
              }
              return (
                <button key={pageNum} className={`page-btn ${page === pageNum ? 'active' : ''}`} onClick={() => setPage(pageNum)}>
                  {pageNum}
                </button>
              );
            })}
            <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        )}
      </div>
    </div>
  );
}
