import React from 'react';
import { useSystem } from '../../context/SystemContext.jsx';
import {
  X,
  MapPin,
  Boxes,
  ArrowLeftRight,
  AlertOctagon,
  Calendar,
  History,
  ShieldAlert,
  Flame,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

export default function BinDetailsDrawer({ onOpenTransfer, onOpenDiscrepancy, onOpenPutaway }) {
  const { selectedBin, drawerOpen, setDrawerOpen } = useSystem();

  if (!drawerOpen || !selectedBin) return null;

  const bin = selectedBin.bin;
  const inventory = selectedBin.inventory || [];
  const movements = selectedBin.recent_movements || [];

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[440px] bg-[#0c1018] border-l border-cyan-500/30 shadow-2xl z-50 flex flex-col animate-slideLeft">
      {/* Drawer Header */}
      <div className="p-4 border-b border-[#1b2537] flex items-center justify-between bg-[#101520]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
            <MapPin size={18} />
          </div>
          <div>
            <div className="text-base font-black font-mono tracking-wider text-white">
              {bin.location_code}
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Warehouse {bin.warehouse_code} • Row {bin.row_code} • Bin {bin.bin_code}
            </div>
          </div>
        </div>

        <button
          onClick={() => setDrawerOpen(false)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#192233] transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Status & Congestion Banner */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-lg bg-[#111622] border border-[#1b2536]">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Bin Status</span>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-white font-mono">
              <span className={`h-2 w-2 rounded-full ${bin.status === 'discrepancy' ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
              {bin.status?.toUpperCase()}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#111622] border border-[#1b2536]">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Aisle Traffic</span>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-bold font-mono">
              {bin.congestion_level === 'high' ? (
                <span className="text-rose-400 flex items-center gap-1">
                  <Flame size={13} /> Hotspot
                </span>
              ) : bin.congestion_level === 'moderate' ? (
                <span className="text-amber-400">Moderate</span>
              ) : (
                <span className="text-emerald-400">Clear</span>
              )}
            </div>
          </div>
        </div>

        {/* Aggregate Quantities */}
        <div className="p-3 rounded-lg bg-[#121825] border border-cyan-500/20 grid grid-cols-3 gap-2 text-center font-mono">
          <div>
            <div className="text-[10px] text-slate-400 uppercase">Total Stock</div>
            <div className="text-lg font-bold text-white mt-0.5">{selectedBin.total_quantity}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase">Reserved</div>
            <div className="text-lg font-bold text-amber-400 mt-0.5">
              {inventory.reduce((sum, it) => sum + it.reserved_quantity, 0)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-cyan-400 uppercase font-semibold">Available</div>
            <div className="text-lg font-black text-emerald-400 mt-0.5">{selectedBin.total_available}</div>
          </div>
        </div>

        {/* Stored SKUs with FIFO Batches */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wide font-mono">
              Stored Inventory ({inventory.length} SKUs)
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Authoritative DB Records</span>
          </div>

          {inventory.length > 0 ? (
            <div className="space-y-2">
              {inventory.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg bg-[#101521] border border-[#1a2538] hover:border-cyan-500/30 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">{item.product_name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-bold">
                          {item.sku}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          Batch: {item.batch_number}
                        </span>
                      </div>
                    </div>

                    {item.is_oldest_in_bin && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-mono font-bold">
                        FIFO OLDEST
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-[#172132] flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">
                      In Stock: <strong className="text-white">{item.quantity}</strong>
                    </span>
                    <span className="text-slate-400">
                      Reserved: <strong className="text-amber-400">{item.reserved_quantity}</strong>
                    </span>
                    <span className="text-slate-400">
                      Available: <strong className="text-emerald-400">{item.available_quantity}</strong>
                    </span>
                  </div>

                  <div className="mt-1 flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                    <Calendar size={11} />
                    <span>Received: {new Date(item.received_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-[#10141d] border border-dashed border-[#1a2334] text-center text-xs text-slate-500 font-mono">
              BIN CURRENTLY EMPTY
            </div>
          )}
        </div>

        {/* Quick Action Buttons */}
        <div className="pt-2 border-t border-[#1b2537] grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setDrawerOpen(false);
              onOpenTransfer?.(bin.location_code);
            }}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#131926] hover:bg-[#182133] border border-[#1f2b3e] text-slate-200 text-xs font-medium transition-colors"
          >
            <ArrowLeftRight size={14} className="text-cyan-400" />
            <span>Transfer Out</span>
          </button>

          <button
            onClick={() => {
              setDrawerOpen(false);
              onOpenDiscrepancy?.(bin.location_code);
            }}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-rose-950/30 hover:bg-rose-900/40 border border-rose-500/30 text-rose-300 text-xs font-medium transition-colors"
          >
            <AlertOctagon size={14} className="text-rose-400" />
            <span>Report Variance</span>
          </button>
        </div>

        {/* Recent Location Audit Movements */}
        <div>
          <div className="text-xs font-bold text-slate-200 uppercase tracking-wide font-mono mb-2 flex items-center gap-1.5">
            <History size={14} className="text-cyan-400" />
            <span>Recent Movements Audit</span>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {movements.length > 0 ? (
              movements.map((m) => (
                <div key={m.id} className="p-2 rounded bg-[#0f141f] border border-[#172132] text-[11px] font-mono">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="font-bold text-white">{m.movement_type.toUpperCase()}</span>
                    <span className="text-cyan-400 font-bold">{m.quantity} units</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {m.from_location_code} → {m.to_location_code}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5 flex justify-between">
                    <span>By: {m.worker_name}</span>
                    <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-[10px] font-mono text-slate-400 text-center py-2">
                No recent movements recorded for this bin.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
