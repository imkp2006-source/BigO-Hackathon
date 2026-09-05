import React, { useState } from 'react';
import { useSystem } from '../../context/SystemContext.jsx';
import { api } from '../../lib/api.js';
import {
  X,
  ArrowLeftRight,
  MapPin,
  CheckCircle2
} from 'lucide-react';

export default function StockTransferModal({ isOpen, onClose, initialFromLocation }) {
  const { showToast, refreshAnalytics, refreshLocations } = useSystem();

  const [fromLocationCode, setFromLocationCode] = useState(initialFromLocation || 'WH1-R01-B02');
  const [toLocationCode, setToLocationCode] = useState('WH1-R02-B05');
  const [sku, setSku] = useState('SKU-103');
  const [quantity, setQuantity] = useState(10);
  const [workerName, setWorkerName] = useState('Operator Carlos');
  const [reason, setReason] = useState('Aisle replenishment rebalancing');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await api.transferStock({
        fromLocationCode,
        toLocationCode,
        sku,
        quantity: Number(quantity),
        workerName,
        reason
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
      <div className="w-full max-w-md rounded-xl bg-[#0c1018] border border-cyan-500/40 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-[#111724] border-b border-[#1b2639] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
              <ArrowLeftRight size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-white font-mono flex items-center gap-2">
                BIN-TO-BIN STOCK TRANSFER
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  ATOMIC TX
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Atomic database transfer with automatic audit ledger logging
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3 font-mono text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-[10px] uppercase">From Location (Source)</label>
              <input
                type="text"
                value={fromLocationCode}
                onChange={(e) => setFromLocationCode(e.target.value)}
                className="w-full h-9 mt-1 px-3 rounded-lg bg-[#0a0e17] border border-[#1e2a3f] text-cyan-300 font-bold"
              />
            </div>
            <div>
              <label className="text-slate-400 text-[10px] uppercase">To Location (Destination)</label>
              <input
                type="text"
                value={toLocationCode}
                onChange={(e) => setToLocationCode(e.target.value)}
                className="w-full h-9 mt-1 px-3 rounded-lg bg-[#0a0e17] border border-[#1e2a3f] text-emerald-300 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-[10px] uppercase">Product SKU</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full h-9 mt-1 px-3 rounded-lg bg-[#0a0e17] border border-[#1e2a3f] text-white font-bold"
              />
            </div>
            <div>
              <label className="text-slate-400 text-[10px] uppercase">Transfer Quantity</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full h-9 mt-1 px-3 rounded-lg bg-[#0a0e17] border border-[#1e2a3f] text-white font-bold text-center"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 text-[10px] uppercase">Transfer Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full h-9 mt-1 px-3 rounded-lg bg-[#0a0e17] border border-[#1e2a3f] text-white"
            />
          </div>

          <div>
            <label className="text-slate-400 text-[10px] uppercase">Operator Name</label>
            <input
              type="text"
              value={workerName}
              onChange={(e) => setWorkerName(e.target.value)}
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
            className="px-5 py-2.5 rounded-lg bg-cyan-500 text-black font-bold text-xs tracking-wider font-mono hover:bg-cyan-400 disabled:opacity-50"
          >
            {loading ? 'TRANSFERRING...' : 'EXECUTE ATOMIC TRANSFER →'}
          </button>
        </div>
      </div>
    </div>
  );
}
