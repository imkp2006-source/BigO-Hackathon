import React, { useState, useEffect } from 'react';
import { useSystem } from '../context/SystemContext.jsx';
import { api } from '../lib/api.js';
import {
  Layers,
  ArrowLeftRight,
  AlertOctagon,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  ShieldCheck,
  Plus
} from 'lucide-react';

export default function OperationsPage({ onOpenSplitPutaway, onOpenTransfer, onOpenDiscrepancy }) {
  const { inspectBin, showToast, refreshAnalytics, refreshLocations } = useSystem();
  const [discrepancies, setDiscrepancies] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchDiscrepancies = async () => {
    setLoading(true);
    try {
      const res = await api.getDiscrepancies();
      if (res.success) {
        setDiscrepancies(res.data);
      }
    } catch (e) {
      console.error('Discrepancies load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscrepancies();
  }, []);

  const handleResolve = async (id, action) => {
    try {
      const res = await api.resolveDiscrepancy(id, { action });
      if (res.success) {
        showToast(res.message, 'success');
        fetchDiscrepancies();
        refreshAnalytics();
        refreshLocations();
      }
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#182130] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black tracking-wider text-white font-mono uppercase">
              Warehouse Stock Operations
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono font-bold">
              SLOTTING & INTEGRITY
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Resolve shadow locations with Split Put-Away, rebalance aisle stock, and audit phantom inventory
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSplitPutaway}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 text-black font-bold text-xs font-mono hover:bg-cyan-400 transition-all shadow-[0_0_10px_rgba(0,240,255,0.2)]"
          >
            <Layers size={14} />
            <span>Split Put-Away</span>
          </button>

          <button
            onClick={onOpenTransfer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141b29] border border-cyan-500/40 text-cyan-300 font-bold text-xs font-mono hover:bg-[#1a2336] transition-all"
          >
            <ArrowLeftRight size={14} />
            <span>Bin Transfer</span>
          </button>
        </div>
      </div>

      {/* 3 Core Pillars Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div
          onClick={onOpenSplitPutaway}
          className="p-4 rounded-xl bg-[#0c1018] border border-cyan-500/30 hover:border-cyan-400 cursor-pointer transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
              1. Split Put-Away
            </span>
            <Layers size={16} className="text-cyan-400" />
          </div>
          <div className="text-sm font-bold text-white group-hover:text-cyan-300">
            Prevent Shadow Locations
          </div>
          <div className="text-xs text-slate-400">
            When inbound shipment cannot fit in one bin, split across multiple locations with 100% accounting.
          </div>
        </div>

        <div
          onClick={onOpenTransfer}
          className="p-4 rounded-xl bg-[#0c1018] border border-cyan-500/30 hover:border-cyan-400 cursor-pointer transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
              2. Bin-to-Bin Transfers
            </span>
            <ArrowLeftRight size={16} className="text-cyan-400" />
          </div>
          <div className="text-sm font-bold text-white group-hover:text-cyan-300">
            Aisle Stock Rebalancing
          </div>
          <div className="text-xs text-slate-400">
            Transfer stock between bins with ACID guarantees, instant quantity adjustment, and immutable audit logs.
          </div>
        </div>

        <div
          onClick={onOpenDiscrepancy}
          className="p-4 rounded-xl bg-[#0c1018] border border-rose-500/30 hover:border-rose-400 cursor-pointer transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-rose-400 uppercase">
              3. Phantom Inventory
            </span>
            <AlertOctagon size={16} className="text-rose-400" />
          </div>
          <div className="text-sm font-bold text-white group-hover:text-rose-300">
            Report & Audit Variance
          </div>
          <div className="text-xs text-slate-400">
            Report physical count differences without silent overwriting. Generates auditor alerts and recount workflows.
          </div>
        </div>
      </div>

      {/* Reported Discrepancies Audit Log (CASE 4 Anchor) */}
      <div className="p-4 rounded-xl bg-[#0c1018] border border-[#182130] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2">
              <span>Phantom Inventory Discrepancy Registry</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/30">
                {discrepancies.length} Active Audits
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
              Physical discrepancies are isolated and flagged for manager cycle count approval
            </div>
          </div>

          <button
            onClick={onOpenDiscrepancy}
            className="flex items-center gap-1 text-xs font-mono text-rose-400 hover:text-rose-300"
          >
            <Plus size={13} /> Report New Variance
          </button>
        </div>

        <div className="space-y-2">
          {discrepancies.map((d) => (
            <div
              key={d.id}
              className="p-3.5 rounded-lg bg-[#0e131e] border border-rose-500/30 flex flex-wrap items-center justify-between gap-3 font-mono text-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-rose-400">
                    🔴 DISCREPANCY: {d.difference} UNITS
                  </span>
                  <span className="text-slate-400 text-xs">
                    at <strong className="text-white hover:underline cursor-pointer" onClick={() => inspectBin(d.location_code)}>📍 {d.location_code}</strong>
                  </span>
                </div>
                <div className="text-slate-200 mt-1">
                  Item: <strong className="text-white">{d.product_name}</strong> ({d.sku})
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  System Count: {d.system_quantity} | Physical Count: {d.physical_quantity} | By: {d.reported_by}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 italic">
                  "{d.reason}"
                </div>
              </div>

              {/* Resolution Controls */}
              <div className="flex items-center gap-2">
                {d.status === 'pending' ? (
                  <>
                    <button
                      onClick={() => handleResolve(d.id, 'adjust')}
                      className="px-3 py-1.5 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 text-xs font-bold transition-colors"
                    >
                      ✓ Approve Count & Sync
                    </button>
                    <button
                      onClick={() => handleResolve(d.id, 'reject')}
                      className="px-3 py-1.5 rounded bg-[#151c2a] hover:bg-[#1a2436] border border-[#233148] text-slate-400 text-xs transition-colors"
                    >
                      Request Recount
                    </button>
                  </>
                ) : (
                  <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    {d.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
