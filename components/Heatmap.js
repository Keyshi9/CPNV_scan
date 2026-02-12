"use client";

import { useState, useEffect, useRef } from 'react';
import { getTransactionHeatmapData } from '@/lib/ethereum';
import { IconScan } from '@/components/Icons';

/* Day × Hour transaction heatmap — rows are days, columns are hours (0-23)
   Each cell is colored by transaction count. Perfect for young blockchains. */

function getColor(count, maxCount) {
    if (count === 0) return '#ebedf0';
    const intensity = Math.min(count / Math.max(maxCount, 1), 1);
    if (intensity < 0.2) return '#d4edda';
    if (intensity < 0.4) return '#b8e6cc';
    if (intensity < 0.6) return '#69d49e';
    if (intensity < 0.8) return '#2db873';
    return '#00a650';
}

const DAYS_OF_WEEK = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export default function Heatmap() {
    const [heatmapData, setHeatmapData] = useState({});
    const [scanning, setScanning] = useState(true);
    const [progress, setProgress] = useState({ scanned: 0, total: 1 });
    const [tooltip, setTooltip] = useState(null);

    useEffect(() => {
        let aborted = false;
        async function scan() {
            try {
                const data = await getTransactionHeatmapData((p) => {
                    if (aborted) return;
                    setHeatmapData(p.data);
                    setProgress({ scanned: p.scanned, total: p.total });
                });
                if (!aborted) {
                    setHeatmapData(data);
                    setScanning(false);
                }
            } catch (err) {
                console.error(err);
                if (!aborted) setScanning(false);
            }
        }
        scan();
        return () => { aborted = true; };
    }, []);

    // Parse data into { date -> { hour -> count } }
    const dayHourMap = {};
    let maxCount = 0;
    let totalTxs = 0;

    Object.entries(heatmapData).forEach(([key, count]) => {
        // key = "YYYY-MM-DD-HH"
        const date = key.slice(0, 10);
        const hour = parseInt(key.slice(11), 10);
        if (!dayHourMap[date]) dayHourMap[date] = {};
        dayHourMap[date][hour] = count;
        if (count > maxCount) maxCount = count;
        totalTxs += count;
    });

    const dates = Object.keys(dayHourMap).sort();
    const progressPercent = progress.total > 0 ? Math.round((progress.scanned / progress.total) * 100) : 0;

    const cellSize = 22;
    const cellGap = 2;

    return (
        <div className="card">
            <div className="card-header">
                <span>Transaction Activity</span>
                <span style={{ fontSize: 11, color: 'var(--text-light)', fontWeight: 400 }}>
                    {totalTxs.toLocaleString()} transactions · {dates.length} days
                </span>
            </div>

            {scanning && (
                <div style={{ padding: '12px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <IconScan size={12} color="var(--green)" /> Scanning blocks...
                        </span>
                        <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--green)' }}>{progressPercent}%</span>
                    </div>
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                </div>
            )}

            {dates.length === 0 && !scanning ? (
                <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    No transaction data found.
                </div>
            ) : (
                <div style={{ padding: '12px 20px 20px', overflowX: 'auto' }}>
                    {/* Hour headers */}
                    <div style={{ display: 'flex', marginLeft: 80, gap: cellGap, marginBottom: 4 }}>
                        {Array.from({ length: 24 }, (_, h) => (
                            <div key={h} style={{
                                width: cellSize, textAlign: 'center',
                                fontSize: 9, color: 'var(--text-light)', fontFamily: 'monospace'
                            }}>
                                {h % 3 === 0 ? `${String(h).padStart(2, '0')}h` : ''}
                            </div>
                        ))}
                    </div>

                    {/* Rows = days */}
                    {dates.map(date => {
                        const d = new Date(date + 'T00:00:00Z');
                        const dayLabel = DAYS_OF_WEEK[d.getUTCDay()];
                        const dateLabel = `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
                        const hours = dayHourMap[date] || {};

                        return (
                            <div key={date} style={{ display: 'flex', alignItems: 'center', gap: cellGap, marginBottom: cellGap }}>
                                {/* Day label */}
                                <div style={{
                                    width: 76, fontSize: 11, color: 'var(--text-muted)',
                                    fontWeight: 500, display: 'flex', gap: 6, flexShrink: 0
                                }}>
                                    <span style={{ color: 'var(--text-light)', width: 26 }}>{dayLabel}</span>
                                    <span>{dateLabel}</span>
                                </div>

                                {/* Hour cells */}
                                {Array.from({ length: 24 }, (_, h) => {
                                    const count = hours[h] || 0;
                                    return (
                                        <div
                                            key={h}
                                            style={{
                                                width: cellSize, height: cellSize,
                                                borderRadius: 3,
                                                background: getColor(count, maxCount),
                                                cursor: 'pointer',
                                                transition: 'transform 0.1s',
                                                position: 'relative',
                                            }}
                                            title={`${date} ${String(h).padStart(2, '0')}:00 — ${count} tx`}
                                            onMouseEnter={(e) => {
                                                e.target.style.transform = 'scale(1.2)';
                                                setTooltip({ date, hour: h, count, x: e.clientX, y: e.clientY });
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.transform = 'scale(1)';
                                                setTooltip(null);
                                            }}
                                        />
                                    );
                                })}

                                {/* Day total */}
                                <div style={{
                                    fontSize: 11, color: 'var(--text-light)', fontFamily: 'monospace',
                                    marginLeft: 8, minWidth: 36
                                }}>
                                    {Object.values(hours).reduce((a, b) => a + b, 0)} tx
                                </div>
                            </div>
                        );
                    })}

                    {/* Legend */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 14, marginLeft: 80 }}>
                        <span style={{ fontSize: 10, color: 'var(--text-light)', marginRight: 4 }}>Less</span>
                        {['#ebedf0', '#d4edda', '#b8e6cc', '#69d49e', '#2db873', '#00a650'].map((c, i) => (
                            <div key={i} style={{ width: 14, height: 14, borderRadius: 2, background: c }} />
                        ))}
                        <span style={{ fontSize: 10, color: 'var(--text-light)', marginLeft: 4 }}>More</span>
                    </div>
                </div>
            )}
        </div>
    );
}
