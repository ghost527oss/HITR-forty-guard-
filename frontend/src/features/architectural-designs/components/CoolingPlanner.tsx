// @ts-nocheck
/**
 * HITR - 100 House Cooling Architectural Designs
 * Interactive Cooling Strategy Planner & Retrofit Estimator
 */

import React, { useState } from 'react';
import { ALL_COOLING_DESIGNS } from '../data/designs';
import { CoolingDesign } from '../types';
import {
  SlidersHorizontal,
  ThermometerSnowflake,
  DollarSign,
  Layers,
  Sparkles,
  CheckCircle2,
  Bookmark,
  ArrowRight,
  Printer,
  Share2,
  Trash2,
} from 'lucide-react';

interface CoolingPlannerProps {
  savedDesignIds: number[];
  onSelectDesign: (design: CoolingDesign) => void;
  onToggleSaved: (id: number) => void;
  onClearSaved: () => void;
}

export const CoolingPlanner: React.FC<CoolingPlannerProps> = ({
  savedDesignIds,
  onSelectDesign,
  onToggleSaved,
  onClearSaved,
}) => {
  // Config state
  const [climate, setClimate] = useState('Hot-Arid');
  const [houseType, setHouseType] = useState('Existing Retrofit');
  const [primaryIssue, setPrimaryIssue] = useState('Hot Second Floor & Attic Heat');
  const [budgetTier, setBudgetTier] = useState('Moderate ($500 – $3,000)');

  // Filter saved designs
  const savedDesigns = ALL_COOLING_DESIGNS.filter((d) => savedDesignIds.includes(d.id));

  // Quick recommend auto-builder
  const handleAutoRecommend = () => {
    // Generate a smart combination based on climate and primary issues
    let recommendedIds: number[] = [];
    if (primaryIssue.includes('Attic')) {
      recommendedIds = [11, 14, 18, 71, 85, 86, 100];
    } else if (primaryIssue.includes('West')) {
      recommendedIds = [21, 24, 27, 28, 65, 85, 89];
    } else if (climate === 'Hot-Humid') {
      recommendedIds = [5, 23, 72, 76, 78, 86];
    } else {
      recommendedIds = [1, 11, 21, 50, 58, 65, 71, 84];
    }

    recommendedIds.forEach((id) => {
      if (!savedDesignIds.includes(id)) {
        onToggleSaved(id);
      }
    });
  };

  // Calculate stats
  const totalTempDropMin = savedDesigns.reduce((acc, d) => acc + d.tempDropCelsiusRange[0], 0);
  const totalTempDropMax = savedDesigns.reduce((acc, d) => acc + d.tempDropCelsiusRange[1], 0);
  // Cap at realistic 14°C sensible room drop
  const realisticDropMin = Math.min(12, Math.round(totalTempDropMin * 0.55 * 10) / 10);
  const realisticDropMax = Math.min(16, Math.round(totalTempDropMax * 0.55 * 10) / 10);

  const phase1Designs = savedDesigns.filter((d) => d.costLevel === 'Free' || d.costLevel === 'Cheap');
  const phase2Designs = savedDesigns.filter((d) => d.costLevel === 'Moderate');
  const phase3Designs = savedDesigns.filter(
    (d) => d.costLevel === 'Expensive' || d.costLevel === 'Very Expensive'
  );

  return (
    <div className="space-y-6">
      {/* Planner Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
              <SlidersHorizontal className="w-4 h-4" />
              <span>HITR Architectural Strategy Engine</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Residential Cooling Strategy Planner
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1 max-w-2xl">
              Assemble a staged, multi-tiered thermal masterplan customized to your building archetype, local microclimate, and retrofit budget.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="auto-generate-plan-btn"
              onClick={handleAutoRecommend}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Auto-Recommend 6-Pack</span>
            </button>

            {savedDesigns.length > 0 && (
              <button
                id="clear-plan-btn"
                onClick={onClearSaved}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-900/30 text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-rose-300 border border-slate-300 dark:border-slate-700 transition-colors"
                title="Clear current plan"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Building & Climate Profile Configurator */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl">
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            Regional Climate Zone
          </label>
          <select
            id="planner-climate-select"
            value={climate}
            onChange={(e) => setClimate(e.target.value)}
            className="w-full py-2 px-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="Hot-Arid">Hot-Arid / Desert (Arizona, Middle East, Mediterranean)</option>
            <option value="Hot-Humid">Hot-Humid / Subtropical (Florida, Southeast Asia, Gulf)</option>
            <option value="Mediterranean">Mediterranean / Dry Summer (California, Southern Europe)</option>
            <option value="Temperate">Temperate with Summer Heatwaves (Central Europe, Midwest)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            Building Archetype
          </label>
          <select
            id="planner-house-type-select"
            value={houseType}
            onChange={(e) => setHouseType(e.target.value)}
            className="w-full py-2 px-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="Existing Retrofit">Existing Single-Family Home (Retrofit)</option>
            <option value="New Construction">New Sustainable Build (Ground-Up)</option>
            <option value="Multi-Family">Apartment / Multi-Family Rental</option>
            <option value="Historic Masonry">Historic Brick / Stone Masonry Home</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            Primary Heat Vulnerability
          </label>
          <select
            id="planner-issue-select"
            value={primaryIssue}
            onChange={(e) => setPrimaryIssue(e.target.value)}
            className="w-full py-2 px-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="Hot Second Floor & Attic Heat">Superheated 2nd Floor & Attic Radiation</option>
            <option value="West Facing Window Glare">Blistering Afternoon West/South Window Sun</option>
            <option value="High AC Electric Bills">Astronomical Summer Air-Conditioning Utility Bills</option>
            <option value="Sticky Muggy Indoor Humidity">Oppressive Sticky Indoor Humidity & Stagnant Air</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            Investment Budget Target
          </label>
          <select
            id="planner-budget-select"
            value={budgetTier}
            onChange={(e) => setBudgetTier(e.target.value)}
            className="w-full py-2 px-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="Low ($0 – $500)">Low / DIY Focused ($0 – $500)</option>
            <option value="Moderate ($500 – $3,000)">Moderate Retrofits ($500 – $3,000)</option>
            <option value="Major ($3,000 – $15,000)">Substantial Architectural Upgrade ($3k – $15k)</option>
            <option value="Deep Decarbonization ($15k+)">Complete Deep Decarbonization ($15k+)</option>
          </select>
        </div>
      </div>

      {/* Plan Performance Dashboard */}
      <div className="grid sm:grid-cols-3 gap-4 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-lg">
        {/* Metric 1: Selected Techniques */}
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xl">
            {savedDesigns.length}
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase font-semibold">Active Blueprint Portfolio</span>
            <h4 className="text-base font-extrabold text-white">
              {savedDesigns.length} Selected Techniques
            </h4>
          </div>
        </div>

        {/* Metric 2: Estimated Cumulative Sensible Cooling Delta */}
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <ThermometerSnowflake className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase font-semibold">Simulated Combined Cooling</span>
            <h4 className="text-base font-extrabold text-emerald-300">
              {savedDesigns.length > 0
                ? `${realisticDropMin}°C – ${realisticDropMax}°C Indoor Drop`
                : 'Add techniques below'}
            </h4>
          </div>
        </div>

        {/* Metric 3: HVAC Load Offset */}
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase font-semibold">Estimated AC Load Offset</span>
            <h4 className="text-base font-extrabold text-amber-300">
              {savedDesigns.length > 0
                ? `${Math.min(85, savedDesigns.length * 14)}% Peak Grid Shaving`
                : '0% baseline'}
            </h4>
          </div>
        </div>
      </div>

      {/* Staged Multi-Phase Strategy List */}
      {savedDesigns.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-10 text-center space-y-3">
          <Bookmark className="w-10 h-10 text-slate-500 dark:text-slate-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">Your Custom Cooling Plan is Empty</h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 max-w-md mx-auto">
            Browse the 100 Architectural Designs catalogue or click &quot;Auto-Recommend 6-Pack&quot; above to assemble your customized multi-phase cooling roadmap.
          </p>
          <button
            onClick={handleAutoRecommend}
            className="mt-2 inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-bold hover:bg-cyan-500/30"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Recommended Blueprint Pack</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Phase 1: Immediate & Low-Cost DIY */}
          {phase1Designs.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">
                    1
                  </span>
                  <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">
                    Phase 1: Immediate Low-Cost & DIY Quick Wins ($0 – $500)
                  </h3>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 font-semibold">{phase1Designs.length} Techniques</span>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {phase1Designs.map((d) => (
                  <PlanItemCard
                    key={d.id}
                    design={d}
                    onSelect={() => onSelectDesign(d)}
                    onRemove={() => onToggleSaved(d.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Phase 2: Moderate Architectural Retrofits */}
          {phase2Designs.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center">
                    2
                  </span>
                  <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                    Phase 2: Moderate Architectural Retrofits ($500 – $3,000)
                  </h3>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 font-semibold">{phase2Designs.length} Techniques</span>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {phase2Designs.map((d) => (
                  <PlanItemCard
                    key={d.id}
                    design={d}
                    onSelect={() => onSelectDesign(d)}
                    onRemove={() => onToggleSaved(d.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Phase 3: Major Structural Upgrades */}
          {phase3Designs.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold flex items-center justify-center">
                    3
                  </span>
                  <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider">
                    Phase 3: Deep Architectural & Structural Upgrades ($3,000+)
                  </h3>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 font-semibold">{phase3Designs.length} Techniques</span>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {phase3Designs.map((d) => (
                  <PlanItemCard
                    key={d.id}
                    design={d}
                    onSelect={() => onSelectDesign(d)}
                    onRemove={() => onToggleSaved(d.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Sub-component for individual item in plan
const PlanItemCard: React.FC<{
  design: CoolingDesign;
  onSelect: () => void;
  onRemove: () => void;
}> = ({ design, onSelect, onRemove }) => {
  return (
    <div className="bg-white/90 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:border-slate-700 rounded-xl p-3.5 flex flex-col justify-between space-y-3">
      <div>
        <div className="flex items-center justify-between gap-1 mb-1.5">
          <span className="text-[11px] font-mono font-bold text-cyan-400 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">
            #{design.id}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-400 truncate">{design.houseZone}</span>
        </div>
        <h4
          onClick={onSelect}
          className="text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-cyan-300 cursor-pointer line-clamp-2"
        >
          {design.name}
        </h4>
        <p className="text-[11px] text-emerald-400 font-semibold mt-1">
          {design.tempDropEstimate.split('/')[0]}
        </p>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-300 dark:border-slate-200 dark:border-slate-800 text-xs">
        <button
          onClick={onSelect}
          className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-cyan-300 transition-colors"
        >
          View Blueprint
        </button>
        <button
          onClick={onRemove}
          className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-rose-400 transition-colors"
        >
          Remove
        </button>
      </div>
    </div>
  );
};
