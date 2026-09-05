import React from 'react';
import { useSystem } from '../../context/SystemContext.jsx';
import {
  LayoutDashboard,
  Map,
  Boxes,
  ShoppingCart,
  CheckSquare,
  ArrowLeftRight,
  History,
  RotateCcw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Smartphone
} from 'lucide-react';

export default function Sidebar({ collapsed, setCollapsed }) {
  const { activePage, setActivePage, currentRole, setViewMode, analytics } = useSystem();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'map', label: 'Warehouse Map', icon: Map, badge: '2D LIVE' },
    { id: 'inventory', label: 'Inventory', icon: Boxes, count: analytics?.kpis?.total_skus },
    { id: 'orders', label: 'Orders', icon: ShoppingCart, count: analytics?.kpis?.pending_orders, badgeColor: 'bg-cyan-500/20 text-cyan-400' },
    { id: 'picking', label: 'Picking', icon: CheckSquare, count: analytics?.kpis?.active_picking_tasks, badgeColor: 'bg-emerald-500/20 text-emerald-400' },
    { id: 'operations', label: 'Stock Operations', icon: ArrowLeftRight },
    { id: 'movements', label: 'Movements Log', icon: History },
    { id: 'returns', label: 'Returns / Staging', icon: RotateCcw, count: analytics?.kpis?.returns_pending },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle, count: (analytics?.kpis?.low_stock_count || 0) + (analytics?.kpis?.out_of_stock_count || 0), badgeColor: 'bg-rose-500/20 text-rose-400' },
  ];

  return (
    <aside
      className={`relative flex flex-col justify-between border-r border-[#1a2232] bg-[#0c1017] transition-all duration-300 z-30 ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Top Header / Branding */}
      <div>
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#1a2232]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 text-cyan-400 font-black tracking-wider text-base shadow-[0_0_12px_rgba(0,240,255,0.2)]">
              WH
            </div>
            {!collapsed && (
              <div className="leading-tight">
                <div className="font-bold tracking-wider text-white text-sm flex items-center gap-1.5">
                  LOGISTICS <span className="text-cyan-400">HUB</span>
                </div>
                <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 truncate">
                  Precision Picking
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded p-1 text-slate-400 hover:bg-[#151c2a] hover:text-white transition-colors"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* PS-3 Official Tagline / Hierarchy */}
        {!collapsed && (
          <div className="mx-3 mt-3 px-3 py-2 rounded bg-[#101520] border border-[#1a2538] text-[11px] text-slate-400">
            <div className="text-cyan-400 font-mono font-semibold text-[10px] tracking-wide uppercase">PS-3 Hierarchy</div>
            <div className="text-slate-300 font-mono text-[11px] mt-0.5">Warehouse → Row → Bin</div>
          </div>
        )}

        {/* Navigation items */}
        <nav className="mt-3 px-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 group relative ${
                  isActive
                    ? 'bg-[#141b27] text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,240,255,0.12)]'
                    : 'text-slate-400 hover:bg-[#111722] hover:text-slate-200 border border-transparent'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  size={18}
                  className={`shrink-0 transition-colors ${
                    isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                {!collapsed && (
                  <div className="flex flex-1 items-center justify-between truncate">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-mono font-bold">
                        {item.badge}
                      </span>
                    )}
                    {item.count !== undefined && !item.badge && (
                      <span
                        className={`text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded ${
                          item.badgeColor || 'bg-[#1a2332] text-slate-300'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </div>
                )}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r bg-cyan-400 shadow-[0_0_8px_#00f0ff]" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Handheld quick launcher & Role Info */}
      <div className="p-3 border-t border-[#1a2232] space-y-2">
        {/* Quick Launch Mobile Worker Handheld */}
        <button
          onClick={() => setViewMode('mobile')}
          className="w-full flex items-center justify-center gap-2 py-2 px-2.5 rounded-lg bg-gradient-to-r from-cyan-900/40 to-blue-900/40 border border-cyan-500/30 text-cyan-300 hover:border-cyan-400 text-xs font-semibold shadow-[0_0_10px_rgba(0,240,255,0.1)] transition-all"
        >
          <Smartphone size={16} className="text-cyan-400" />
          {!collapsed && <span>Worker Handheld Mode</span>}
        </button>

        {/* Current Active Role */}
        {!collapsed && (
          <div className="p-2.5 rounded-lg bg-[#10141d] border border-[#1a2334] text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-400">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span className="text-[10px] uppercase font-mono tracking-wider">Role Active</span>
            </div>
            <div className="font-semibold text-slate-200 mt-0.5">{currentRole.name}</div>
            <div className="text-[9px] font-mono text-cyan-400/80 mt-0.5">{currentRole.badge}</div>
          </div>
        )}
      </div>
    </aside>
  );
}
