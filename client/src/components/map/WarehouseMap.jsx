import React, { useState } from 'react';
import { useSystem } from '../../context/SystemContext.jsx';
import {
  MapPin,
  Layers,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Info,
  Navigation,
  CornerDownRight,
  Sparkles
} from 'lucide-react';

export default function WarehouseMap({ activeRoute, onSelectBin, highlightBinCode }) {
  const { locationsData, inspectBin } = useSystem();
  const [filterMode, setFilterMode] = useState('status'); // 'status' | 'congestion' | 'occupancy'

  const bins = locationsData?.bins || [];
  const rows = locationsData?.rows || [];

  // Map route points to visual coordinates
  const routePoints = activeRoute?.polylinePoints || [];
  const routeSvgPoints = routePoints.map(p => `${p.x},${p.y}`).join(' ');

  // Group bins by row
  const binsByRow = {};
  rows.forEach(r => {
    binsByRow[r.row_code] = bins.filter(b => b.row_code === r.row_code && !b.is_virtual);
  });

  const virtualBins = bins.filter(b => b.is_virtual);

  return (
    <div className="relative w-full rounded-xl bg-[#0a0d14] border border-[#1b2333] p-4 overflow-hidden shadow-2xl">
      {/* Map Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-[#182130] pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <MapPin size={18} />
          </div>
          <div>
            <div className="font-bold text-white text-sm flex items-center gap-2 font-mono">
              WH1 — CENTRAL FULFILLMENT DIGITAL MAP
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                2D REALTIME
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Strict PS-3 Location Hierarchy: Warehouse (WH1) → 4 Rows (R01-R04) → 24 Bins
            </div>
          </div>
        </div>

        {/* Legend / Overlay mode switcher */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center bg-[#101520] p-1 rounded-lg border border-[#1d2638] text-[11px]">
            <button
              onClick={() => setFilterMode('status')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                filterMode === 'status'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Inventory Status
            </button>
            <button
              onClick={() => setFilterMode('congestion')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                filterMode === 'congestion'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Traffic & Congestion
            </button>
          </div>
        </div>
      </div>

      {/* Map Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#0e121b] border border-[#192231] text-[11px] font-mono text-slate-300 mb-4">
        <div className="flex items-center gap-4">
          <span className="text-slate-400 uppercase text-[10px]">Bin Legend:</span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500 shadow-[0_0_6px_#10b981]"></span>
            <span>Healthy Stock</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-500 shadow-[0_0_6px_#f59e0b]"></span>
            <span>Low Stock</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-rose-500 shadow-[0_0_8px_#ef4444]"></span>
            <span>Discrepancy / Hotspot</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-slate-700"></span>
            <span>Empty</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-cyan-400 shadow-[0_0_8px_#00f0ff]"></span>
            <span>Active Pick Stop</span>
          </span>
        </div>

        {activeRoute && (
          <div className="flex items-center gap-2 text-cyan-300">
            <Sparkles size={13} className="text-cyan-400" />
            <span>Active Route: {activeRoute.totalStops} Stops | Est. {activeRoute.totalDistanceMeters}m ({activeRoute.estimatedPickTimeMinutes} min)</span>
          </div>
        )}
      </div>

      {/* 2D Interactive Warehouse Grid Canvas */}
      <div className="relative w-full overflow-x-auto bg-[#070a10] rounded-xl border border-[#161e2b] p-6">
        <div className="min-w-[760px] relative" style={{ height: '560px' }}>
          {/* SVG Overlay for Navigation Pathways & Optimized Traversal Route */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            {/* Background grid markings */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#101726" strokeWidth="0.75" />
              </pattern>
              <linearGradient id="cyanGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00f0ff" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Warehouse Perimeter Wall */}
            <rect
              x="20"
              y="20"
              width="720"
              height="520"
              fill="none"
              stroke="#1b2537"
              strokeWidth="2"
              strokeDasharray="4,4"
              rx="8"
            />

            {/* Pathway Aisle Guides */}
            <line x1="60" y1="160" x2="640" y2="160" stroke="#131b28" strokeWidth="24" strokeLinecap="round" />
            <line x1="60" y1="260" x2="640" y2="260" stroke="#131b28" strokeWidth="24" strokeLinecap="round" />
            <line x1="60" y1="360" x2="640" y2="360" stroke="#131b28" strokeWidth="24" strokeLinecap="round" />
            <line x1="60" y1="460" x2="640" y2="460" stroke="#131b28" strokeWidth="24" strokeLinecap="round" />

            {/* Animated Pick Route Polyline */}
            {activeRoute && routeSvgPoints && (
              <>
                {/* Route base shadow */}
                <polyline
                  points={routeSvgPoints}
                  fill="none"
                  stroke="#00f0ff"
                  strokeWidth="4"
                  strokeOpacity="0.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Animated dashing line */}
                <polyline
                  points={routeSvgPoints}
                  fill="none"
                  stroke="#00f0ff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="animated-route-line"
                />
              </>
            )}
          </svg>

          {/* DOCK-IN / Start Dock Station */}
          <div
            className="absolute z-20 flex flex-col items-center justify-center rounded-lg bg-[#0e1726] border border-cyan-500/40 px-3 py-2 shadow-lg"
            style={{ left: '25px', top: '35px' }}
          >
            <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-[10px] font-bold">
              <CornerDownRight size={13} />
              <span>START DOCK</span>
            </div>
            <div className="text-[9px] text-slate-400 font-mono">DOCK-IN (0,0)</div>
          </div>

          {/* FULFILLMENT / Packing Station */}
          <div
            className="absolute z-20 flex flex-col items-center justify-center rounded-lg bg-[#141b2b] border border-emerald-500/40 px-3 py-2 shadow-lg"
            style={{ right: '25px', bottom: '35px' }}
          >
            <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[10px] font-bold">
              <CheckCircle2 size={13} />
              <span>PACKING STATION</span>
            </div>
            <div className="text-[9px] text-slate-400 font-mono">PACK-01</div>
          </div>

          {/* Virtual Staging Bays: RETURNS-CART & QA-DAMAGED */}
          <div className="absolute right-6 top-16 z-20 space-y-3">
            {virtualBins.map(vb => (
              <div
                key={vb.location_code}
                onClick={() => inspectBin(vb.location_code)}
                className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                  vb.location_code === 'RETURNS-CART'
                    ? 'bg-purple-950/30 border-purple-500/40 hover:border-purple-400'
                    : 'bg-rose-950/30 border-rose-500/40 hover:border-rose-400'
                }`}
              >
                <div className="flex items-center justify-between gap-3 text-[10px] font-mono font-bold">
                  <span className={vb.location_code === 'RETURNS-CART' ? 'text-purple-300' : 'text-rose-300'}>
                    {vb.location_code}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-black/40 text-white font-mono">
                    {vb.total_quantity} qty
                  </span>
                </div>
                <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                  {vb.location_code === 'RETURNS-CART' ? 'Virtual Return Staging' : 'Quarantine / Scrapped'}
                </div>
              </div>
            ))}
          </div>

          {/* 4 Rows (R01, R02, R03, R04) */}
          {rows.map((row) => {
            const rowBins = binsByRow[row.row_code] || [];
            const isHotspot = row.congestion_level === 'high';
            const isModerate = row.congestion_level === 'moderate';

            return (
              <div
                key={row.id}
                className="absolute left-20 right-48 z-20"
                style={{ top: `${row.row_code === 'R01' ? 85 : row.row_code === 'R02' ? 185 : row.row_code === 'R03' ? 285 : 385}px` }}
              >
                {/* Row Header Banner */}
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-200">
                      ROW {row.row_code}
                    </span>
                    <span className="text-[10px] text-slate-400 hidden sm:inline truncate max-w-xs">
                      {row.name}
                    </span>
                  </div>

                  {/* Congestion indicator */}
                  <div className="flex items-center gap-1 font-mono text-[10px]">
                    {isHotspot ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950/80 border border-rose-500/40 text-rose-300 font-bold shadow-[0_0_8px_rgba(239,68,68,0.4)]">
                        <Flame size={12} className="text-rose-400" />
                        CONGESTION HOTSPOT (HEAVY TRAFFIC)
                      </span>
                    ) : isModerate ? (
                      <span className="px-1.5 py-0.2 rounded bg-amber-950/60 border border-amber-500/30 text-amber-300">
                        MODERATE TRAFFIC
                      </span>
                    ) : (
                      <span className="text-slate-400">TRAFFIC CLEAR</span>
                    )}
                  </div>
                </div>

                {/* Bins in Row (B01 - B06) */}
                <div className="grid grid-cols-6 gap-2.5">
                  {rowBins.map((bin) => {
                    // Check if this bin is on active route
                    const routeStop = activeRoute?.stops?.find(s => s.location_code === bin.location_code);
                    const isTargetHighlight = highlightBinCode === bin.location_code;

                    // Bin styling based on status
                    let borderStyle = 'border-[#222c3e]';
                    let bgStyle = 'bg-[#10141d]';
                    let glowStyle = '';

                    if (routeStop || isTargetHighlight) {
                      borderStyle = 'border-cyan-400';
                      bgStyle = 'bg-cyan-950/40';
                      glowStyle = 'shadow-[0_0_15px_rgba(0,240,255,0.4)]';
                    } else if (filterMode === 'congestion') {
                      if (isHotspot) {
                        borderStyle = 'border-rose-500/50';
                        bgStyle = 'bg-rose-950/30';
                      } else if (isModerate) {
                        borderStyle = 'border-amber-500/40';
                        bgStyle = 'bg-amber-950/20';
                      } else {
                        borderStyle = 'border-emerald-500/30';
                        bgStyle = 'bg-emerald-950/20';
                      }
                    } else {
                      if (bin.visual_status === 'issue') {
                        borderStyle = 'border-rose-500/60';
                        bgStyle = 'bg-rose-950/30';
                        glowStyle = 'shadow-[0_0_10px_rgba(239,68,68,0.3)]';
                      } else if (bin.visual_status === 'low_stock') {
                        borderStyle = 'border-amber-500/50';
                        bgStyle = 'bg-amber-950/20';
                      } else if (bin.visual_status === 'healthy') {
                        borderStyle = 'border-emerald-500/40';
                        bgStyle = 'bg-emerald-950/20';
                      } else {
                        borderStyle = 'border-slate-800';
                        bgStyle = 'bg-[#0b0f17]';
                      }
                    }

                    return (
                      <div
                        key={bin.id}
                        onClick={() => {
                          inspectBin(bin.location_code);
                          onSelectBin?.(bin);
                        }}
                        className={`relative p-2 rounded-lg border ${borderStyle} ${bgStyle} ${glowStyle} hover:border-cyan-400/80 cursor-pointer transition-all duration-150 group`}
                      >
                        {/* Route stop numbered badge */}
                        {routeStop && (
                          <div className="absolute -top-2.5 -right-2.5 h-6 w-6 rounded-full bg-cyan-400 text-black font-mono font-black text-xs flex items-center justify-center shadow-[0_0_10px_#00f0ff] z-30">
                            {routeStop.stopLabel}
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-white group-hover:text-cyan-300">
                            {bin.bin_code}
                          </span>
                          <span className="text-[9px] font-mono text-slate-400">
                            {bin.sku_count || 0} SKUs
                          </span>
                        </div>

                        <div className="mt-1 flex items-baseline justify-between text-[11px] font-mono">
                          <span className="text-slate-400">Qty:</span>
                          <span className={`font-bold ${bin.available_quantity < 10 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {bin.available_quantity || 0}
                          </span>
                        </div>

                        {/* Mini capacity bar */}
                        <div className="mt-1.5 h-1 w-full rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full ${
                              bin.visual_status === 'issue'
                                ? 'bg-rose-500'
                                : bin.visual_status === 'low_stock'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${bin.occupancy_pct || 10}%` }}
                          />
                        </div>

                        <div className="mt-1 text-[8px] font-mono text-slate-400 truncate">
                          {bin.location_code}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
