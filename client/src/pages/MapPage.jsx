import React from 'react';
import { useSystem } from '../context/SystemContext.jsx';
import WarehouseMap from '../components/map/WarehouseMap.jsx';
import {
  MapPin,
  Flame,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';

export default function MapPage() {
  const { activeRoute, inspectBin } = useSystem();

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#182130] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black tracking-wider text-white font-mono uppercase">
              Digital Warehouse 2D Map
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono font-bold">
              WH1 CENTRAL
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Strict PS-3 Location Hierarchy: Warehouse (WH1) → Rows (R01-R04) → Bins (B01-B06). Click any bin to inspect live contents.
          </p>
        </div>
      </div>

      {/* Main Map */}
      <WarehouseMap activeRoute={activeRoute} onSelectBin={(bin) => inspectBin(bin.location_code)} />
    </div>
  );
}
