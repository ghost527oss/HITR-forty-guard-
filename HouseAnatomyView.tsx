/**
 * HITR - 100 House Cooling Architectural Designs
 * Interactive House Anatomy & Bioclimatic Thermal Cutaway Explorer
 */

import React, { useState } from 'react';
import { ALL_COOLING_DESIGNS } from '../data/designs';
import { CoolingDesign, HouseZone } from '../types';
import {
  Compass,
  ThermometerSnowflake,
  Layers,
  ArrowRight,
  ShieldAlert,
  Wind,
  Droplets,
  Sun,
  Home,
  Trees,
} from 'lucide-react';

interface HouseAnatomyViewProps {
  onSelectDesign: (design: CoolingDesign) => void;
  onFilterZone: (zone: string) => void;
}

interface HotspotZone {
  id: string;
  name: string;
  houseZone: HouseZone;
  x: number; // percentage
  y: number; // percentage
  designCount: number;
  heatRiskDescription: string;
  coolingPrinciple: string;
  icon: any;
  accentColor: string;
  keyDesignIds: number[];
}

const ZONES: HotspotZone[] = [
  {
    id: 'roof-attic',
    name: 'Roof & Attic Superstructure',
    houseZone: 'Roof & Attic',
    x: 50,
    y: 18,
    designCount: 12,
    heatRiskDescription: 'Receives up to 70% of total summer solar radiant heat load; unvented attics reach 65°C+ (150°F).',
    coolingPrinciple: 'High-albedo reflective coatings, continuous ridge/soffit convection, and radiant foil barriers.',
    icon: Home,
    accentColor: 'from-orange-500 to-amber-500',
    keyDesignIds: [11, 12, 14, 15, 16, 18, 100],
  },
  {
    id: 'windows-glazing',
    name: 'Windows, Glazing & Shading',
    houseZone: 'Windows & Glazing',
    x: 75,
    y: 48,
    designCount: 17,
    heatRiskDescription: 'Unshaded single or double clear glass creates immediate indoor greenhouse solar heat entrapment.',
    coolingPrinciple: 'External louvered shutters, Low-E spectral coatings, light shelves, and argon gas buffers.',
    icon: Sun,
    accentColor: 'from-sky-500 to-cyan-500',
    keyDesignIds: [21, 24, 25, 27, 28, 30, 94],
  },
  {
    id: 'walls-envelope',
    name: 'Exterior Walls & Thermal Mass',
    houseZone: 'Walls & Envelope',
    x: 28,
    y: 52,
    designCount: 15,
    heatRiskDescription: 'Low-mass insulated siding transmits intense afternoon solar heat directly into interior drywall by 4 PM.',
    coolingPrinciple: 'Ventilated rainscreen facades, rammed earth thermal lag, hempcrete, and phase-change materials.',
    icon: Layers,
    accentColor: 'from-emerald-500 to-teal-500',
    keyDesignIds: [36, 38, 41, 42, 44, 46, 70],
  },
  {
    id: 'ventilation-core',
    name: 'Ventilation & Convective Core',
    houseZone: 'Ventilation & Airflow',
    x: 50,
    y: 45,
    designCount: 10,
    heatRiskDescription: 'Stagnant indoor air traps human metabolic heat, cooking moisture, and stratified ceiling heat.',
    coolingPrinciple: 'Stack buoyancy chimneys, night-purge cross flushing, whole-house fans, and HVLS laminar airfoils.',
    icon: Wind,
    accentColor: 'from-cyan-500 to-blue-500',
    keyDesignIds: [5, 6, 7, 8, 71, 72, 73],
  },
  {
    id: 'courtyard-water',
    name: 'Traditional Courtyard & Water',
    houseZone: 'Traditional & Courtyard',
    x: 42,
    y: 68,
    designCount: 12,
    heatRiskDescription: 'Direct exposure to desert microclimates without evaporative humidity regulation or self-shading.',
    coolingPrinciple: 'Microclimate cold air pooling, weeping stone water walls, reflecting pools, and badgir windcatchers.',
    icon: Droplets,
    accentColor: 'from-blue-500 to-indigo-500',
    keyDesignIds: [49, 50, 51, 54, 58, 60, 61],
  },
  {
    id: 'landscape-perimeter',
    name: 'Landscape & Microclimate Site',
    houseZone: 'Landscape & Site',
    x: 88,
    y: 78,
    designCount: 8,
    heatRiskDescription: 'Impermeable asphalt and concrete hardscaping creates a blistering localized urban heat island.',
    coolingPrinciple: 'Deciduous shade canopies, evapotranspirative ground covers, vine pergolas, and permeable paving.',
    icon: Trees,
    accentColor: 'from-green-500 to-emerald-500',
    keyDesignIds: [65, 66, 67, 68, 69, 89],
  },
  {
    id: 'subterranean-foundation',
    name: 'Subterranean & Earth Sink',
    houseZone: 'Subterranean & Foundation',
    x: 50,
    y: 90,
    designCount: 8,
    heatRiskDescription: 'Uninsulated ground slabs conduct high surface ambient heat into the structure.',
    coolingPrinciple: 'Earth tubes, ground-source geothermal heat pumps, crawlspace air scavenging, and earth berms.',
    icon: Compass,
    accentColor: 'from-amber-600 to-stone-600',
    keyDesignIds: [10, 55, 56, 64, 75, 77, 92],
  },
];

