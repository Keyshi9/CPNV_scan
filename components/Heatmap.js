"use client";

import { useState, useEffect, useRef } from 'react';
import { getTransactionHeatmapData } from '@/lib/ethereum';
import { IconScan } from '@/components/Icons';

/* GitHub-style transaction heatmap — shows daily tx count as colored cells */

function getColor(count, maxCount) {
    if (count === 0) return '#ebedf0';
    const intensity = Math.min(count / Math.max(maxCount, 1), 1);
    if (intensity < 0.25) return '#b8e6cc';
    if (intensity < 0.5) return '#69d49e';
    if (intensity < 0.75) return '#2db873';
    return '#00a650';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

export default function Heatmap() {
    const [heatmapData, setHeatmapData] = useState({});
    const [scanning, setScanning] = useState(true);
    const [progress, setProgress] = useState({ scanned: 0, total: 1 });
    const [tooltip, setTooltip] = useState(null);
    const containerRef = useRef(null);

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

    // Build calendar grid
    const dates = Object.keys(heatmapData).sort();
    if (dates.length === 0 && !scanning) {
        return (
            <div className="card" style={{ padding: 24 }}>
                <div className="card-header">Transaction Heatmap</div>
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No transaction data found.</p>
            </div>
        );
    }

    // Find date range
    const firstDate = dates.length > 0 ? new Date(dates[0]) : new Date();
    const lastDate = dates.length > 0 ? new Date(dates[dates.length - 1]) : new Date();
    const maxCount = Math.max(...Object.values(heatmapData), 1);
    const totalTxs = Object.values(heatmapData).reduce((sum, v) => sum + v, 0);

    // Build weeks array (columns of 7 days)
    const weeks = [];
    const current = new Date(firstDate);
    // Align to Sunday start
    current.setDate(current.getDate() - current.getDay());

    while (current <= lastDate || weeks.length === 0) {
        const week = [];
        for (let d = 0; d < 7; d++) {
            const dateStr = current.toISOString().split('T')[0];
            const count = heatmapData[dateStr] || 0;
            const inRange = current >= firstDate && current <= lastDate;
            week.push({
                date: dateStr,
                count,
                inRange,
                dayOfWeek: d
            });
            current.setDate(current.getDate() + 1);
        }
        weeks.push(week);
    }

    const progressPercent = progress.total > 0 ? Math.round((progress.scanned / progress.total) * 100) : 0;
    const cellSize = 13;
    const cellGap = 3;

    return (
        <div className="card">
            <div className="card-header">
                <span>Transaction Heatmap</span>
                <span style={{ fontSize: 11, color: 'var(--text-light)', fontWeight: 400 }}>
                    {totalTxs.toLocaleString()} total transactions
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

            <div style={{ padding: '8px 20px 20px', overflowX: 'auto' }} ref={containerRef}>
                {/* Month labels */}
                <div style={{ display: 'flex', marginLeft: 32, marginBottom: 4, gap: 0 }}>
                    {weeks.map((week, wi) => {
                        const firstDayOfWeek = new Date(week[0].date);
                        const showLabel = firstDayOfWeek.getDate() <= 7;
                        return (
                            <div key={wi} style={{ width: cellSize + cellGap, fontSize: 10, color: 'var(--text-light)', textAlign: 'left' }}>
                                {showLabel ? MONTHS[firstDayOfWeek.getMonth()] : ''}
                            </div>
                        );
                    })}
                </div>

                <div style={{ display: 'flex', gap: 0 }}>
                    {/* Day labels */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: cellGap, marginRight: 6, paddingTop: 0 }}>
                        {DAYS.map((day, i) => (
                            <div key={i} style={{ height: cellSize, fontSize: 9, color: 'var(--text-light)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: 24 }}>
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Heatmap grid */}
                    <div style={{ display: 'flex', gap: cellGap }}>
                        {weeks.map((week, wi) => (
                            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: cellGap }}>
                                {week.map((cell, di) => (
                                    <div
                                        key={di}
                                        style={{
                                            width: cellSize,
                                            height: cellSize,
                                            borderRadius: 2,
                                            background: cell.inRange ? getColor(cell.count, maxCount) : 'transparent',
                                            cursor: cell.inRange ? 'pointer' : 'default',
                                            position: 'relative',
                                        }}
                                        onMouseEnter={() => cell.inRange && setTooltip({ date: cell.date, count: cell.count })}
                                        onMouseLeave={() => setTooltip(null)}
                                        title={cell.inRange ? `${cell.date}: ${cell.count} tx` : ''}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 12, marginLeft: 32 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-light)', marginRight: 4 }}>Less</span>
                    {[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
                        <div key={i} style={{
                            width: cellSize, height: cellSize, borderRadius: 2,
                            background: i === 0 ? '#ebedf0' : i === 1 ? '#b8e6cc' : i === 2 ? '#69d49e' : i === 3 ? '#2db873' : '#00a650'
                        }} />
                    ))}
                    <span style={{ fontSize: 10, color: 'var(--text-light)', marginLeft: 4 }}>More</span>
                </div>
            </div>
        </div>
    );
}
