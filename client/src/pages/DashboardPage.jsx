import React, { useState } from 'react';
import { useSystem } from '../context/SystemContext.jsx';
import KpiCard from '../components/common/KpiCard.jsx';
import WarehouseMap from '../components/map/WarehouseMap.jsx';
import {
  Boxes,
  Layers,
  MapPin,
  ShoppingCart,
  CheckSquare,
  AlertTriangle,
  History,
  TrendingUp,
  Flame,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Plus
} from 'lucide-react';

export default function DashboardPage({ onOpenCreateOrder, onOpenTransfer, onOpenPutaway, onOpenDiscrepancy }) {
  const { analytics, activeRoute, setActiveRoute, inspectBin, setActivePage, refreshAnalytics } = useSystem();
  const [refreshing, setRefreshing] = useState(false);

  const kpis = analytics?.kpis || {};
  const liveOperations = analytics?.live_operations || [];
  const alerts = analytics?.alerts || [];
  const inventoryByRow = analytics?.inventory_by_row || [];

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshAnalytics();
    setTimeout(() => setRefreshing(false), 400);
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#182130] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black tracking-wider text-white font-mono uppercase">
              Warehouse Command Center
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono font-bold">
              WH1 CENTRAL
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Real-time digital inventory, physical bin tracking, and operational traversal intelligence
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111724] border border-[#1e2a3f] text-slate-300 hover:text-white text-xs font-mono transition-colors"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin text-cyan-400' : ''} />
            <span>Sync Live DB</span>
          </button>

          <button
            onClick={onOpenCreateOrder}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 text-black font-bold text-xs font-mono tracking-wide hover:bg-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.3)] transition-all"
          >
            <Plus size={14} />
            <span>Create Order #10291</span>
          </button>
        </div>
      </div>

      {/* Top 6 KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          title="Total SKUs"
          value={kpis.total_skus || 528}
          subtext="Across 5 categories"
          icon={Boxes}
          color="cyan"
          glow={true}
          onClick={() => setActivePage('inventory')}
        />
        <KpiCard
          title="Total Inventory"
          value={kpis.total_inventory ? kpis.total_inventory.toLocaleString() : '29,952'}
          subtext={`${kpis.total_reserved || 0} reserved for orders`}
          icon={Layers}
          color="cyan"
        />
        <KpiCard
          title="Occupied Bins"
          value={`${kpis.occupied_bins || 24} / ${kpis.total_bins || 24}`}
          subtext={`${kpis.warehouse_utilization_pct || 100}% WH1 Utilization`}
          icon={MapPin}
          color="emerald"
          onClick={() => setActivePage('map')}
        />
        <KpiCard
          title="Pending Orders"
          value={kpis.pending_orders || 2}
          subtext="Allocated in picking queue"
          icon={ShoppingCart}
          color="cyan"
          onClick={() => setActivePage('orders')}
        />
        <KpiCard
          title="Low Stock SKUs"
          value={kpis.low_stock_count || 9}
          subtext={`${kpis.out_of_stock_count || 1} depleted to 0`}
          icon={AlertTriangle}
          color="amber"
          glow={true}
          onClick={() => setActivePage('alerts')}
        />
        <KpiCard
          title="Discrepancies"
          value={kpis.discrepancies_count || 1}
          subtext="Phantom variance flagged"
          icon={ShieldAlert}
          color="rose"
          glow={true}
          onClick={() => setActivePage('operations')}
        />
      </div>

      {/* Secondary Operational KPIs Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-2.5 rounded-lg bg-[#0a0d14] border border-[#161f2d] text-xs font-mono">
        <div>
          <span className="text-slate-500 text-[10px] uppercase">Picking Efficiency</span>
          <div className="font-bold text-emerald-400 mt-0.5">{kpis.picking_efficiency || '98.4%'}</div>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] uppercase">Avg Pick Time</span>
          <div className="font-bold text-cyan-300 mt-0.5">{kpis.average_pick_time || '42s'}</div>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] uppercase">Inventory Accuracy</span>
          <div className="font-bold text-emerald-400 mt-0.5">{kpis.inventory_accuracy || '99.2%'}</div>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] uppercase">Active Picking Tasks</span>
          <div className="font-bold text-white mt-0.5">{kpis.active_picking_tasks || 3} tasks</div>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] uppercase">Today's Inward</span>
          <div className="font-bold text-emerald-400 mt-0.5">+{kpis.today_inward || 220} units</div>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] uppercase">Today's Outward</span>
          <div className="font-bold text-cyan-400 mt-0.5">-{kpis.today_outward || 46} units</div>
        </div>
      </div>

      {/* Main Operational Grid: Map on Left (Larger), Live Panels on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Main Large Panel: LIVE WAREHOUSE MAP (Col Span 8) */}
        <div className="lg:col-span-8 space-y-4">
          <WarehouseMap activeRoute={activeRoute} onSelectBin={(bin) => inspectBin(bin.location_code)} />

          {/* Row Occupancy & Congestion Breakdown */}
          <div className="p-3.5 rounded-xl bg-[#0d121c] border border-[#182233]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wide">
                Warehouse Stock Distribution by Row (WH1)
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Official Hierarchy: Warehouse → Row → Bin
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {inventoryByRow.map((row) => (
                <div
                  key={row.row_code}
                  className={`p-3 rounded-lg border font-mono text-xs ${
                    row.congestion_level === 'high'
                      ? 'bg-rose-950/20 border-rose-500/40'
                      : row.congestion_level === 'moderate'
                      ? 'bg-amber-950/20 border-amber-500/30'
                      : 'bg-[#101624] border-[#1c273a]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">ROW {row.row_code}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                        row.congestion_level === 'high'
                          ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                          : row.congestion_level === 'moderate'
                          ? 'bg-amber-950 text-amber-300'
                          : 'bg-emerald-950 text-emerald-300'
                      }`}
                    >
                      {row.congestion_level}
                    </span>
                  </div>
                  <div className="mt-1.5 text-base font-black text-slate-200">
                    {row.total_units?.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">units</span>
                  </div>
                  <div className="mt-1 text-[10px] text-slate-400 flex justify-between">
                    <span>{row.unique_skus} SKUs</span>
                    <span>{row.occupied_bins} / {row.total_bins} Bins</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side Panels (Col Span 4) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Live Operations Feed */}
          <div className="p-3.5 rounded-xl bg-[#0c1018] border border-[#1a2333] shadow-lg">
            <div className="flex items-center justify-between pb-2 border-b border-[#172132]">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="beacon-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wide">
                  Live Operations Feed
                </span>
              </div>
              <span className="text-[10px] font-mono text-cyan-400">REALTIME</span>
            </div>

            <div className="mt-2.5 space-y-2 max-h-[290px] overflow-y-auto">
              {liveOperations.length > 0 ? (
                liveOperations.map((op) => (
                  <div
                    key={op.id}
                    className="p-2 rounded-lg bg-[#0f1420] border border-[#162030] text-[11px] font-mono hover:border-cyan-500/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-bold uppercase text-[10px] px-1.5 py-0.2 rounded ${
                        op.movement_type === 'outward'
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
                          : op.movement_type === 'inward'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                          : op.movement_type === 'transfer'
                          ? 'bg-purple-950 text-purple-300 border border-purple-500/30'
                          : 'bg-amber-950 text-amber-300'
                      }`}>
                        {op.movement_type}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(op.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-slate-200 font-semibold mt-1 truncate">
                      {op.quantity} × {op.sku} ({op.product_name})
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 flex justify-between">
                      <span>{op.from_location_code} → {op.to_location_code}</span>
                      <span className="text-cyan-400/80">{op.worker_name}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-500 font-mono">
                  Listening for live events...
                </div>
              )}
            </div>
          </div>

          {/* Critical Stock Alerts Panel */}
          <div className="p-3.5 rounded-xl bg-[#0c1018] border border-[#1a2333] shadow-lg">
            <div className="flex items-center justify-between pb-2 border-b border-[#172132]">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle size={15} />
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wide">
                  Stock Alerts ({alerts.length})
                </span>
              </div>
              <button
                onClick={() => setActivePage('alerts')}
                className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                View All <ArrowRight size={10} />
              </button>
            </div>

            <div className="mt-2.5 space-y-2 max-h-[260px] overflow-y-auto">
              {alerts.slice(0, 4).map((a) => (
                <div
                  key={a.id}
                  onClick={() => {
                    if (a.reference_code && a.reference_code.startsWith('WH1-')) {
                      inspectBin(a.reference_code);
                    } else {
                      setActivePage('inventory');
                    }
                  }}
                  className={`p-2.5 rounded-lg border text-xs font-mono cursor-pointer transition-all ${
                    a.severity === 'critical'
                      ? 'bg-rose-950/20 border-rose-500/40 text-rose-200 hover:bg-rose-950/40'
                      : 'bg-amber-950/20 border-amber-500/30 text-amber-200 hover:bg-amber-950/40'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>{a.title}</span>
                    <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-black/40">
                      {a.severity}
                    </span>
                  </div>
                  <div className="text-[11px] opacity-80 mt-1 line-clamp-2">
                    {a.message}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Operations Actions Box */}
          <div className="p-3.5 rounded-xl bg-[#0f1420] border border-cyan-500/20 space-y-2 font-mono text-xs">
            <div className="text-xs font-bold text-cyan-400 uppercase">Quick Operational Tools:</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onOpenPutaway}
                className="p-2 rounded-lg bg-[#131926] hover:bg-[#182133] border border-[#1f2b3e] text-slate-200 text-left transition-colors"
              >
                <div className="font-bold text-white">Split Put-Away</div>
                <div className="text-[10px] text-slate-400">Prevent shadow locations</div>
              </button>
              <button
                onClick={onOpenTransfer}
                className="p-2 rounded-lg bg-[#131926] hover:bg-[#182133] border border-[#1f2b3e] text-slate-200 text-left transition-colors"
              >
                <div className="font-bold text-white">Bin Transfer</div>
                <div className="text-[10px] text-slate-400">Rebalance aisle stock</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
