import React, { useState, useEffect } from 'react';
import { useSystem } from '../context/SystemContext.jsx';
import { api } from '../lib/api.js';
import {
  RotateCcw,
  ShieldCheck,
  MapPin,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

export default function ReturnsPage({ onOpenProcessReturn }) {
  const { inspectBin } = useSystem();
  const [returnsData, setReturnsData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const res = await api.getReturns();
      if (res.success) {
        setReturnsData(res.data);
      }
    } catch (e) {
      console.error('Returns error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const returns = returnsData?.returns || [];
  const virtualLocations = returnsData?.virtual_locations || [];

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#182130] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black tracking-wider text-white font-mono uppercase">
              Returns & Special Staging
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/40 font-mono font-bold">
              RETURNS-CART & QA-DAMAGED
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Returned inventory is quarantined in virtual staging bays and cannot be picked until QA approved
          </p>
        </div>

        <button
          onClick={() => onOpenProcessReturn?.()}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 text-white font-bold text-xs font-mono hover:bg-purple-500 transition-all shadow-[0_0_10px_rgba(168,85,247,0.3)]"
        >
          <RotateCcw size={14} />
          <span>Process Return Triage</span>
        </button>
      </div>

      {/* Virtual Locations Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          onClick={() => inspectBin('RETURNS-CART')}
          className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 hover:border-purple-400 cursor-pointer transition-all space-y-2"
        >
          <div className="flex items-center justify-between text-xs font-mono font-bold text-purple-300">
            <span>STAGING: RETURNS-CART</span>
            <span className="px-2 py-0.5 rounded bg-black/40 text-white">Virtual Staging</span>
          </div>
          <div className="text-sm font-bold text-white">Quarantine Intake Buffer</div>
          <div className="text-xs text-slate-400 font-mono">
            Items returned by customers awaiting inspection before restocking or scrapping.
          </div>
        </div>

        <div
          onClick={() => inspectBin('QA-DAMAGED')}
          className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 hover:border-rose-400 cursor-pointer transition-all space-y-2"
        >
          <div className="flex items-center justify-between text-xs font-mono font-bold text-rose-300">
            <span>STAGING: QA-DAMAGED</span>
            <span className="px-2 py-0.5 rounded bg-black/40 text-white">Scrap Quarantine</span>
          </div>
          <div className="text-sm font-bold text-white">Damaged / Non-Conforming Goods</div>
          <div className="text-xs text-slate-400 font-mono">
            Quarantine area for scrapped or non-restockable customer returns.
          </div>
        </div>
      </div>

      {/* Pending Returns Queue */}
      <div className="p-4 rounded-xl bg-[#0c1018] border border-[#182130] space-y-3">
        <div className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wide">
          Returns Intake Queue ({returns.length} records)
        </div>

        <div className="space-y-2">
          {returns.map((ret) => (
            <div
              key={ret.id}
              className="p-3.5 rounded-lg bg-[#0e131e] border border-[#1b2538] flex flex-wrap items-center justify-between gap-3 font-mono text-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{ret.return_number}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30 font-bold">
                    {ret.current_location}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#162030] text-slate-300 capitalize">
                    Condition: {ret.condition}
                  </span>
                </div>
                <div className="text-slate-200 mt-1">
                  {ret.quantity} × <strong className="text-white">{ret.product_name}</strong> ({ret.sku})
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 italic">
                  "{ret.notes}"
                </div>
              </div>

              <div>
                {ret.status === 'pending_triage' ? (
                  <button
                    onClick={() => onOpenProcessReturn?.(ret)}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 text-white font-bold text-xs hover:bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.3)] transition-all"
                  >
                    Process QA Triage →
                  </button>
                ) : (
                  <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-400 uppercase font-bold text-[10px]">
                    {ret.status}
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
