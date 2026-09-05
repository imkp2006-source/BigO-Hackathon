import React, { useState, useEffect, useRef } from 'react';
import { useSystem } from '../../context/SystemContext.jsx';
import { api } from '../../lib/api.js';
import {
  Search,
  Activity,
  Radio,
  Bell,
  User,
  ChevronDown,
  Sparkles,
  Smartphone,
  Monitor,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink
} from 'lucide-react';

export default function TopHeader({ onOpenOrderModal }) {
  const {
    systemOnline,
    realtimeConnected,
    currentRole,
    setCurrentRole,
    roles,
    viewMode,
    setViewMode,
    analytics,
    setActivePage,
    inspectBin
  } = useSystem();

  // Search input state & live results
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);

  // Role dropdown & Alert dropdown
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [alertsMenuOpen, setAlertsMenuOpen] = useState(false);

  const searchRef = useRef(null);

  // Fast debounced search effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.search(searchQuery.trim());
        if (res.success) {
          setSearchResults(res.data);
          setSearchDropdownOpen(true);
        }
      } catch (e) {
        console.error('Search failed:', e);
      } finally {
        setSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalAlerts = (analytics?.alerts || []).length;

  return (
    <header className="h-14 border-b border-[#1a2232] bg-[#0c1017] px-4 flex items-center justify-between gap-4 z-20 shrink-0">
      {/* Left: Global Search with Instant Dropdown */}
      <div className="relative flex-1 max-w-xl" ref={searchRef}>
        <div className="relative flex items-center">
          <Search size={16} className="absolute left-3 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults && setSearchDropdownOpen(true)}
            placeholder="Search SKU (SKU-103), product name, or location (WH1-R02-B05)..."
            className="w-full h-9 pl-9 pr-8 rounded-lg bg-[#111622] border border-[#1e2738] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults(null);
                setSearchDropdownOpen(false);
              }}
              className="absolute right-2.5 text-slate-400 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Live Search Results Dropdown */}
        {searchDropdownOpen && searchResults && (
          <div className="absolute top-11 left-0 right-0 max-h-96 overflow-y-auto rounded-lg bg-[#0e131d] border border-cyan-500/30 shadow-2xl shadow-black/80 z-50 p-2">
            <div className="flex items-center justify-between px-2 py-1 text-[10px] font-mono text-cyan-400 uppercase tracking-wider border-b border-[#1a2436]">
              <span>PS-3 Instant Search Results</span>
              <span>{searchResults.total_matches} matches</span>
            </div>

            {/* Product matches */}
            {searchResults.product_results?.length > 0 && (
              <div className="mt-2">
                <div className="text-[10px] font-semibold text-slate-400 px-2 uppercase tracking-wide">Products & SKUs</div>
                <div className="space-y-1 mt-1">
                  {searchResults.product_results.map((item) => (
                    <div
                      key={item.product.id}
                      onClick={() => {
                        setSearchDropdownOpen(false);
                        setActivePage('inventory');
                      }}
                      className="p-2 rounded bg-[#131926] hover:bg-[#182133] border border-transparent hover:border-cyan-500/30 cursor-pointer transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">{item.product.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                          {item.product.sku}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                        <span>Total Available: <strong className="text-emerald-400">{item.total_available}</strong></span>
                        <span>Total Qty: {item.total_quantity}</span>
                      </div>

                      {/* Locations breakdown */}
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {item.locations.map((loc) => (
                          <button
                            key={loc.location_code}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSearchDropdownOpen(false);
                              inspectBin(loc.location_code);
                            }}
                            className={`text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
                              loc.is_fifo_oldest
                                ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
                                : 'bg-[#1a2233] text-slate-300 hover:text-cyan-300'
                            }`}
                          >
                            <span>{loc.location_code}</span>
                            <span className="opacity-75">({loc.available_quantity})</span>
                            {loc.is_fifo_oldest && (
                              <span className="text-[8px] bg-emerald-500/30 px-1 rounded text-emerald-300 font-bold">
                                FIFO
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Location matches */}
            {searchResults.location_results?.length > 0 && (
              <div className="mt-3">
                <div className="text-[10px] font-semibold text-slate-400 px-2 uppercase tracking-wide">Locations & Bins</div>
                <div className="space-y-1 mt-1">
                  {searchResults.location_results.map((loc) => (
                    <div
                      key={loc.location_code}
                      onClick={() => {
                        setSearchDropdownOpen(false);
                        inspectBin(loc.location_code);
                      }}
                      className="p-2 rounded bg-[#131926] hover:bg-[#182133] cursor-pointer border border-transparent hover:border-cyan-500/30 transition-all flex items-center justify-between"
                    >
                      <div>
                        <div className="font-mono text-xs text-cyan-300 font-bold">{loc.location_code}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Stored SKUs: {loc.items.length} | Available: {loc.total_available} units
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#1c2538] text-slate-300 font-mono">
                        Inspect Bin →
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchResults.total_matches === 0 && (
              <div className="py-6 text-center text-xs text-slate-500">
                NO MATCHING INVENTORY FOR "{searchResults.query}"
              </div>
            )}
          </div>
        )}
      </div>

      {/* Center/Right: System Status LEDs */}
      <div className="flex items-center gap-3">
        {/* System Online Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono">
          <span className="relative flex h-2 w-2">
            <span className="beacon-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-bold">SYSTEM ONLINE</span>
        </div>

        {/* Realtime Active Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono">
          <Radio size={12} className={realtimeConnected ? 'text-cyan-400 animate-pulse' : 'text-slate-500'} />
          <span className="font-bold">{realtimeConnected ? 'REALTIME ACTIVE' : 'STREAM CONNECTING'}</span>
        </div>

        {/* View Mode Toggle: Desktop vs Handheld Mobile */}
        <div className="flex items-center bg-[#111622] rounded-lg border border-[#1e2738] p-0.5">
          <button
            onClick={() => setViewMode('desktop')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              viewMode === 'desktop'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Desktop Warehouse Command Center"
          >
            <Monitor size={13} />
            <span className="hidden md:inline">Command</span>
          </button>
          <button
            onClick={() => setViewMode('mobile')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              viewMode === 'mobile'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Mobile Worker Handheld Assistant"
          >
            <Smartphone size={13} />
            <span className="hidden md:inline">Handheld</span>
          </button>
        </div>

        {/* Alerts Popover Button */}
        <div className="relative">
          <button
            onClick={() => setAlertsMenuOpen(!alertsMenuOpen)}
            className="relative p-2 rounded-lg bg-[#111622] border border-[#1e2738] text-slate-300 hover:border-cyan-500/30 hover:text-white transition-all"
            title="System Alerts"
          >
            <Bell size={16} />
            {totalAlerts > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-[0_0_8px_rgba(239,68,68,0.6)]">
                {totalAlerts}
              </span>
            )}
          </button>

          {/* Alerts Dropdown */}
          {alertsMenuOpen && (
            <div className="absolute right-0 top-11 w-80 rounded-lg bg-[#0e131d] border border-[#1e293b] shadow-2xl p-3 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-[#1b2434] text-xs font-semibold text-slate-200">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-400" />
                  Warehouse Alerts
                </span>
                <span className="text-[10px] font-mono text-slate-400">{totalAlerts} Active</span>
              </div>
              <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                {analytics?.alerts?.length > 0 ? (
                  analytics.alerts.map((a) => (
                    <div
                      key={a.id}
                      onClick={() => {
                        setAlertsMenuOpen(false);
                        setActivePage('alerts');
                      }}
                      className={`p-2 rounded text-xs cursor-pointer transition-colors border ${
                        a.severity === 'critical'
                          ? 'bg-rose-950/30 border-rose-500/30 text-rose-200 hover:bg-rose-950/50'
                          : 'bg-amber-950/20 border-amber-500/30 text-amber-200 hover:bg-amber-950/40'
                      }`}
                    >
                      <div className="font-semibold flex items-center justify-between">
                        <span>{a.title}</span>
                        <span className="text-[9px] font-mono uppercase opacity-75">{a.type}</span>
                      </div>
                      <div className="text-[11px] opacity-80 mt-0.5">{a.message}</div>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center text-xs text-slate-500">✓ ALL CLEAR — NO ACTIVE ALERTS</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Role Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#111622] border border-[#1e2738] hover:border-cyan-500/40 transition-all text-xs text-slate-200"
          >
            <div className="h-6 w-6 rounded-full bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold text-[10px]">
              {currentRole.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="text-left hidden md:block">
              <div className="font-semibold leading-none">{currentRole.name}</div>
              <div className="text-[9px] font-mono text-cyan-400/80 leading-tight">{currentRole.badge}</div>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {/* Role selection dropdown */}
          {roleMenuOpen && (
            <div className="absolute right-0 top-11 w-56 rounded-lg bg-[#0e131d] border border-[#1e293b] shadow-2xl p-1.5 z-50">
              <div className="px-2 py-1 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Switch Operational Role
              </div>
              <div className="space-y-1 mt-1">
                {roles.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setCurrentRole(r);
                      setRoleMenuOpen(false);
                      if (r.id === 'picker') {
                        setViewMode('mobile');
                      }
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left text-xs transition-colors ${
                      currentRole.id === r.id
                        ? 'bg-[#182133] text-cyan-300 font-semibold'
                        : 'text-slate-300 hover:bg-[#141b2a]'
                    }`}
                  >
                    <span>{r.name}</span>
                    <span className="text-[9px] font-mono text-slate-500">{r.badge}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
