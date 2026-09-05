import React, { useState, useEffect } from 'react';
import { useSystem } from '../context/SystemContext.jsx';
import { api } from '../lib/api.js';
import {
  CheckSquare,
  Smartphone,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function PickingPage() {
  const { setViewMode, inspectBin } = useSystem();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.getPickingTasks();
      if (res.success) {
        setTasks(res.data);
      }
    } catch (e) {
      console.error('Picking tasks error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#182130] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black tracking-wider text-white font-mono uppercase">
              Precision Picking Queue
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-mono font-bold">
              WORKER GUIDANCE
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Dispatched picking lines with physical barcode/QR verification and mispack prevention
          </p>
        </div>

        <button
          onClick={() => setViewMode('mobile')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 text-black font-bold text-xs font-mono tracking-wide hover:bg-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.3)] transition-all"
        >
          <Smartphone size={16} />
          <span>Launch Handheld Picker Interface →</span>
        </button>
      </div>

      {/* Picking Tasks Table */}
      <div className="rounded-xl bg-[#0c1018] border border-[#182130] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#101522] border-b border-[#182335] text-slate-400 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3">Order Number</th>
                <th className="py-3 px-3">Product / SKU</th>
                <th className="py-3 px-3">Location (Row/Bin)</th>
                <th className="py-3 px-3 text-center">Pick Quantity</th>
                <th className="py-3 px-3">Assigned Worker</th>
                <th className="py-3 px-3 text-center">Step Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#151d2c]">
              {tasks.map((t) => {
                const isCompleted = t.step_status === 'completed';
                return (
                  <tr key={t.id} className="hover:bg-[#111724] transition-colors">
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-cyan-300">{t.order_number}</span>
                      <div className="text-[10px] text-slate-400">{t.customer_name}</div>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-white">{t.product_name}</div>
                      <span className="text-[10px] text-cyan-400 bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-500/30 font-bold">
                        {t.sku}
                      </span>
                    </td>

                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => inspectBin(t.location_code)}
                        className="font-bold text-cyan-300 hover:underline"
                      >
                        📍 {t.location_code}
                      </button>
                      <div className="text-[10px] text-slate-400">Row {t.row_code} • Bin {t.bin_code}</div>
                    </td>

                    <td className="py-2.5 px-3 text-center font-bold text-white text-sm">
                      {t.quantity_to_pick} <span className="text-[10px] text-slate-400 font-normal">units</span>
                    </td>

                    <td className="py-2.5 px-3 text-slate-300">
                      <span className="flex items-center gap-1">
                        <User size={12} className="text-slate-500" />
                        {t.assigned_worker || 'Worker 01'}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                          isCompleted
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-950 text-amber-300 border border-amber-500/40 animate-pulse'
                        }`}
                      >
                        {isCompleted ? '✓ VERIFIED PICK' : t.step_status?.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      {!isCompleted ? (
                        <button
                          onClick={() => setViewMode('mobile')}
                          className="px-2.5 py-1 rounded bg-cyan-500 text-black font-bold text-[10px] hover:bg-cyan-400"
                        >
                          Pick on Handheld →
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500">Fulfilled</span>
                      )}
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
