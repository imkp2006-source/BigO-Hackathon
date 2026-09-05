import React, { useState } from 'react';
import { useSystem } from '../../context/SystemContext.jsx';
import { api } from '../../lib/api.js';
import {
  X,
  AlertOctagon,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';

export default function ReportDiscrepancyModal({ isOpen, onClose, initialLocation }) {
  const { showToast, refreshAnalytics, refreshLocations } = useSystem();

  const [locationCode, setLocationCode] = useState(initialLocation || 'WH1-R03-B04');
  const [sku, setSku] = useState('SKU-501');
  const [physicalQuantity, setPhysicalQuantity] = useState(7);
  const [systemQuantity, setSystemQuantity] = useState(10);
  const [reason, setReason] = useState('Physical count audit detected missing packaging');
  const [reportedBy, setReportedBy] = useState('Worker 04 (Cycle Counter)');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const difference = Number(physicalQuantity) - Number(systemQuantity);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await api.reportDiscrepancy({
        locationCode,
        sku,
        physicalQuantity: Number(physicalQuantity),
        reportedBy,
        reason
      });

      if (res.success) {
        showToast(res.message, 'error');
        refreshAnalytics();
        refreshLocations();
        onClose();
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-md rounded-xl bg-[#0c1018] border border-rose-500/40 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-rose-950/40 border-b border-rose-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-400">
              <AlertOctagon size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-white font-mono flex items-center gap-2">
                REPORT PHANTOM INVENTORY
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/30">
                  DISCREPANCY
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Physical variance audit (Does NOT silently overwrite inventory)
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3 font-mono text-xs">
          <div>
            <label className="text-slate-400 text-[10px] uppercase">Location Code</label>
            <input
              type="text"
              value={locationCode}
              onChange={(e) => setLocationCode(e.target.value)}
              className="w-full h-9 mt-1 px-3 rounded-lg bg-[#0a0e17] border border-[#1e2a3f] text-white font-bold"
            />
          </div>

          <div>
            <label className="text-slate-400 text-[10px] uppercase">Product SKU</label>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full h-9 mt-1 px-3 rounded-lg bg-[#0a0e17] border border-[#1e2a3f] text-cyan-300 font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-[10px] uppercase">System Quantity</label>
              <input
                type="number"
                value={systemQuantity}
                onChange={(e) => setSystemQuantity(Number(e.target.value))}
                className="w-full h-9 mt-1 px-3 rounded-lg bg-[#0a0e17] border border-[#1e2a3f] text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 text-[10px] uppercase">Physical Count</label>
              <input
                type="number"
                value={physicalQuantity}
                onChange={(e) => setPhysicalQuantity(Number(e.target.value))}
                className="w-full h-9 mt-1 px-3 rounded-lg bg-[#0a0e17] border border-[#1e2a3f] text-white font-bold"
              />
            </div>
          </div>

          {/* Variance Warning Box */}
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-center space-y-1">
            <div className="text-base font-black text-rose-300">
              🔴 VARIANCE: {difference > 0 ? `+${difference}` : difference} UNITS
            </div>
            <div className="text-[10px] text-slate-300">
              System records {systemQuantity} units, but physical shelf holds {physicalQuantity}.
            </div>
          </div>

          <div>
            <label className="text-slate-400 text-[10px] uppercase">Discrepancy Reason / Notes</label>
            <textarea
              rows="2"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full mt-1 p-2 rounded-lg bg-[#0a0e17] border border-[#1e2a3f] text-white text-xs"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#111724] border-t border-[#1b2639] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#151c2a] border border-[#212c40] text-xs font-mono text-slate-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-rose-600 text-white font-bold text-xs tracking-wider font-mono hover:bg-rose-500 disabled:opacity-50"
          >
            {loading ? 'LOGGING DISCREPANCY...' : 'REPORT DISCREPANCY & ALERT AUDITOR →'}
          </button>
        </div>
      </div>
    </div>
  );
}
