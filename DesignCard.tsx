/**
 * HITR - 100 House Cooling Architectural Designs
 * High-Craftsmanship Architectural Design Card
 */

import React from 'react';
import { CoolingDesign } from '../types';
import {
  ThermometerSnowflake,
  Wrench,
  DollarSign,
  Compass,
  Check,
  Plus,
  GitCompare,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

interface DesignCardProps {
  design: CoolingDesign;
  onSelect: (design: CoolingDesign) => void;
  onToggleSaved: (id: number) => void;
  isSaved: boolean;
  onToggleCompare: (id: number) => void;
  isComparing: boolean;
}

export const DesignCard: React.FC<DesignCardProps> = ({
  design,
  onSelect,
  onToggleSaved,
  isSaved,
  onToggleCompare,
  isComparing,
}) => {
  // Helper for cost badge color
  const getCostBadge = (cost: string) => {
    switch (cost) {
      case 'Free':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Cheap':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/30';
      case 'Moderate':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Expensive':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'Very Expensive':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  // Helper for difficulty badge
  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40';
      case 'Moderate':
        return 'text-amber-400 bg-amber-950/40 border-amber-800/40';
      case 'Difficult':
        return 'text-orange-400 bg-orange-950/40 border-orange-800/40';
      case 'Extremely Difficult':
        return 'text-rose-400 bg-rose-950/40 border-rose-800/40';
      default:
        return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  return (
    <div
      id={`cooling-design-card-${design.id}`}
      className="group relative flex flex-col justify-between bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl p-5 transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-cyan-950/20"
    >
      <div>
        {/* Card Header: Number, Nature, Zone */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-cyan-400 font-mono font-bold text-xs">
              #{design.id}
            </span>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {design.houseZone}
            </span>
          </div>

          <span
            className={`text-[11px] px-2 py-0.5 rounded-md font-medium border ${
              design.nature === 'Natural'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : design.nature === 'Artificial / Mechanical'
                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}
          >
            {design.nature}
          </span>
        </div>

        {/* Title */}
        <h3
          onClick={() => onSelect(design)}
          className="text-base font-bold text-slate-100 hover:text-cyan-400 cursor-pointer transition-colors leading-snug line-clamp-2 mb-2"
        >
          {design.name}
        </h3>

        {/* Category Line */}
        <p className="text-xs text-slate-400 font-medium mb-3 flex items-center gap-1.5">
          <Compass className="w-3 h-3 text-amber-400 shrink-0" />
          <span className="truncate">{design.category}</span>
        </p>

        {/* Summary */}
        <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed mb-4">
          {design.summary}
        </p>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 mb-4 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-xs">
          {/* Temperature Drop */}
          <div className="flex items-center space-x-1.5 text-cyan-300">
            <ThermometerSnowflake className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="font-semibold text-[11px] truncate">
              {design.tempDropEstimate.split('/')[0]}
            </span>
          </div>

          {/* Cost Level */}
          <div className="flex items-center space-x-1.5">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getCostBadge(design.costLevel)}`}>
              {design.costLevel}
            </span>
          </div>

          {/* Difficulty */}
          <div className="flex items-center space-x-1 text-slate-300">
            <Wrench className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="text-[11px] truncate">
              Diff: <span className="font-medium text-slate-200">{design.difficulty}</span>
            </span>
          </div>

          {/* DIY Feasibility */}
          <div className="flex items-center space-x-1 text-slate-300">
            <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="text-[11px] truncate">
              {design.diyFeasibility.split('/')[0]}
            </span>
          </div>
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
        <button
          id={`view-blueprint-btn-${design.id}`}
          onClick={() => onSelect(design)}
          className="flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
        >
          <span>Blueprint</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />
        </button>

        <button
          id={`toggle-compare-btn-${design.id}`}
          onClick={() => onToggleCompare(design.id)}
          title={isComparing ? 'Remove from compare' : 'Add to compare'}
          className={`p-1.5 rounded-lg border text-xs font-medium transition-colors ${
            isComparing
              ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700'
          }`}
        >
          <GitCompare className="w-4 h-4" />
        </button>

        <button
          id={`toggle-saved-btn-${design.id}`}
          onClick={() => onToggleSaved(design.id)}
          title={isSaved ? 'Remove from plan' : 'Add to cooling plan'}
          className={`p-1.5 rounded-lg border text-xs font-medium transition-colors ${
            isSaved
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
              : 'bg-slate-800 text-slate-400 hover:text-amber-400 border-slate-700'
          }`}
        >
          {isSaved ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