export const HouseAnatomyView: React.FC<HouseAnatomyViewProps> = ({
  onSelectDesign,
  onFilterZone,
}) => {
  const [selectedZone, setSelectedZone] = useState<HotspotZone>(ZONES[0]);

  const activeDesigns = ALL_COOLING_DESIGNS.filter(
    (d) => selectedZone.keyDesignIds.includes(d.id) || d.houseZone === selectedZone.houseZone
  );

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-cyan-400 font-bold text-xs uppercase tracking-wider mb-1">
              <Compass className="w-4 h-4" />
              <span>Interactive Bioclimatic House Anatomy</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Thermal Flow & Structural Hotspots
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Explore how heat penetrates and accumulates across key residential building zones, and discover proven architectural interventions to dissipate it.
            </p>
          </div>

          <button
            id="view-all-zone-designs-btn"
            onClick={() => onFilterZone(selectedZone.houseZone)}
            className="self-start md:self-auto flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25 text-xs font-bold transition-all"
          >
            <span>View All {selectedZone.houseZone} Designs</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Interactive Cutaway Model + Zone Info Sidebar */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left: Visual Interactive Thermal Cutaway House Diagram (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg relative flex flex-col justify-between overflow-hidden min-h-[460px]">
          {/* Ambient Glows */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Sun Vector Indicator */}
          <div className="flex items-center justify-between z-10 mb-4">
            <div className="flex items-center space-x-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg text-amber-300 text-xs font-semibold">
              <Sun className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Solar Zenith Peak (12:00 – 15:00)</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Click any hotspot node below</span>
          </div>

          {/* Architectural Cutaway Schematic Canvas */}
          <div className="relative w-full h-[320px] sm:h-[360px] bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex items-center justify-center overflow-hidden">
            {/* SVG House Outline & Airflow Paths */}
            <svg
              className="absolute inset-0 w-full h-full opacity-60 pointer-events-none"
              viewBox="0 0 600 400"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Ground line */}
              <line x1="20" y1="330" x2="580" y2="330" stroke="#334155" strokeWidth="3" strokeDasharray="6 4" />

              {/* Subterranean Earth boundary */}
              <rect x="20" y="332" width="560" height="60" fill="#0f172a" opacity="0.8" />
              <text x="40" y="370" fill="#475569" fontSize="12" fontFamily="monospace">EARTH HEAT SINK (14°C)</text>

              {/* House Roof Triangle */}
              <polygon points="120,160 300,60 480,160" fill="#1e293b" stroke="#475569" strokeWidth="2.5" />

              {/* Attic floor */}
              <line x1="130" y1="160" x2="470" y2="160" stroke="#334155" strokeWidth="2" />

              {/* House Main Body */}
              <rect x="130" y="160" width="340" height="170" fill="#0f172a" stroke="#475569" strokeWidth="2.5" />

              {/* Second story divider */}
              <line x1="130" y1="245" x2="470" y2="245" stroke="#334155" strokeWidth="1.5" strokeDasharray="4 4" />

              {/* Window Left */}
              <rect x="160" y="180" width="50" height="45" fill="#0369a1" fillOpacity="0.2" stroke="#38bdf8" strokeWidth="1.5" />
              {/* Window Right */}
              <rect x="390" y="180" width="50" height="45" fill="#0369a1" fillOpacity="0.2" stroke="#38bdf8" strokeWidth="1.5" />

              {/* Ground Floor Patio Doors */}
              <rect x="370" y="260" width="70" height="70" fill="#0369a1" fillOpacity="0.15" stroke="#38bdf8" strokeWidth="1.5" />

              {/* Thermal Stack Arrows */}
              <path
                d="M 300 290 Q 300 210 300 90"
                fill="none"
                stroke="#f97316"
                strokeWidth="2.5"
                strokeDasharray="5 5"
                className="animate-pulse"
              />
              <path
                d="M 295 95 L 300 80 L 305 95"
                fill="#f97316"
              />

              {/* Cross Ventilation Breeze Line */}
              <path
                d="M 40 280 Q 200 270 560 270"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2"
                strokeDasharray="8 4"
              />
            </svg>

            {/* Interactive Hotspot Nodes */}
            {ZONES.map((zone) => {
              const isSelected = selectedZone.id === zone.id;
              const Icon = zone.icon;
              return (
                <button
                  key={zone.id}
                  id={`hotspot-${zone.id}`}
                  onClick={() => setSelectedZone(zone)}
                  style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 group z-20 flex items-center space-x-1.5 px-3 py-1.5 rounded-full border transition-all duration-200 ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 font-extrabold border-white shadow-xl shadow-cyan-500/50 scale-110'
                      : 'bg-slate-900/90 text-slate-200 hover:text-white border-slate-700 hover:border-cyan-400 shadow-md hover:scale-105'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-950' : 'text-cyan-400'}`} />
                  <span className="text-xs tracking-tight whitespace-nowrap">{zone.name.split(' ')[0]}</span>
                  <span
                    className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-mono ${
                      isSelected ? 'bg-slate-950 text-cyan-300' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {zone.designCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Zone Selector Strip */}
          <div className="mt-4 flex flex-wrap gap-1.5 z-10">
            {ZONES.map((zone) => (
              <button
                key={zone.id}
                id={`zone-tab-${zone.id}`}
                onClick={() => setSelectedZone(zone)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                  selectedZone.id === zone.id
                    ? 'bg-slate-800 border-cyan-500/50 text-cyan-300'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {zone.name}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Selected Zone Thermal Analysis & Blueprint Recommendations (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            {/* Zone Title & Badge */}
            <div className="flex items-center justify-between gap-2">
              <span className="px-2.5 py-1 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-xs font-bold font-mono">
                {selectedZone.houseZone}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {selectedZone.designCount} Curated Techniques
              </span>
            </div>

            <h3 className="text-xl font-bold text-white">
              {selectedZone.name}
            </h3>

            {/* Thermal Influx Vulnerability */}
            <div className="bg-rose-950/20 border border-rose-500/20 p-3.5 rounded-xl space-y-1">
              <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                Thermal Vulnerability Diagnosis
              </span>
              <p className="text-xs text-rose-100/90 leading-relaxed">
                {selectedZone.heatRiskDescription}
              </p>
            </div>

            {/* Core Bioclimatic Strategy */}
            <div className="bg-cyan-950/20 border border-cyan-500/20 p-3.5 rounded-xl space-y-1">
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                <ThermometerSnowflake className="w-3.5 h-3.5" />
                Bioclimatic Engineering Solution
              </span>
              <p className="text-xs text-cyan-100/90 leading-relaxed">
                {selectedZone.coolingPrinciple}
              </p>
            </div>

            {/* Top Recommended Designs in this Zone */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Top Architectural Blueprints for {selectedZone.name}
              </h4>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {activeDesigns.slice(0, 5).map((design) => (
                  <div
                    key={design.id}
                    onClick={() => onSelectDesign(design)}
                    className="group/item flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all"
                  >
                    <div className="flex items-center space-x-2.5 truncate pr-2">
                      <span className="w-6 h-6 rounded-md bg-slate-800 text-cyan-400 font-mono font-bold text-[11px] flex items-center justify-center shrink-0">
                        #{design.id}
                      </span>
                      <div className="truncate">
                        <h5 className="text-xs font-bold text-slate-200 group-hover/item:text-cyan-300 truncate">
                          {design.name}
                        </h5>
                        <p className="text-[11px] text-slate-400 truncate">
                          {design.tempDropEstimate.split('/')[0]} • {design.costLevel}
                        </p>
                      </div>
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover/item:text-cyan-400 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action to see full library list */}
          <button
            id="browse-zone-catalogue-btn"
            onClick={() => onFilterZone(selectedZone.houseZone)}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors flex items-center justify-center space-x-2"
          >
            <span>Filter Catalogue by {selectedZone.houseZone}</span>
            <ArrowRight className="w-4 h-4 text-cyan-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
