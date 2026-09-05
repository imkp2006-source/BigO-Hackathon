import React from 'react';

export default function KpiCard({ title, value, subtext, icon: Icon, trend, color = 'cyan', glow = false, onClick }) {
  const colorMap = {
    cyan: {
      border: 'border-cyan-500/30',
      hoverBorder: 'hover:border-cyan-400',
      text: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      glow: 'glow-cyan-subtle'
    },
    emerald: {
      border: 'border-emerald-500/30',
      hoverBorder: 'hover:border-emerald-400',
      text: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      glow: 'glow-green'
    },
    amber: {
      border: 'border-amber-500/30',
      hoverBorder: 'hover:border-amber-400',
      text: 'text-amber-400',
      bg: 'bg-amber-500/10',
      glow: 'glow-amber'
    },
    rose: {
      border: 'border-rose-500/30',
      hoverBorder: 'hover:border-rose-400',
      text: 'text-rose-400',
      bg: 'bg-rose-500/10',
      glow: 'glow-red'
    }
  };

  const c = colorMap[color] || colorMap.cyan;

  return (
    <div
      onClick={onClick}
      className={`relative p-3.5 rounded-lg bg-[#0e121a] border ${c.border} ${c.hoverBorder} transition-all duration-200 ${
        glow ? c.glow : ''
      } ${onClick ? 'cursor-pointer hover:bg-[#121722]' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono tracking-wider text-slate-400 uppercase truncate">
          {title}
        </span>
        {Icon && (
          <div className={`p-1.5 rounded-md ${c.bg} ${c.text}`}>
            <Icon size={16} />
          </div>
        )}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-black tracking-tight text-white font-mono">
          {value !== undefined && value !== null ? value : '--'}
        </span>
        {trend && (
          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[#161d2b] text-slate-300">
            {trend}
          </span>
        )}
      </div>

      {subtext && (
        <div className="mt-1 text-[10px] text-slate-400 font-mono truncate">
          {subtext}
        </div>
      )}
    </div>
  );
}
