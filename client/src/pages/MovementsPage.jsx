import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import {
  History,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  RotateCcw,
  SlidersHorizontal,
  User,
  Calendar
} from 'lucide-react';

export default function MovementsPage({ initialFilterSku }) {
  const [movements, setMovements] = useState([]);
  const [typeSummary, setTypeSummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState('all');
  const [searchSku, setSearchSku] = useState(initialFilterSku || '');

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const res = await api.getMovements({
        type: selectedType !== 'all' ? selectedType : '',
        sku: searchSku.trim(),
        limit: 100
      });
      if (res.success) {
        setMovements(res.data);
        setTypeSummary(res.type_summary || []);
      }
    } catch (e) {
      console.error('Movements fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [selectedType]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMovements();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchSku]);

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#182130] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black tracking-wider text-white font-mono uppercase">
              Immutable Stock Movement Ledger
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono font-bold">
              AUDIT COMPLIANT
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Cryptographically sealed movement log for complete worker accountability and traceability
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchSku}
            onChange={(e) => setSearchSku(e.target.value)}
            placeholder="Filter by SKU or location..."
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#0f1420] border border-[#1e2738] text-xs text-white placeholder-slate-500 focus:border-cyan-400 font-mono"
          />
        </div>
      </div>

      {/* Movement Type Filter Tabs & Counts */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
        {[
          { id: 'all', label: 'All Movements' },
          { id: 'inward', label: 'Inward Inbound', icon: ArrowDownLeft, color: 'text-emerald-400' },
          { id: 'outward', label: 'Outward Picking', icon: ArrowUpRight, color: 'text-cyan-400' },
          { id: 'transfer', label: 'Transfers', icon: ArrowLeftRight, color: 'text-purple-400' },
          { id: 'return', label: 'Returns', icon: RotateCcw, color: 'text-amber-400' },
          { id: 'adjustment', label: 'Adjustments', icon: SlidersHorizontal, color: 'text-rose-400' }
        ].map((tab) => {
          const isSelected = selectedType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                isSelected
                  ? 'bg-[#151c2a] text-white border-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.2)] font-bold'
                  : 'bg-[#0e121a] text-slate-400 border-[#1a2333] hover:text-slate-200'
              }`}
            >
              {tab.icon && <tab.icon size={13} className={tab.color} />}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Audit Log Table */}
      <div className="rounded-xl bg-[#0c1018] border border-[#182130] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#101522] border-b border-[#182335] text-slate-400 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Product / SKU</th>
                <th className="py-3 px-3 text-center">Quantity</th>
                <th className="py-3 px-3">From Location</th>
                <th className="py-3 px-3">To Location</th>
                <th className="py-3 px-3">Operator / Worker</th>
                <th className="py-3 px-3">Audit Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#151d2c]">
              {movements.map((m) => {
                const isOutward = m.movement_type === 'outward';
                const isInward = m.movement_type === 'inward';
                const isTransfer = m.movement_type === 'transfer';
                const isReturn = m.movement_type === 'return';

                return (
                  <tr key={m.id} className="hover:bg-[#111724] transition-colors">
                    {/* Timestamp */}
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                      <div>{new Date(m.timestamp).toLocaleDateString()}</div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </td>

                    {/* Type Badge */}
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                          isInward
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                            : isOutward
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                            : isTransfer
                            ? 'bg-purple-950 text-purple-300 border border-purple-500/40'
                            : isReturn
                            ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                            : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {m.movement_type}
                      </span>
                    </td>

                    {/* SKU & Name */}
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-white truncate max-w-[200px]">
                        {m.product_name}
                      </div>
                      <span className="text-[10px] text-cyan-400 font-bold">
                        {m.sku}
                      </span>
                    </td>

                    {/* Quantity */}
                    <td className="py-2.5 px-3 text-center font-bold text-sm">
                      <span className={isInward ? 'text-emerald-400' : isOutward ? 'text-cyan-400' : 'text-slate-200'}>
                        {isInward ? `+${m.quantity}` : isOutward ? `-${m.quantity}` : m.quantity}
                      </span>
                    </td>

                    {/* From */}
                    <td className="py-2.5 px-3 text-slate-300 font-bold">
                      {m.from_location_code}
                    </td>

                    {/* To */}
                    <td className="py-2.5 px-3 text-cyan-300 font-bold">
                      {m.to_location_code}
                    </td>

                    {/* Worker */}
                    <td className="py-2.5 px-3 text-slate-300">
                      <div className="flex items-center gap-1">
                        <User size={12} className="text-slate-500" />
                        <span>{m.worker_name}</span>
                      </div>
                    </td>

                    {/* Reason */}
                    <td className="py-2.5 px-3 text-[11px] text-slate-400 truncate max-w-[240px]">
                      {m.reason}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
