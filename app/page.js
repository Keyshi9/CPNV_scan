"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getLatestBlockNumber,
  getGasPrice,
  getRecentBlocks,
  getRecentTransactions
} from '@/lib/ethereum';
import { IconBlock, IconTx, IconGas, IconGlobe, IconLink, IconChart, IconShield, IconSearch } from '@/components/Icons';
import Heatmap from '@/components/Heatmap';
import { ethers } from 'ethers';

function timeAgo(timestamp) {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff} secs ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hrs ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

function truncate(str, start = 8, end = 4) {
  if (!str) return '';
  if (str.length <= start + end + 3) return str;
  if (end === 0) return `${str.slice(0, start)}...`;
  return `${str.slice(0, start)}...${str.slice(-end)}`;
}

export default function Dashboard() {
  const router = useRouter();
  const [latestBlock, setLatestBlock] = useState(0);
  const [gasPrice, setGasPrice] = useState('0');
  const [blocks, setBlocks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [blockNumber, gas, recentBlocks, recentTxs] = await Promise.all([
        getLatestBlockNumber(),
        getGasPrice(),
        getRecentBlocks(6),
        getRecentTransactions(6)
      ]);
      setLatestBlock(blockNumber);
      setGasPrice(gas);
      setBlocks(recentBlocks.filter(Boolean));
      setTransactions(recentTxs);
    } catch (err) {
      console.error(err);
      setError("Impossible de se connecter au nœud RPC. Vérifiez que le réseau est accessible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 12000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    if (q.length === 66 && q.startsWith('0x')) router.push(`/tx/${q}`);
    else if (q.length === 42 && q.startsWith('0x')) router.push(`/address/${q}`);
    else if (/^\d+$/.test(q)) router.push(`/block/${q}`);
    else alert("Format invalide. Entrez un numéro de bloc, hash de transaction ou adresse.");
  };

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="error-banner">
          <div style={{ marginBottom: 16, color: 'var(--red)' }}><IconSearch size={40} /></div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--red)', marginBottom: 8 }}>Nœud RPC Inaccessible</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 480, margin: '0 auto 20px' }}>{error}</p>
          <button onClick={fetchData} className="btn-primary">Réessayer</button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ========== HERO ========== */}
      <section className="hero">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="hero-title">The Ethereum CPNV Blockchain Explorer</h1>
          <form onSubmit={handleSearch} className="hero-search">
            <div className="hero-search-filter">
              All Filters <span style={{ fontSize: 10 }}>▼</span>
            </div>
            <input
              type="text"
              placeholder="Search by Address / Txn Hash / Block"
              className="hero-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="hero-search-btn">
              <IconSearch size={18} color="#fff" />
            </button>
          </form>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4">
        {/* ========== STATS OVERVIEW ========== */}
        <div className="stat-overview">
          {/* Row 1 */}
          <div className="stat-grid">
            <div className="stat-item">
              <div className="stat-icon-circle" style={{ background: '#e8f0fe', color: '#4285f4' }}>
                <IconBlock size={16} />
              </div>
              <div>
                <div className="stat-label">LAST BLOCK</div>
                <div className="stat-value">
                  {loading ? <span className="skeleton" style={{ width: 70, height: 16, display: 'inline-block' }}></span> : latestBlock.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-icon-circle" style={{ background: '#fef3e2', color: '#f59e0b' }}>
                <IconGas size={16} />
              </div>
              <div>
                <div className="stat-label">MED GAS PRICE</div>
                <div className="stat-value">
                  {loading ? <span className="skeleton" style={{ width: 70, height: 16, display: 'inline-block' }}></span> : <>{parseFloat(gasPrice).toFixed(3)} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>Gwei</span></>}
                </div>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-icon-circle" style={{ background: '#e8faf3', color: '#00a650' }}>
                <IconGlobe size={16} />
              </div>
              <div>
                <div className="stat-label">NETWORK</div>
                <div className="stat-value" style={{ color: 'var(--green)' }}>Ethereum CPNV</div>
              </div>
            </div>
            <div className="stat-item" style={{ borderRight: 'none', justifyContent: 'center' }}>
              <div className="stat-icon-circle" style={{ background: '#f3e8fe', color: '#8b5cf6' }}>
                <IconLink size={16} />
              </div>
              <div>
                <div className="stat-label">CHAIN ID</div>
                <div className="stat-value">32383</div>
              </div>
            </div>
          </div>
          {/* Row 2 */}
          <div className="stat-grid stat-row">
            <div className="stat-item">
              <div className="stat-icon-circle" style={{ background: '#f3e8fe', color: '#8b5cf6' }}>
                <IconChart size={16} />
              </div>
              <div>
                <div className="stat-label">BLOCKS MINED</div>
                <div className="stat-value">
                  {loading ? <span className="skeleton" style={{ width: 70, height: 16, display: 'inline-block' }}></span> : latestBlock.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-icon-circle" style={{ background: '#e8f0fe', color: '#4285f4' }}>
                <IconShield size={16} />
              </div>
              <div>
                <div className="stat-label">LAST FINALIZED BLOCK</div>
                <div className="stat-value">
                  {loading ? <span className="skeleton" style={{ width: 70, height: 16, display: 'inline-block' }}></span> : latestBlock.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="stat-item" style={{ gridColumn: 'span 2', borderRight: 'none' }}>
              <div className="stat-icon-circle" style={{ background: '#e8faf3', color: '#00a650' }}>
                <IconShield size={16} />
              </div>
              <div>
                <div className="stat-label">LAST SAFE BLOCK</div>
                <div className="stat-value">
                  {loading ? <span className="skeleton" style={{ width: 70, height: 16, display: 'inline-block' }}></span> : latestBlock.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========== TICKER BAR ========== */}
        <div className="ticker-bar" style={{ marginTop: 20 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconGas size={12} color="var(--text-muted)" /> Gas: <strong>{parseFloat(gasPrice).toFixed(3)} Gwei</strong>
          </span>
          <span style={{ color: '#ddd' }}>|</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconBlock size={12} color="var(--text-muted)" /> Last Block: <strong>#{latestBlock.toLocaleString()}</strong>
          </span>
        </div>

        {/* ========== TRANSACTION HEATMAP ========== */}
        <Heatmap />

        {/* ========== LATEST BLOCKS + LATEST TXS ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ---- Latest Blocks ---- */}
          <div className="card">
            <div className="card-header">Latest Blocks</div>
            <div>
              {loading ? (
                Array(6).fill(0).map((_, i) => (
                  <div key={i} className="item-row">
                    <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0 }}></div>
                    <div style={{ flex: 1 }}>
                      <div className="skeleton" style={{ width: '55%', height: 14, marginBottom: 6 }}></div>
                      <div className="skeleton" style={{ width: '80%', height: 12 }}></div>
                    </div>
                    <div className="skeleton" style={{ width: 70, height: 28, borderRadius: 6 }}></div>
                  </div>
                ))
              ) : blocks.map(block => (
                <div key={block.number} className="item-row">
                  <div className="item-icon icon-block">Bk</div>
                  <div className="item-info">
                    <div className="item-primary">
                      <Link href={`/block/${block.number}`}>{block.number}</Link>
                      <span style={{ fontWeight: 400, color: 'var(--text-light)', fontSize: 12, marginLeft: 8 }}>
                        {timeAgo(block.timestamp)}
                      </span>
                    </div>
                    <div className="item-secondary">
                      Miner: <Link href={`/address/${block.miner}`}>{truncate(block.miner, 8, 4)}</Link>
                      <br />
                      <Link href={`/block/${block.number}`} style={{ color: 'var(--green)' }}>
                        {block.transactions.length} txns
                      </Link>
                      <span style={{ color: 'var(--text-light)' }}> in 12 secs</span>
                    </div>
                  </div>
                  <div className="item-badge">0 Eth</div>
                </div>
              ))}
            </div>
            <div className="card-footer">
              <Link href="/blocks">VIEW ALL BLOCKS →</Link>
            </div>
          </div>

          {/* ---- Latest Transactions ---- */}
          <div className="card">
            <div className="card-header">Latest Transactions</div>
            <div>
              {loading ? (
                Array(6).fill(0).map((_, i) => (
                  <div key={i} className="item-row">
                    <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0 }}></div>
                    <div style={{ flex: 1 }}>
                      <div className="skeleton" style={{ width: '60%', height: 14, marginBottom: 6 }}></div>
                      <div className="skeleton" style={{ width: '90%', height: 12 }}></div>
                    </div>
                    <div className="skeleton" style={{ width: 70, height: 28, borderRadius: 6 }}></div>
                  </div>
                ))
              ) : transactions.map(tx => (
                <div key={tx.hash} className="item-row">
                  <div className="item-icon icon-tx">Tx</div>
                  <div className="item-info">
                    <div className="item-primary">
                      <Link href={`/tx/${tx.hash}`} style={{ fontFamily: 'monospace', fontSize: 13 }}>
                        {truncate(tx.hash, 10, 6)}
                      </Link>
                      <span style={{ fontWeight: 400, color: 'var(--text-light)', fontSize: 12, marginLeft: 8 }}>
                        {tx.timestamp ? timeAgo(tx.timestamp) : ''}
                      </span>
                    </div>
                    <div className="item-secondary">
                      From <Link href={`/address/${tx.from}`}>{truncate(tx.from, 10, 4)}</Link>
                      <br />
                      To <Link href={tx.to ? `/address/${tx.to}` : '#'}>{tx.to ? truncate(tx.to, 10, 4) : 'Contract Creation'}</Link>
                    </div>
                  </div>
                  <div className="item-badge">
                    {parseFloat(ethers.formatEther(tx.value)).toFixed(5)} Eth
                  </div>
                </div>
              ))}
            </div>
            <div className="card-footer">
              <Link href="/transactions">VIEW ALL TRANSACTIONS →</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
