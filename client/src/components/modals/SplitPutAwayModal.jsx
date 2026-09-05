import React, { useState } from 'react';
import { useSystem } from '../../context/SystemContext.jsx';
import { api } from '../../lib/api.js';
import {
  X,
  Boxes,
  Layers,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export default function SplitPutAwayModal({ isOpen, onClose }) {
  const { showToast, refreshAnalytics, refreshLocations } = useSystem();

  const [sku, setSku] = useState('SKU-204');
  const [totalQuantity, setTotalQuantity] = useState(100);
  const [workerName, setWorkerName] = useState('Operator Dave');
  const [loading, setLoading] = useState(false);

  // CASE 3 preset: 100 units split into 70 (WH1-R01-B02) and 30 (WH1-R01-B03)
  const [allocations, setAllocations] = useState([
    { locationCode: 'WH1-R01-B02', quantity: 70 },
    { locationCode: 'WH1-R01-B03', quantity: 30 }
  ]);

  if (!isOpen) return null;

  const sumAllocated = allocations.reduce((sum, a) => sum + (Number(a.quantity) || 0), 0);
  const isFullyAccounted = sumAllocated === Number(totalQuantity);

  const handleAddSplit = () => {
    setAllocations([...allocations, { locationCode: 'WH1-R01-B04', quantity: 0 }]);
  };

  const handleRemoveSplit = (idx) => {
    setAllocations(allocations.filter((_, i) => i !== idx));
  };

  const handleUpdate = (idx, field, val) => {
    const updated = [...allocations];
    updated[idx][field] = field === 'quantity' ? Number(val) : val;
    setAllocations(updated);
  };

  const handleSubmit = async () => {
    if (!isFullyAccounted) return;
    setLoading(true);
    try {
      const res = await api.splitPutaway({
        sku,
        totalQuantity: Number(totalQuantity),
        allocations,
        workerName
      });

      if (res.success) {
        showToast(res.accounted_status + ' — Shadow locations eliminated!', 'success');
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
      <div className="w-full max-w-lg rounded-xl bg-[#0c1018] border border-cyan-500/40 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-[#111724] border-b border-[#1b2639] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
              <Layers size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-white font-mono flex items-center gap-2">
                SPLIT PUT-AWAY WIZARD
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  SHADOW PREVENTION
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Prevents workers from placing overflow inventory into unrecorded locations
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 font-mono text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-[10px] uppercase">Inbound Product SKU</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full h-9 mt-1 px-3 rounded-lg bg-[#0a0e17] border border-[#1e2a3f] text-white font-bold text-xs"
              />
            </div>

            <div>
              <label className="text-slate-400 text-[10px] uppercase">Total Inbound Quantity</label>
              <input
                type="number"
                value={totalQuantity}
                onChange={(e) => setTotalQuantity(Number(e.target.value))}
                className="w-full h-9 mt-1 px-3 rounded-lg bg-[#0a0e17] border border-[#1e2a3f] text-white font-bold text-xs"
              />
            </div>
          </div>

          {/* Allocation Splits */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-300 font-bold uppercase text-[11px]">
                Target Bin Split Breakdown:
              </span>
              <button
                onClick={handleAddSplit}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <Plus size={13} /> Add Bin Split
              </button>
            </div>

            <div className="space-y-2">
              {allocations.map((alloc, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-[#101521] border border-[#1b2538] flex items-center gap-2"
                >
                  <div className="flex-1">
                    <label className="text-[9px] text-slate-400 uppercase">Target Bin</label>
                    <input
                      type="text"
                      value={alloc.locationCode}
                      onChange={(e) => handleUpdate(idx, 'locationCode', e.target.value)}
                      className="w-full h-8 px-2 rounded bg-[#0a0e17] border border-[#1f2c42] text-cyan-300 font-bold text-xs"
                    />
                  </div>

                  <div className="w-24">
                    <label className="text-[9px] text-slate-400 uppercase">Quantity</label>
                    <input
                      type="number"
                      value={alloc.quantity}
                      onChange={(e) => handleUpdate(idx, 'quantity', e.target.value)}
                      className="w-full h-8 px-2 rounded bg-[#0a0e17] border border-[#1f2c42] text-white font-bold text-xs text-center"
                    />
                  </div>

                  {allocations.length > 1 && (
                    <button
                      onClick={() => handleRemoveSplit(idx)}
                      className="mt-3 p-1 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Accounted Status Verification Badge */}
          <div
            className={`p-3 rounded-lg border text-center font-bold ${
              isFullyAccounted
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
            }`}
          >
            <div className="text-sm">
              {sumAllocated} / {totalQuantity} ACCOUNTED FOR {isFullyAccounted ? '✓' : '⚠'}
            </div>
            <div className="text-[10px] font-normal opacity-80 mt-0.5">
              {isFullyAccounted
                ? '100% of received stock is assigned to verified database locations.'
                : `Variance: ${totalQuantity - sumAllocated} unassigned units remaining.`}
            </div>
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
            disabled={!isFullyAccounted || loading}
            className="px-5 py-2.5 rounded-lg bg-cyan-500 text-black font-bold text-xs tracking-wider font-mono hover:bg-cyan-400 disabled:opacity-50"
          >
            {loading ? 'EXECUTING PUT-AWAY...' : 'CONFIRM SPLIT PUT-AWAY →'}
          </button>
        </div>
      </div>
    </div>
  );
}
