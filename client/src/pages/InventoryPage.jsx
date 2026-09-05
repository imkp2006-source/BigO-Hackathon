import React, { useState, useEffect } from 'react';
import { useSystem } from '../context/SystemContext.jsx';
import { api } from '../lib/api.js';
import {
  Boxes,
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  MapPin,
  Clock,
  History,
  ShieldAlert,
  ChevronRight,
  ExternalLink,
  Sparkles
} from 'lucide-react';

export default function InventoryPage({ initialSearchSku }) {
  const { inspectBin } = useSystem();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(initialSearchSku || '');
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All');
  const [weight, setWeight] = useState('All');

  // Selected product for detailed modal inspection
  const [selectedSkuDetail, setSelectedSkuDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = {
        search: search.trim(),
        category: category !== 'All' ? category : '',
        status: status !== 'All' ? status : '',
        weight: weight !== 'All' ? weight : '',
        limit: 50
      };
      const res = await api.getInventory(params);
      if (res.success) {
        setProducts(res.data);
      }
    } catch (e) {
      console.error('Inventory load failure:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [category, status, weight]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInventory();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // If initialSearchSku is provided from demo bar
  useEffect(() => {
    if (initialSearchSku) {
      setSearch(initialSearchSku);
      handleInspectProduct(initialSearchSku);
    }
  }, [initialSearchSku]);

  const handleInspectProduct = async (sku) => {
    setDetailLoading(true);
    try {
      const res = await api.getProductBySku(sku);
      if (res.success) {
        setSelectedSkuDetail(res.data);
      }
    } catch (e) {
      console.error('Detail fetch failed:', e);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Page Title & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#182130] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black tracking-wider text-white font-mono uppercase">
              Inventory Master Catalog
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono font-bold">
              PRODUCT-TO-BIN MAPPING
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            One SKU can reside in multiple bins with distinct batch timestamps & FIFO rankings
          </p>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search SKU, name, or location..."
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#0f1420] border border-[#1e2738] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-[#0c1018] border border-[#182130] text-xs font-mono">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Filter size={14} className="text-cyan-400" />
          <span>Filters:</span>
        </div>

        {/* Category Filter */}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-8 px-2.5 rounded bg-[#111724] border border-[#1e2a3f] text-slate-200 text-xs focus:border-cyan-400"
        >
          <option value="All">All Categories</option>
          <option value="Electronics">Electronics</option>
          <option value="Peripherals">Peripherals</option>
          <option value="Hardware & Tools">Hardware & Tools</option>
          <option value="Apparel & Safety">Apparel & Safety</option>
          <option value="Packaging & Office">Packaging & Office</option>
        </select>

        {/* Status Filter */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-8 px-2.5 rounded bg-[#111724] border border-[#1e2a3f] text-slate-200 text-xs focus:border-cyan-400"
        >
          <option value="All">All Stock Statuses</option>
          <option value="in_stock">In Stock (Healthy)</option>
          <option value="low_stock">Low Stock (≤ Min)</option>
          <option value="out_of_stock">Out of Stock (0)</option>
        </select>

        {/* Weight Filter */}
        <select
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="h-8 px-2.5 rounded bg-[#111724] border border-[#1e2a3f] text-slate-200 text-xs focus:border-cyan-400"
        >
          <option value="All">All Weights</option>
          <option value="light">Light (&lt; 1kg)</option>
          <option value="medium">Medium (1-4kg)</option>
          <option value="heavy">Heavy (&gt; 4kg)</option>
        </select>

        <span className="ml-auto text-slate-400 text-[11px]">
          Showing {products.length} SKU records
        </span>
      </div>

      {/* Technical Inventory Table */}
      <div className="rounded-xl bg-[#0c1018] border border-[#182130] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#101522] border-b border-[#182335] text-slate-400 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3">SKU</th>
                <th className="py-3 px-3">Product Name</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Location(s) & Bins</th>
                <th className="py-3 px-3 text-right">Total Qty</th>
                <th className="py-3 px-3 text-right">Reserved</th>
                <th className="py-3 px-3 text-right text-emerald-400">Available</th>
                <th className="py-3 px-3">Weight</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#151d2c]">
              {products.map((p) => {
                const locations = (p.location_codes || '').split(',').filter(Boolean);
                const isLow = p.total_available > 0 && p.total_available <= p.min_stock;
                const isOut = p.total_available === 0;

                return (
                  <tr
                    key={p.id}
                    className="hover:bg-[#111724] transition-colors cursor-pointer group"
                    onClick={() => handleInspectProduct(p.sku)}
                  >
                    {/* SKU */}
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                        {p.sku}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-white group-hover:text-cyan-300 transition-colors">
                        {p.name}
                      </div>
                      {p.is_fragile === 1 && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-500/30 mt-0.5 inline-block">
                          FRAGILE
                        </span>
                      )}
                    </td>

                    {/* Category */}
                    <td className="py-2.5 px-3 text-slate-400">{p.category}</td>

                    {/* Locations */}
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1">
                        {locations.slice(0, 3).map((loc) => (
                          <button
                            key={loc}
                            onClick={(e) => {
                              e.stopPropagation();
                              inspectBin(loc);
                            }}
                            className="text-[10px] px-1.5 py-0.2 rounded bg-[#162030] text-slate-300 hover:text-cyan-300 border border-[#233148] transition-colors"
                          >
                            {loc}
                          </button>
                        ))}
                        {locations.length > 3 && (
                          <span className="text-[9px] text-slate-500 self-center">
                            +{locations.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Total Qty */}
                    <td className="py-2.5 px-3 text-right font-bold text-slate-200">
                      {p.total_quantity}
                    </td>

                    {/* Reserved */}
                    <td className="py-2.5 px-3 text-right text-amber-400">
                      {p.total_reserved}
                    </td>

                    {/* Available */}
                    <td className="py-2.5 px-3 text-right font-black text-emerald-400">
                      {p.total_available}
                    </td>

                    {/* Weight */}
                    <td className="py-2.5 px-3 text-slate-400 capitalize">
                      {p.weight_category} ({p.weight_kg}kg)
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                          isOut
                            ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                            : isLow
                            ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {isOut ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'HEALTHY'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInspectProduct(p.sku);
                        }}
                        className="px-2 py-1 rounded bg-[#162030] text-cyan-300 hover:bg-cyan-500/20 text-[10px] font-bold border border-cyan-500/30 transition-colors"
                      >
                        Inspect →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Detail Modal / Side Panel */}
      {selectedSkuDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-3xl rounded-xl bg-[#0c1018] border border-cyan-500/40 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 bg-[#111724] border-b border-[#1b2639] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/40">
                    {selectedSkuDetail.product.sku}
                  </span>
                  <h2 className="text-base font-bold text-white font-mono truncate">
                    {selectedSkuDetail.product.name}
                  </h2>
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-1">
                  Category: {selectedSkuDetail.product.category} • Weight: {selectedSkuDetail.product.weight_kg}kg ({selectedSkuDetail.product.weight_category}) • Minimum Safety Stock: {selectedSkuDetail.product.min_stock} units
                </div>
              </div>

              <button
                onClick={() => setSelectedSkuDetail(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2436]"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-4 font-mono text-xs flex-1">
              {/* Aggregated Totals */}
              <div className="grid grid-cols-3 gap-3 text-center p-3 rounded-lg bg-[#111725] border border-[#1b273b]">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase">Total In WH1</span>
                  <div className="text-xl font-bold text-white mt-0.5">{selectedSkuDetail.total_quantity}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase">Reserved Stock</span>
                  <div className="text-xl font-bold text-amber-400 mt-0.5">{selectedSkuDetail.total_reserved}</div>
                </div>
                <div>
                  <span className="text-cyan-400 text-[10px] uppercase font-bold">Total Available</span>
                  <div className="text-xl font-black text-emerald-400 mt-0.5">{selectedSkuDetail.total_available}</div>
                </div>
              </div>

              {/* Multi-Location Mapping with FIFO Ranking (CASE 1 & CASE 2 showcase) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-200 uppercase text-xs">
                    Multi-Bin Physical Allocation ({selectedSkuDetail.locations.length} Locations)
                  </span>
                  <span className="text-[10px] text-cyan-400 font-bold">
                    FIFO BATCH RANKING
                  </span>
                </div>

                <div className="space-y-2">
                  {selectedSkuDetail.locations.map((loc, idx) => (
                    <div
                      key={loc.inventory_id}
                      className={`p-3 rounded-lg border ${
                        loc.is_fifo_oldest
                          ? 'bg-emerald-950/20 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                          : 'bg-[#101521] border-[#1a2538]'
                      } flex items-center justify-between gap-4`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedSkuDetail(null);
                              inspectBin(loc.location_code);
                            }}
                            className="font-bold font-mono text-sm text-cyan-300 hover:underline"
                          >
                            📍 {loc.location_code}
                          </button>
                          {loc.is_fifo_oldest && (
                            <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/50 text-emerald-300 font-bold">
                              ✓ OLDEST — PICK FIRST (FIFO)
                            </span>
                          )}
                          {!loc.is_fifo_oldest && (
                            <span className="text-[9px] px-2 py-0.5 rounded bg-[#182133] text-slate-400">
                              NEWER BATCH
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-3">
                          <span>Batch: <strong>{loc.batch_number}</strong></span>
                          <span>Received: {new Date(loc.received_at).toLocaleDateString()}</span>
                          <span>Row Traffic: <strong className="text-white capitalize">{loc.congestion_level}</strong></span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-base font-black text-emerald-400">
                          {loc.available_quantity} <span className="text-[10px] text-slate-400 font-normal">avail</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Total: {loc.quantity} | Res: {loc.reserved_quantity}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Last Known Physical Location (CASE 8 showcase) */}
              {selectedSkuDetail.last_known_location && (
                <div className="p-3.5 rounded-lg bg-[#0e1420] border border-cyan-500/30">
                  <div className="text-xs font-bold text-cyan-400 uppercase flex items-center gap-1.5 mb-1">
                    <MapPin size={13} />
                    <span>Last Known Physical Location</span>
                  </div>
                  <div className="text-sm font-bold text-white font-mono">
                    📍 {selectedSkuDetail.last_known_location.location_code}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                    <span>Movement: {selectedSkuDetail.last_known_location.movement_type?.toUpperCase()}</span>
                    <span>By: {selectedSkuDetail.last_known_location.worker_name}</span>
                    <span>{new Date(selectedSkuDetail.last_known_location.updated_at).toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Historical Movement Ledger for this SKU */}
              <div>
                <div className="text-xs font-bold text-slate-200 uppercase mb-2 flex items-center gap-1.5">
                  <History size={13} className="text-cyan-400" />
                  <span>Movement Audit History ({selectedSkuDetail.movement_history?.length || 0} events)</span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {selectedSkuDetail.movement_history?.map((m) => (
                    <div
                      key={m.id}
                      className="p-2 rounded bg-[#0f1420] border border-[#172132] text-[11px] font-mono flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-cyan-300 uppercase mr-2">
                          {m.movement_type}
                        </span>
                        <span className="text-slate-300">
                          {m.quantity} units ({m.from_location_code} → {m.to_location_code})
                        </span>
                        <div className="text-[9px] text-slate-400">{m.reason}</div>
                      </div>
                      <div className="text-right text-[10px] text-slate-400">
                        <div>{m.worker_name}</div>
                        <div>{new Date(m.timestamp).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#111724] border-t border-[#1b2639] flex justify-end">
              <button
                onClick={() => setSelectedSkuDetail(null)}
                className="px-4 py-2 rounded-lg bg-cyan-500 text-black font-bold text-xs font-mono hover:bg-cyan-400"
              >
                Close SKU Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
