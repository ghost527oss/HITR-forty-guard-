/**
 * HITR - 100 House Cooling Architectural Designs
 * Saved Strategy Plan Drawer & Project Exporter
 */

import React from 'react';
import { ALL_COOLING_DESIGNS } from '../data/designs';
import { CoolingDesign } from '../types';
import {
  X,
  Bookmark,
  ThermometerSnowflake,
  DollarSign,
  Trash2,
  ArrowRight,
  Printer,
  Download,
  Share2,
  CheckCircle2,
} from 'lucide-react';

interface SavedProjectsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedDesignIds: number[];
  onRemove: (id: number) => void;
  onClearAll: () => void;
  onSelectDesign: (design: CoolingDesign) => void;
}

export const SavedProjectsDrawer: React.FC<SavedProjectsDrawerProps> = ({
  isOpen,
  onClose,
  savedDesignIds,
  onRemove,
  onClearAll,
  onSelectDesign,
}) => {
  if (!isOpen) return null;

  const savedDesigns = ALL_COOLING_DESIGNS.filter((d) => savedDesignIds.includes(d.id));

  const handleExportText = () => {
    const textContent = `HITR - 100 HOUSE COOLING ARCHITECTURAL PLAN
Generated on: ${new Date().toLocaleDateString()}
Total Interventions: ${savedDesigns.length}

${savedDesigns
  .map(
    (d, i) =>
      `${i + 1}. [Design #${d.id}] ${d.name}
Category: ${d.category} | Zone: ${d.houseZone}
Cost: ${d.costLevel} (${d.estimatedCostRangeUSD}) | Difficulty: ${d.difficulty} (${d.diyFeasibility})
Est. Temperature Drop: ${d.tempDropEstimate}
Mechanism: ${d.architecturalPrinciple}
Materials: ${d.materialsNeeded.join(', ')}
--------------------------------------------------`
  )
  .join('\n\n')}`;

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `HITR-Cooling-Masterplan-${Date.now()}.txt`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          id="saved-projects-drawer"
          className="w-screen max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col justify-between text-slate-100 animate-in slide-in-from-right duration-200"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
            <div className="flex items-center space-x-2">
              <Bookmark className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white">
                My Cooling Strategy ({savedDesigns.length})
              </h2>
            </div>

            <button
              id="close-saved-drawer-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1">
            {savedDesigns.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <Bookmark className="w-10 h-10 text-slate-600 mx-auto" />
                <h3 className="text-sm font-bold text-slate-300">No Designs Added Yet</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Click the &quot;+&quot; or &quot;Add to Plan&quot; button on any of the 100 cooling designs to save it to your blueprint portfolio.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedDesigns.map((design) => (
                  <div
                    key={design.id}
                    className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start justify-between gap-3 group"
                  >
                    <div
                      onClick={() => {
                        onClose();
                        onSelectDesign(design);
                      }}
                      className="cursor-pointer space-y-1 flex-1 pr-2"
                    >
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] font-mono font-bold text-cyan-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                          #{design.id}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          {design.houseZone}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors line-clamp-2">
                        {design.name}
                      </h4>
                      <p className="text-[11px] text-emerald-400 font-semibold">
                        {design.tempDropEstimate.split('/')[0]}
                      </p>
                    </div>

                    <button
                      onClick={() => onRemove(design.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                      title="Remove from plan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {savedDesigns.length > 0 && (
            <div className="p-5 border-t border-slate-800 bg-slate-900/95 space-y-3 shrink-0">
              <button
                id="export-masterplan-btn"
                onClick={handleExportText}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export Strategy Specification (.TXT)</span>
              </button>

              <button
                onClick={onClearAll}
                className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-rose-400 transition-colors"
              >
                Clear All {savedDesigns.length} Items
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
