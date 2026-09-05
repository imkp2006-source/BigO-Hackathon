import React, { useState } from 'react';
import { useSystem } from '../context/SystemContext.jsx';
import {
  AlertTriangle,
  AlertOctagon,
  Flame,
  CheckCircle2,
  MapPin,
  RefreshCw
} from 'lucide-react';

export default function AlertsPage() {
  const { analytics, inspectBin, setActivePage, refreshAnalytics } = useSystem();
  const alerts = analytics?.alerts || [];
  const [filter, setFilter] = useState('all');

  const filteredAlerts = alerts.filter(a => {
    if (filter === 'all') return true;
    return a.type === filter;
  });

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#182130] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black tracking-wider text-white font-mono uppercase">
              Operational Alerts & Exceptions
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/40 font-mono font-bold">
              SYSTEM MONITOR
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Automated alerts for low safety stock thresholds, depleted SKUs, phantom variances, and aisle congestion
          </p>
        </div>

        <button
          onClick={refreshAnalytics}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111724] border border-[#1e2a3f] text-slate-300 text-xs font-mono"
        >
          <RefreshCw size={13} />
          <span>Refresh Alerts</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
        {[
          { id: 'all', label: 'All Alerts' },
          { id: 'low_stock', label: 'Low Stock Warnings' },
          { id: 'out_of_stock', label: 'Out of Stock (Depleted)' },
          { id: 'discrepancy', label: 'Phantom Discrepancies' },
          { id: 'congestion', label: 'Congestion Hotspots' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg border transition-all ${
              filter === tab.id
                ? 'bg-[#151c2a] text-white border-cyan-400 font-bold'
                : 'bg-[#0e121a] text-slate-400 border-[#1a2333] hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alerts Grid */}
      <div className="space-y-3">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map(a => {
            const isCritical = a.severity === 'critical';
            return (
              <div
                key={a.id}
                onClick={() => {
                  if (a.reference_code && a.reference_code.startsWith('WH1-')) {
                    inspectBin(a.reference_code);
                  } else {
                    setActivePage('inventory');
                  }
                }}
                className={`p-4 rounded-xl border font-mono text-xs cursor-pointer transition-all hover:translate-x-1 ${
                  isCritical
                    ? 'bg-rose-950/20 border-rose-500/50 hover:border-rose-400'
                    : 'bg-amber-950/20 border-amber-500/40 hover:border-amber-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isCritical ? (
                      <AlertOctagon size={16} className="text-rose-400" />
                    ) : (
                      <AlertTriangle size={16} className="text-amber-400" />
                    )}
                    <span className="font-bold text-white text-sm">{a.title}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-black/40 text-slate-300">
                    {a.type.replace('_', ' ')}
                  </span>
                </div>

                <div className="text-slate-300 mt-2 text-xs leading-relaxed">
                  {a.message}
                </div>

                <div className="mt-3 pt-2 border-t border-black/30 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Reference: <strong className="text-cyan-400">{a.reference_code}</strong></span>
                  <span>{new Date(a.created_at).toLocaleString()}</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center text-xs font-mono text-slate-500 bg-[#0c1018] rounded-xl border border-[#182233]">
            ✓ ALL CLEAR — NO ACTIVE EXCEPTIONS DETECTED
          </div>
        )}
      </div>
    </div>
  );
}
