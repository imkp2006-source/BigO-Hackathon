import React, { useState, useEffect } from 'react';
import { useSystem } from '../context/SystemContext.jsx';
import { api } from '../lib/api.js';
import {
  ShoppingCart,
  Plus,
  MapPin,
  Sparkles,
  ChevronRight,
  Clock,
  CheckCircle2,
  Navigation,
  ExternalLink
} from 'lucide-react';

export default function OrdersPage({ onOpenCreateOrder }) {
  const { setActiveRoute, setActivePage, setViewMode, inspectBin } = useSystem();

  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.getOrders();
      if (res.success) {
        setOrders(res.data);
        if (res.data.length > 0 && !selectedOrder) {
          fetchOrderDetails(res.data[0].id);
        }
      }
    } catch (e) {
      console.error('Orders load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetails = async (orderId) => {
    try {
      const res = await api.getOrderDetails(orderId);
      if (res.success) {
        setSelectedOrder(res.data);
        if (res.data.route) {
          setActiveRoute(res.data.route);
        }
      }
    } catch (e) {
      console.error('Order detail load error:', e);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#182130] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black tracking-wider text-white font-mono uppercase">
              Order Intake & Allocation Hub
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono font-bold">
              INSTANT BIN RESOLVER
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Incoming orders are instantly resolved into exact warehouse, row, and bin pick stops
          </p>
        </div>

        <button
          onClick={onOpenCreateOrder}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 text-black font-bold text-xs font-mono tracking-wide hover:bg-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.3)] transition-all"
        >
          <Plus size={14} />
          <span>New Order Intake</span>
        </button>
      </div>

      {/* Two Column Layout: Orders List on Left, Active Order Allocation on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Orders List (Col Span 4) */}
        <div className="lg:col-span-4 space-y-2">
          <div className="text-xs font-mono font-bold text-slate-400 uppercase px-1">
            Orders Queue ({orders.length})
          </div>

          <div className="space-y-2">
            {orders.map((ord) => {
              const isSelected = selectedOrder?.order?.id === ord.id;
              return (
                <div
                  key={ord.id}
                  onClick={() => fetchOrderDetails(ord.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#141b29] border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                      : 'bg-[#0c1018] border-[#182233] hover:border-[#223048]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-cyan-300">
                      {ord.order_number}
                    </span>
                    <span
                      className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                        ord.status === 'allocated'
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                          : ord.status === 'picking'
                          ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                          : ord.status === 'packed'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {ord.status}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-white mt-1.5 truncate">
                    {ord.customer_name}
                  </div>

                  <div className="mt-2 pt-2 border-t border-[#182233] flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>{ord.total_units_ordered || ord.total_items} units ordered</span>
                    <span className="capitalize">{ord.priority} priority</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Order Details & Location Allocation (Col Span 8) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedOrder ? (
            <div className="p-4 rounded-xl bg-[#0c1018] border border-[#1a2436] space-y-4">
              {/* Order Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg bg-[#101624] border border-cyan-500/30">
                <div>
                  <div className="flex items-center gap-2 font-mono text-sm font-black text-white">
                    <span>{selectedOrder.order.order_number}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                      {selectedOrder.order.priority?.toUpperCase()} PRIORITY
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    Customer: {selectedOrder.order.customer_name}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (selectedOrder.route) {
                        setActiveRoute(selectedOrder.route);
                        setActivePage('map');
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141d2d] hover:bg-[#1a253a] border border-cyan-500/30 text-cyan-300 text-xs font-mono transition-colors"
                  >
                    <MapPin size={13} />
                    <span>View Route on Map</span>
                  </button>

                  <button
                    onClick={() => setViewMode('mobile')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-black font-bold text-xs font-mono hover:bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all"
                  >
                    <span>Dispatch to Handheld →</span>
                  </button>
                </div>
              </div>

              {/* Traversal Route Details */}
              {selectedOrder.route && (
                <div className="p-3.5 rounded-lg bg-[#0f1420] border border-[#1b2639] font-mono text-xs">
                  <div className="flex items-center justify-between text-cyan-400 font-bold mb-2">
                    <span className="flex items-center gap-1.5">
                      <Navigation size={14} />
                      OPTIMIZED TRAVERSAL ROUTE (S-SHAPE ALGORITHM)
                    </span>
                    <span>{selectedOrder.route.totalStops} Stops</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
                    <span className="px-2 py-0.5 rounded bg-[#162030] text-slate-400">START DOCK</span>
                    <ChevronRight size={12} className="text-cyan-400" />
                    {selectedOrder.route.stops.map((stop, idx) => (
                      <React.Fragment key={idx}>
                        <button
                          onClick={() => inspectBin(stop.location_code)}
                          className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold hover:underline"
                        >
                          {stop.stopLabel} → {stop.location_code}
                        </button>
                        <ChevronRight size={12} className="text-cyan-400" />
                      </React.Fragment>
                    ))}
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                      PACKING STATION
                    </span>
                  </div>

                  <div className="mt-2 text-[10px] text-slate-400 flex gap-4">
                    <span>Est. Distance: <strong className="text-white">{selectedOrder.route.totalDistanceMeters} meters</strong></span>
                    <span>Est. Pick Time: <strong className="text-white">{selectedOrder.route.estimatedPickTimeMinutes} minutes</strong></span>
                    <span>Zig-Zagging: <strong className="text-emerald-400">ELIMINATED ✓</strong></span>
                  </div>
                </div>
              )}

              {/* Resolved Line Items with "Why This Bin?" */}
              <div className="space-y-3">
                <div className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wide">
                  Intelligent Product-to-Bin Resolutions ({selectedOrder.items?.length || 0} Items)
                </div>

                {selectedOrder.items?.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-lg bg-[#0e131d] border border-[#192335] space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-bold text-white">{item.product_name}</div>
                        <div className="text-[10px] font-mono text-cyan-300 mt-0.5">
                          {item.sku} • {item.unit_type}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-xs font-black text-cyan-400 bg-cyan-950/80 px-2.5 py-1 rounded border border-cyan-500/40">
                          📍 {item.location_code}
                        </span>
                        <div className="text-[10px] font-mono text-slate-400 mt-1">
                          Pick {item.quantity_ordered} INDIVIDUAL UNITS
                        </div>
                      </div>
                    </div>

                    {/* WHY THIS BIN? Justification */}
                    <div className="pt-2 border-t border-[#162030] text-[10px] font-mono text-slate-400 space-y-0.5">
                      <div className="text-cyan-400 font-bold uppercase flex items-center gap-1">
                        <Sparkles size={11} /> WHY THIS BIN?
                      </div>
                      <div className="text-slate-300">
                        {item.allocation_reason || 'Oldest eligible batch (FIFO), full quantity match, clear aisle path.'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs font-mono text-slate-500 bg-[#0c1018] rounded-xl border border-[#182233]">
              Select an order from the queue to view its exact bin allocation and pick route.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
