// @ts-nocheck
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
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  History,
  Package,
  Clock,
  Sparkles,
  Bookmark,
  GitCompare,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div
        id="design-detail-modal"
        className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header Bar */}
        <div className="flex items-start justify-between p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="space-y-1.5 pr-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-sky-100 dark:bg-sky-950/50 border border-sky-300 dark:border-sky-800 text-sky-800 dark:text-sky-300 font-mono font-bold text-xs">
                Design #{design.id}
              </span>
              <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                {design.category}
              </span>
              <span className="px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-xs font-semibold">
                {design.houseZone}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {design.name}
            </h2>
          </div>

          <button
            id="close-detail-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Quick Metrics Dashboard */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="space-y-0.5">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase">Est. Temp Drop</span>
              <div className="text-sm font-bold text-sky-700 dark:text-sky-400 flex items-center gap-1">
                <ThermometerSnowflake className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>{design.tempDropEstimate}</span>
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase">Budget Tier</span>
              <div className="text-sm font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>{design.costLevel} ({design.estimatedCostRangeUSD})</span>
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase">Construction</span>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <Wrench className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>{design.difficulty} ({design.effortLevel} effort)</span>
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase">Feasibility</span>
              <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{design.diyFeasibility}</span>
              </div>
            </div>
          </div>

          {/* Overview / Summary */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Architectural Overview
            </h4>
            <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              {design.summary}
            </p>
          </div>

          {/* Bioclimatic Physics Principle - Dark High-Contrast Text */}
          <div className="border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 p-4 rounded-xl space-y-1.5">
            <div className="flex items-center space-x-2 text-sky-900 dark:text-sky-300 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Bioclimatic & Thermal Physics Principle</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-medium leading-relaxed">
              {design.architecturalPrinciple}
            </p>
          </div>

          {/* Construction & Implementation Notes */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Construction, Detailing & Sizing Notes</span>
            </h4>
            <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              {design.constructionNotes}
            </p>
          </div>

          {/* Pros and Cons Breakdown - High-Contrast Solid Text */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Pros */}
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl space-y-2">
              <h5 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Key Advantages & Performance</span>
              </h5>
              <ul className="space-y-1.5 text-xs text-slate-900 dark:text-slate-100 font-medium">
                {design.pros.map((pro, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Cons / Limitations */}
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 p-4 rounded-xl space-y-2">
              <h5 className="text-xs font-bold text-rose-900 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Trade-offs & Constraints</span>
              </h5>
              <ul className="space-y-1.5 text-xs text-slate-900 dark:text-slate-100 font-medium">
                {design.cons.map((con, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-rose-600 dark:text-rose-400 font-bold">•</span>
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Materials & Maintenance */}
          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase">
                <Package className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Materials & Specifications
              </span>
              <ul className="space-y-1 text-slate-700 dark:text-slate-300 font-medium">
                {design.materialsNeeded.map((mat, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    <span>{mat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase">
                <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Maintenance & Lifespan
              </span>
              <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                {design.maintenanceNotes}
              </p>
            </div>
          </div>

          {/* Historical Context */}
          {design.historicalVernacularContext && (
            <div className="bg-amber-50/80 dark:bg-slate-950 p-4 rounded-xl border border-amber-200 dark:border-slate-800 flex items-start gap-3">
              <History className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h5 className="text-xs font-bold text-amber-900 dark:text-amber-400 uppercase tracking-wider">
                  Vernacular Architectural Heritage
                </h5>
                <p className="text-xs text-slate-900 dark:text-slate-200 font-medium leading-relaxed">
                  {design.historicalVernacularContext}
                </p>
              </div>
            </div>
          )}

          {/* Climate Suitability Badges */}
          <div>
            <h5 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Suitable Climate Zones
            </h5>
            <div className="flex flex-wrap gap-1.5">
              {design.climateSuitability.map((climate, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  {climate}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              id="modal-toggle-compare-btn"
              onClick={() => onToggleCompare(design.id)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors border ${
                isComparing
                  ? 'bg-sky-50 border-sky-300 text-sky-800 dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-300'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>{isComparing ? 'Comparing' : 'Compare Technique'}</span>
            </button>

            <button
              id="modal-toggle-saved-btn"
              onClick={() => onToggleSaved(design.id)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors border ${
                isSaved
                  ? 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{isSaved ? 'In Strategy Plan' : 'Add to Strategy Plan'}</span>
            </button>
          </div>

          <button
            id="modal-close-bottom-btn"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors"
          >
            Close Blueprint
          </button>
        </div>
      </div>
    </div>
  );
};
