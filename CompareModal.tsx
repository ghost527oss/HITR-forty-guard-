/**
 * HITR - 100 House Cooling Architectural Designs
 * Side-by-Side Blueprint Technical Comparison Modal
 */

import React from 'react';
import { ALL_COOLING_DESIGNS } from '../data/designs';
import { CoolingDesign } from '../types';
import {
  X,
  GitCompare,
  ThermometerSnowflake,
  Wrench,
  DollarSign,
  Layers,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Package,
  Trash2,
} from 'lucide-react';

interface CompareModalProps {
  comparingIds: number[];
  onClose: () => void;
  onRemoveFromCompare: (id: number) => void;
  onSelectDesign: (design: CoolingDesign) => void;
}

export const CompareModal: React.FC<CompareModalProps> = ({
  comparingIds,
  onClose,
  onRemoveFromCompare,
  onSelectDesign,
}) => {
  const designs = ALL_COOLING_DESIGNS.filter((d) => comparingIds.includes(d.id));

  if (comparingIds.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div
        id="compare-modal"
        className="relative w-full max-w-6xl bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden my-8 text-slate-100 flex flex-col max-h-[88vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center space-x-2">
            <GitCompare className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">
              Technical Comparison ({designs.length} of 4 Designs)
            </h2>
          </div>

          <button
            id="close-compare-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Side-by-Side Comparison Table */}
        <div className="p-5 overflow-x-auto overflow-y-auto space-y-6">
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${Math.max(2, designs.length)}, minmax(260px, 1fr))`,
            }}
          >
            {designs.map((design) => (
              <div
                key={design.id}
                className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4"
              >
                {/* Header Card info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono font-bold text-xs">
                      #{design.id}
                    </span>
                    <button
                      onClick={() => onRemoveFromCompare(design.id)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                      title="Remove from comparison"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3
                    onClick={() => {
                      onClose();
                      onSelectDesign(design);
                    }}
                    className="text-sm font-bold text-white hover:text-cyan-300 cursor-pointer line-clamp-2"
                  >
                    {design.name}
                  </h3>

                  <span className="inline-block text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {design.category}
                  </span>
                </div>

                {/* Key Metrics Comparison Grid */}
                <div className="space-y-3 text-xs">
                  {/* Temp Drop */}
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">
                      Temperature Drop
                    </span>
                    <div className="text-cyan-300 font-bold flex items-center gap-1">
                      <ThermometerSnowflake className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{design.tempDropEstimate}</span>
                    </div>
                  </div>

                  {/* Budget & Cost */}
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">
                      Budget & Range
                    </span>
                    <div className="text-amber-300 font-bold flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                      <span>{design.costLevel} ({design.estimatedCostRangeUSD})</span>
                    </div>
                  </div>

                  {/* Construction Difficulty */}
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">
                      Difficulty & Feasibility
                    </span>
                    <div className="text-slate-200 font-semibold flex items-center gap-1">
                      <Wrench className="w-3.5 h-3.5 text-slate-400" />
                      <span>{design.difficulty} • {design.diyFeasibility}</span>
                    </div>
                  </div>

                  {/* Architectural Principle */}
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                      Thermal Physics Mechanism
                    </span>
                    <p className="text-[11px] text-slate-300 leading-relaxed font-mono">
                      {design.architecturalPrinciple}
                    </p>
                  </div>

                  {/* Top Pros */}
                  <div className="bg-emerald-950/20 border border-emerald-500/20 p-2.5 rounded-lg">
                    <span className="text-[10px] text-emerald-400 uppercase font-bold block mb-1">
                      Key Advantage
                    </span>
                    <p className="text-[11px] text-emerald-100/90 leading-relaxed">
                      {design.pros[0]}
                    </p>
                  </div>

                  {/* Key Limitation */}
                  <div className="bg-rose-950/20 border border-rose-500/20 p-2.5 rounded-lg">
                    <span className="text-[10px] text-rose-400 uppercase font-bold block mb-1">
                      Trade-off / Constraint
                    </span>
                    <p className="text-[11px] text-rose-100/90 leading-relaxed">
                      {design.cons[0]}
                    </p>
                  </div>
                </div>

                {/* View Detail Action */}
                <button
                  onClick={() => {
                    onClose();
                    onSelectDesign(design);
                  }}
                  className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-300 border border-slate-700 transition-colors"
                >
                  Inspect Full Blueprint
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
