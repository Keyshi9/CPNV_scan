"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import * as d3 from 'd3';
import { IconArrowLeft } from '@/components/Icons';

export default function NetworkPage() {
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const tooltipRef = useRef(null);
    const [graphData, setGraphData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch('/api/cache?type=network');
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                setGraphData({ nodes: data.nodes, edges: data.edges });
                setLoading(false);
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    // Render D3 force graph when data is ready
    useEffect(() => {
        if (!graphData || !svgRef.current || !containerRef.current) return;

        const container = containerRef.current;
        const width = container.clientWidth;
        const height = 600;
        const tooltip = tooltipRef.current;

        d3.select(svgRef.current).selectAll('*').remove();

        const svg = d3.select(svgRef.current)
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', [0, 0, width, height]);

        const g = svg.append('g');
        svg.call(d3.zoom().scaleExtent([0.2, 5]).on('zoom', (event) => {
            g.attr('transform', event.transform);
        }));

        const maxBalance = Math.max(...graphData.nodes.map(n => n.balance), 1);
        const radiusScale = d3.scaleSqrt().domain([0, maxBalance]).range([6, 45]);
        const maxWeight = Math.max(...graphData.edges.map(e => e.weight), 1);
        const widthScale = d3.scaleLinear().domain([1, maxWeight]).range([0.8, 4]);

        const nodes = graphData.nodes.map(n => ({ ...n }));
        const edges = graphData.edges.map(e => ({ ...e }));

        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(edges).id(d => d.id).distance(120).strength(0.3))
            .force('charge', d3.forceManyBody().strength(-250))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(d => radiusScale(d.balance) + 6))
            .alphaDecay(0.03);

        const defs = svg.append('defs');
        const filter = defs.append('filter').attr('id', 'glow');
        filter.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'coloredBlur');
        const feMerge = filter.append('feMerge');
        feMerge.append('feMergeNode').attr('in', 'coloredBlur');
        feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

        const link = g.append('g')
            .selectAll('line')
            .data(edges)
            .join('line')
            .attr('stroke', '#c8c8c8')
            .attr('stroke-opacity', 0.4)
            .attr('stroke-width', d => widthScale(d.weight));

        const node = g.append('g')
            .selectAll('g')
            .data(nodes)
            .join('g')
            .style('cursor', 'pointer')
            .call(d3.drag()
                .on('start', (event, d) => {
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x; d.fy = d.y;
                })
                .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
                .on('end', (event, d) => {
                    if (!event.active) simulation.alphaTarget(0);
                    d.fx = null; d.fy = null;
                }));

        node.append('circle')
            .attr('r', d => radiusScale(d.balance))
            .attr('fill', d => d3.interpolateRgb('#69d49e', '#00673a')(Math.min(d.balance / maxBalance, 1)))
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .attr('filter', 'url(#glow)')
            .on('mouseover', function (event, d) {
                d3.select(this).attr('stroke', '#00a650').attr('stroke-width', 3);
                link.attr('stroke', l => (l.source.id === d.id || l.target.id === d.id) ? '#00a650' : '#c8c8c8')
                    .attr('stroke-opacity', l => (l.source.id === d.id || l.target.id === d.id) ? 0.8 : 0.15);
                if (tooltip) {
                    tooltip.style.display = 'block';
                    tooltip.innerHTML = `
            <div style="font-family:monospace;font-size:12px;color:#00a650;font-weight:600;margin-bottom:4px">${d.id}</div>
            <div style="font-size:12px;color:#333">Balance: <strong>${d.balance.toFixed(4)} ETH</strong></div>
          `;
                }
            })
            .on('mousemove', function (event) {
                if (tooltip) {
                    tooltip.style.left = (event.clientX + 12) + 'px';
                    tooltip.style.top = (event.clientY - 10) + 'px';
                }
            })
            .on('mouseout', function () {
                d3.select(this).attr('stroke', '#fff').attr('stroke-width', 2);
                link.attr('stroke', '#c8c8c8').attr('stroke-opacity', 0.4);
                if (tooltip) tooltip.style.display = 'none';
            })
            .on('click', (event, d) => { window.open(`/address/${d.id}`, '_blank'); });

        node.append('text')
            .text(d => d.label)
            .attr('text-anchor', 'middle')
            .attr('dy', d => radiusScale(d.balance) + 14)
            .attr('font-size', 9).attr('fill', '#6c757d').attr('font-family', 'monospace')
            .attr('pointer-events', 'none')
            .style('display', d => radiusScale(d.balance) > 12 ? 'block' : 'none');

        node.append('text')
            .text(d => {
                if (radiusScale(d.balance) < 18) return '';
                if (d.balance >= 1000) return `${(d.balance / 1000).toFixed(1)}K`;
                if (d.balance >= 1) return d.balance.toFixed(1);
                return '';
            })
            .attr('text-anchor', 'middle').attr('dy', 4)
            .attr('font-size', d => Math.min(radiusScale(d.balance) * 0.55, 12))
            .attr('fill', '#fff').attr('font-weight', 700).attr('pointer-events', 'none');

        simulation.on('tick', () => {
            link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });

        return () => { simulation.stop(); };
    }, [graphData]);

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
            <div className="flex items-center gap-3">
                <Link href="/" className="btn"><IconArrowLeft size={14} /></Link>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-dark)' }}>Network Graph</h1>
            </div>

            {loading && (
                <div className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="skeleton" style={{ width: 20, height: 20, borderRadius: '50%' }}></div>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading network data...</span>
                    </div>
                </div>
            )}

            {error && (
                <div className="error-banner">
                    <p style={{ color: 'var(--red)', fontWeight: 600 }}>Error: {error}</p>
                </div>
            )}

            {graphData && (
                <div className="card" style={{ padding: '12px 20px', display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        <strong style={{ color: 'var(--text-dark)' }}>{graphData.nodes.length}</strong> addresses
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        <strong style={{ color: 'var(--text-dark)' }}>{graphData.edges.length}</strong> interactions
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-light)' }}>
                        Node size = ETH balance · Lines = transactions · Drag nodes · Scroll to zoom · Click to view
                    </span>
                </div>
            )}

            <div className="card" ref={containerRef} style={{ overflow: 'hidden', background: '#fafbfc', position: 'relative' }}>
                {!graphData && !loading && (
                    <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>No data available.</div>
                )}
                <svg ref={svgRef} style={{ display: 'block', width: '100%', minHeight: 600 }} />
            </div>

            <div ref={tooltipRef} style={{
                display: 'none', position: 'fixed', pointerEvents: 'none', zIndex: 9999,
                background: '#fff', border: '1px solid var(--border-color)', borderRadius: 8,
                padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxWidth: 360,
            }} />
        </div>
    );
}
