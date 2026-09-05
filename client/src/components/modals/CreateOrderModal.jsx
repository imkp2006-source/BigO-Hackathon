import React, { useState } from 'react';
import { useSystem } from '../../context/SystemContext.jsx';
import { api } from '../../lib/api.js';
import {
  X,
  ShoppingCart,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  MapPin,
  ArrowRight
} from 'lucide-react';

export default function CreateOrderModal({ isOpen, onClose, onOrderAllocated }) {
  const { showToast, refreshAnalytics, refreshLocations } = useSystem();

  const [customerName, setCustomerName] = useState('Apex Tech Labs (Express Hub)');
  const [priority, setPriority] = useState('urgent');
  const [loading, setLoading] = useState(false);
  const [allocatedResult, setAllocatedResult] = useState(null);

  // Default preset matching CASE 6 demo: Order #10291
  const [items, setItems] = useState([
    { sku: 'SKU-103', name: 'Logitech MX Master 3S Wireless Mouse', quantity: 2 },
    { sku: 'SKU-108', name: 'Braided Thunderbolt 4 USB-C Cable (2m)', quantity: 1 },
    { sku: 'SKU-102', name: 'Keychron K2 Mechanical Keyboard', quantity: 3 }
  ]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([...items, { sku: 'SKU-204', name: 'Anker 100W GaN Fast Charger Duo', quantity: 1 }]);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleUpdateQty = (index, qty) => {
    const updated = [...items];
    updated[index].quantity = Math.max(1, Number(qty) || 1);
    setItems(updated);
  };

  const handleSubmit = async () => {
    if (items.length === 0) return;
    setLoading(true);
    try {
      const res = await api.createOrder({
        customer_name: customerName,
        priority,
        items
      });

      if (res.success) {
        setAllocatedResult(res.data);
        showToast(res.message, 'success');
        refreshAnalytics();
        refreshLocations();
        onOrderAllocated?.(res.data);
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-2xl rounded-xl bg-[#0c1018] border border-cyan-500/40 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-[#111724] border-b border-[#1b2639] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
              <ShoppingCart size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-white font-mono flex items-center gap-2">
                ORDER INTAKE & INSTANT LOCATION RESOLVER
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  PS-3 ENGINE
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Instantly returns the exact Warehouse → Row → Bin for every item
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {!allocatedResult ? (
            <>
              {/* Order Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Customer / Destination</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full h-9 mt-1 px-3 rounded-lg bg-[#0a0e17] border border-[#1e2a3f] text-xs text-white focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Order Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full h-9 mt-1 px-3 rounded-lg bg-[#0a0e17] border border-[#1e2a3f] text-xs text-white focus:border-cyan-400"
                  >
                    <option value="normal">Normal Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent Express</option>
                  </select>
                </div>
              </div>

              {/* Items List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-slate-200 uppercase">
                    Order Items ({items.length})
                  </span>
                  <button
                    onClick={handleAddItem}
                    className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-mono"
                  >
                    <Plus size={13} /> Add Line Item
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-[#101521] border border-[#1b2538] flex items-center justify-between gap-3"
                    >
                      <div className="flex-1">
                        <div className="text-xs font-bold text-white">{item.name}</div>
                        <div className="text-[10px] font-mono text-cyan-300 mt-0.5">{item.sku}</div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <span className="text-slate-400 text-[10px]">QTY:</span>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateQty(idx, e.target.value)}
                            className="w-16 h-8 px-2 rounded bg-[#0a0e17] border border-[#1e2738] text-center font-bold text-white text-xs"
                          />
                        </div>

                        <button
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Instant Allocation Results View */
            <div className="space-y-4 animate-fadeIn">
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs font-mono">
                    ✓ {allocatedResult.order_number} ALLOCATED INSTANTLY
                  </div>
                  <div className="text-[10px] text-slate-300 font-mono mt-0.5">
                    Location resolution algorithm evaluated stock, FIFO batches, and route optimization.
                  </div>
                </div>
                <span className="text-xs font-mono font-black px-2 py-1 rounded bg-emerald-900/60 border border-emerald-500/40">
                  {allocatedResult.allocated_items.length} STOPS
                </span>
              </div>

              {/* Resolved Bins Breakdown with 'WHY THIS BIN?' */}
              <div className="space-y-2.5">
                <div className="text-xs font-mono font-bold text-slate-200 uppercase">
                  Resolved Item Pick Locations:
                </div>
                {allocatedResult.allocated_items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg bg-[#0e131e] border border-cyan-500/30 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-bold text-white">{item.product_name}</div>
                        <div className="text-[10px] font-mono text-cyan-300 mt-0.5">{item.sku}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-mono font-black text-cyan-400 bg-cyan-950/80 px-2.5 py-1 rounded border border-cyan-500/40">
                          📍 {item.allocated_location}
                        </span>
                        <div className="text-[10px] font-mono text-slate-400 mt-1">
                          Pick {item.quantity_ordered} unit(s)
                        </div>
                      </div>
                    </div>

                    {/* WHY THIS BIN? Transparent Justifications */}
                    <div className="pt-2 border-t border-[#182335] space-y-1">
                      <div className="text-[10px] font-mono font-bold text-cyan-400 uppercase flex items-center gap-1">
                        <Sparkles size={11} /> WHY THIS BIN?
                      </div>
                      <div className="space-y-0.5">
                        {item.reasons.map((r, rIdx) => (
                          <div key={rIdx} className="text-[10px] font-mono text-slate-300 flex items-center gap-1.5">
                            <span>{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Route Summary */}
              {allocatedResult.route && (
                <div className="p-3 rounded-lg bg-[#0d1320] border border-[#1b283d] flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2 text-cyan-300">
                    <MapPin size={14} />
                    <span>Optimized Traversal: {allocatedResult.route.totalStops} Stops</span>
                  </div>
                  <div className="text-slate-300">
                    Est. Walk: <strong>{allocatedResult.route.totalDistanceMeters}m</strong> ({allocatedResult.route.estimatedPickTimeMinutes} min)
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#111724] border-t border-[#1b2639] flex items-center justify-between">
          {!allocatedResult ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-[#151c2a] border border-[#212c40] text-xs font-mono text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-5 py-2.5 rounded-lg bg-cyan-500 text-black font-bold text-xs tracking-wider font-mono hover:bg-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.3)] transition-all disabled:opacity-50"
              >
                {loading ? 'ALLOCATING LOCATIONS...' : 'INTAKE ORDER & RESOLVE BINS →'}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-lg bg-cyan-500 text-black font-bold text-xs tracking-wider font-mono hover:bg-cyan-400"
            >
              DONE — VIEW ON MAP & PICK QUEUE
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
