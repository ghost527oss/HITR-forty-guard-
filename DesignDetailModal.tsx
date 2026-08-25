/**
 * HITR - 100 House Cooling Architectural Designs
 * Deep Architectural Blueprint & Engineering Detail Modal
 */

import React, { useEffect } from 'react';
import { CoolingDesign } from '../types';
import {
  X,
  ThermometerSnowflake,
  Wrench,
  DollarSign,
  Layers,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  History,
  Package,
  Clock,
  Sparkles,
  Bookmark,
  GitCompare,
  ExternalLink,
} from 'lucide-react';

interface DesignDetailModalProps {
  design: CoolingDesign | null;
  onClose: () => void;
  onToggleSaved: (id: number) => void;
  isSaved: boolean;
  onToggleCompare: (id: number) => void;
  isComparing: boolean;
}

export const DesignDetailModal: React.FC<DesignDetailModalProps> = ({
  design,
  onClose,
  onToggleSaved,
  isSaved,
  onToggleCompare,
  isComparing,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!design) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div
        id="design-detail-modal"
        className="relative w-full max-w-3xl bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden my-8 text-slate-100 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header Bar */}
        <div className="flex items-start justify-between p-5 sm:p-6 border-b border-slate-800 bg-slate-900/90">
          <div className="space-y-1.5 pr-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono font-bold text-xs">
                Design #{design.id}
              </span>
              <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-xs font-semibold">
                {design.category}
              </span>
              <span className="px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
                {design.houseZone}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {design.name}
            </h2>
          </div>

          <button
            id="close-detail-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Quick Metrics Dashboard */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <div className="space-y-0.5">
              <span className="text-[11px] text-slate-400 font-medium uppercase">Est. Temp Drop</span>
              <div className="text-sm font-bold text-cyan-400 flex items-center gap-1">
                <ThermometerSnowflake className="w-4 h-4 text-cyan-400" />
                <span>{design.tempDropEstimate}</span>
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-[11px] text-slate-400 font-medium uppercase">Budget Tier</span>
              <div className="text-sm font-bold text-amber-300 flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-amber-400" />
                <span>{design.costLevel} ({design.estimatedCostRangeUSD})</span>
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-[11px] text-slate-400 font-medium uppercase">Construction</span>
              <div className="text-sm font-bold text-slate-200 flex items-center gap-1">
                <Wrench className="w-4 h-4 text-slate-400" />
                <span>{design.difficulty} ({design.effortLevel} effort)</span>
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-[11px] text-slate-400 font-medium uppercase">Feasibility</span>
              <div className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{design.diyFeasibility}</span>
              </div>
            </div>
          </div>

          {/* Overview / Summary */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Architectural Overview
            </h4>
            <p className="text-sm text-slate-200 leading-relaxed bg-slate-850 p-4 rounded-xl border border-slate-800">
              {design.summary}
            </p>
          </div>

          {/* Bioclimatic Physics Principle */}
          <div className="border border-cyan-500/20 bg-cyan-950/20 p-4 rounded-xl space-y-1.5">
            <div className="flex items-center space-x-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Bioclimatic & Thermal Physics Principle</span>
            </div>
            <p className="text-xs sm:text-sm text-cyan-100/90 leading-relaxed font-mono">
              {design.architecturalPrinciple}
            </p>
          </div>

          {/* Construction & Implementation Notes */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
              <span>Construction, Detailing & Sizing Notes</span>
            </h4>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-850 p-4 rounded-xl border border-slate-800">
              {design.constructionNotes}
            </p>
          </div>

          {/* Pros and Cons Breakdown */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Pros */}
            <div className="bg-emerald-950/20 border border-emerald-500/20 p-4 rounded-xl space-y-2">
              <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Key Advantages & Performance</span>
              </h5>
              <ul className="space-y-1.5 text-xs text-emerald-100/90">
                {design.pros.map((pro, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Cons / Limitations */}
            <div className="bg-rose-950/20 border border-rose-500/20 p-4 rounded-xl space-y-2">
              <h5 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Trade-offs & Constraints</span>
              </h5>
              <ul className="space-y-1.5 text-xs text-rose-100/90">
                {design.cons.map((con, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Materials & Maintenance */}
          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
              <span className="font-bold text-slate-300 flex items-center gap-1.5 uppercase">
                <Package className="w-3.5 h-3.5 text-indigo-400" />
                Materials & Specifications
              </span>
              <ul className="space-y-1 text-slate-400">
                {design.materialsNeeded.map((mat, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                    <span>{mat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
              <span className="font-bold text-slate-300 flex items-center gap-1.5 uppercase">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Maintenance & Lifespan
              </span>
              <p className="text-slate-400 leading-relaxed">
                {design.maintenanceNotes}
              </p>
            </div>
          </div>

          {/* Historical & Vernacular Context */}
          {design.historicalVernacularContext && (
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 flex items-start gap-3">
              <History className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h5 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Vernacular Architectural Heritage
                </h5>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {design.historicalVernacularContext}
                </p>
              </div>
            </div>
          )}

          {/* Climate Suitability Badges */}
          <div>
            <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Suitable Climate Zones
            </h5>
            <div className="flex flex-wrap gap-1.5">
              {design.climateSuitability.map((climate, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300"
                >
                  {climate}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/95 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              id="modal-toggle-compare-btn"
              onClick={() => onToggleCompare(design.id)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors border ${
                isComparing
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>{isComparing ? 'Comparing' : 'Compare Technique'}</span>
            </button>

            <button
              id="modal-toggle-saved-btn"
              onClick={() => onToggleSaved(design.id)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors border ${
                isSaved
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{isSaved ? 'In Strategy Plan' : 'Add to Strategy Plan'}</span>
            </button>
          </div>

          <button
            id="modal-close-bottom-btn"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Close Blueprint
          </button>
        </div>
      </div>
    </div>
  );
};
