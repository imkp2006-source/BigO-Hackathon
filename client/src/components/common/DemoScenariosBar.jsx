import React, { useState } from 'react';
import { useSystem } from '../../context/SystemContext.jsx';
import { api } from '../../lib/api.js';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Play,
  Layers,
  Clock,
  Scan,
  ShieldAlert,
  Flame,
  FileText
} from 'lucide-react';

export default function DemoScenariosBar({ onTriggerCase }) {
  const { demoCases, showToast, refreshAnalytics, refreshLocations, setActivePage, inspectBin, setViewMode } = useSystem();
  const [expanded, setExpanded] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    setResetting(true);
    try {
      const res = await api.resetDemoData();
      if (res.success) {
        showToast('All 10 Demo Scenarios Reset to Clean State', 'success');
        refreshAnalytics();
        refreshLocations();
      }
    } catch (e) {
      showToast('Reset failed: ' + e.message, 'error');
    } finally {
      setResetting(false);
    }
  };

  const runDemoCase = (scenario) => {
    showToast(`Launching ${scenario.title}`, 'info');

    switch (scenario.id) {
      case 1: // Multi-Bin SKU (SKU-103)
        setActivePage('inventory');
        onTriggerCase?.({ type: 'SEARCH_SKU', sku: 'SKU-103' });
        break;
      case 2: // FIFO Selection (SKU-103)
        setActivePage('inventory');
        onTriggerCase?.({ type: 'SEARCH_SKU', sku: 'SKU-103' });
        break;
      case 3: // Split Put-Away
        setActivePage('operations');
        onTriggerCase?.({ type: 'OPEN_SPLIT_PUTAWAY' });
        break;
      case 4: // Phantom Discrepancy
        setActivePage('operations');
        inspectBin('WH1-R03-B04');
        break;
      case 5: // Wrong Bin Scan Error
        setViewMode('mobile');
        onTriggerCase?.({ type: 'TRIGGER_WRONG_SCAN' });
        break;
      case 6: // Verified Pick (Order #10291)
        setViewMode('mobile');
        onTriggerCase?.({ type: 'START_ORDER_10291' });
        break;
      case 7: // Congestion Hotspot
        setActivePage('map');
        break;
      case 8: // Full Audit Trail (SKU-103)
        setActivePage('movements');
        onTriggerCase?.({ type: 'FILTER_MOVEMENTS', sku: 'SKU-103' });
        break;
      case 9: // Low Stock Alert
        setActivePage('alerts');
        break;
      case 10: // Returns Cart
        setActivePage('returns');
        break;
      default:
        break;
    }
  };

  return (
    <div className="bg-[#0b0f17] border-b border-cyan-500/20 px-4 py-2 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono font-bold text-[11px] shadow-[0_0_8px_rgba(0,240,255,0.2)]">
            <Sparkles size={12} className="text-cyan-400" />
            <span>HACKATHON DEMO RUNNER</span>
          </div>
          <span className="hidden sm:inline text-slate-400 text-[11px]">
            10 Pre-configured Test Scenarios for Judging:
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#131926] hover:bg-[#182133] border border-[#1e2738] text-slate-300 text-[11px] font-medium transition-colors"
          >
            <span>{expanded ? 'Hide Demo Cases' : 'View 10 Demo Scenarios'}</span>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          <button
            onClick={handleReset}
            disabled={resetting}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 text-[11px] font-mono font-semibold transition-colors disabled:opacity-50"
            title="Reset Database to initial seeded state"
          >
            <RotateCcw size={12} className={resetting ? 'animate-spin' : ''} />
            <span>{resetting ? 'Resetting...' : 'Reset Demo Data'}</span>
          </button>
        </div>
      </div>

      {/* Expanded grid of 10 Intentional Demo Cases */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-[#182233] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 animate-fadeIn">
          {demoCases.map((c) => (
            <div
              key={c.id}
              onClick={() => runDemoCase(c)}
              className="p-2.5 rounded-lg bg-[#101522] border border-[#1a2436] hover:border-cyan-400/60 hover:bg-[#141b2c] cursor-pointer transition-all group relative overflow-hidden"
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400 font-bold mb-1">
                <span>CASE {c.id}</span>
                <Play size={10} className="text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="font-semibold text-white text-xs leading-snug group-hover:text-cyan-300">
                {c.subtitle}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                {c.description}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
