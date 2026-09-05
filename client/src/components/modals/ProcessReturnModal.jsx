import React, { useState } from 'react';
import { useSystem } from '../../context/SystemContext.jsx';
import { api } from '../../lib/api.js';
import {
  X,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Boxes
} from 'lucide-react';

export default function ProcessReturnModal({ isOpen, onClose, initialReturn }) {
  const { showToast, refreshAnalytics, refreshLocations } = useSystem();

  const [returnId, setReturnId] = useState(initialReturn?.id || 'ret-402-1');
  const [sku, setSku] = useState(initialReturn?.sku || 'SKU-402');
  const [productName, setProductName] = useState(initialReturn?.product_name || 'Brio 4K Ultra HD Streaming Webcam');
  const [quantity, setQuantity] = useState(initialReturn?.quantity || 5);
  const [action, setAction] = useState('restock'); // 'restock' | 'scrap'
  const [targetBinLocation, setTargetBinLocation] = useState('WH1-R02-B01');
  const [notes, setNotes] = useState('QA passed: Sealed package verified');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await api.processReturn({
        returnId,
        action,
        targetBinLocation,
        notes,
        workerName: 'QA Inspector John'
      });

      if (res.success) {
        showToast(res.message, 'success');
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
      <div className="w-full max-w-md rounded-xl bg-[#0c1018] border border-purple-500/40 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-purple-950/40 border-b border-purple-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-400">
              <RotateCcw size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-white font-mono flex items-center gap-2">
                PROCESS RETURN TRIAGE
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30">
                  RETURNS-CART
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Inspect quarantined return before restoring to picking inventory
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3 font-mono text-xs">
          <div className="p-3 rounded-lg bg-[#0e131e] border border-[#1b2538] space-y-1">
            <div className="text-xs font-bold text-white">{productName}</div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-cyan-300 font-bold">{sku}</span>
              <span>Quantity: <strong className="text-white">{quantity} units</strong></span>
            </div>
            <div className="text-[10px] text-purple-300 font-semibold">
              Current Staging: RETURNS-CART
            </div>
          </div>

          {/* Action Choice */}
          <div>
            <label className="text-slate-400 text-[10px] uppercase">QA Decision</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={() => setAction('restock')}
                className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                  action === 'restock'
                    ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                    : 'bg-[#101521] border-[#1c2738] text-slate-400'
                }`}
              >
                ✓ Restock to Bin
              </button>
              <button
                type="button"
                onClick={() => setAction('scrap')}
                className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                  action === 'scrap'
                    ? 'bg-rose-950/60 border-rose-500/60 text-rose-300 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                    : 'bg-[#101521] border-[#1c2738] text-slate-400'
                }`}
              >
                ⚠ Scrap to QA-DAMAGED
              </button>
            </div>
          </div>

          {action === 'restock' && (
            <div>
              <label className="text-slate-400 text-[10px] uppercase">Destination Warehouse Bin</label>
              <input
                type="text"
                value={targetBinLocation}
                onChange={(e) => setTargetBinLocation(e.target.value)}
                className="w-full h-9 mt-1 px-3 rounded-lg bg-[#0a0e17] border border-[#1e2a3f] text-emerald-300 font-bold"
              />
            </div>
          )}

          <div>
            <label className="text-slate-400 text-[10px] uppercase">QA Inspection Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-9 mt-1 px-3 rounded-lg bg-[#0a0e17] border border-[#1e2a3f] text-white"
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
            className="px-5 py-2.5 rounded-lg bg-purple-600 text-white font-bold text-xs tracking-wider font-mono hover:bg-purple-500 disabled:opacity-50"
          >
            {loading ? 'PROCESSING...' : 'CONFIRM QA TRIAGE →'}
          </button>
        </div>
      </div>
    </div>
  );
}
