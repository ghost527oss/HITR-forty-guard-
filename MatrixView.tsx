/**
 * HITR - 100 House Cooling Architectural Designs
 * Interactive Cost vs. Effort vs. Thermal Impact Matrix Explorer
 */

import React, { useState } from 'react';
import { ALL_COOLING_DESIGNS } from '../data/designs';
import { CoolingDesign, CostLevel, Difficulty } from '../types';
import {
  ThermometerSnowflake,
  Layers,
  Sparkles,
  ArrowUpRight,
  TrendingDown,
  Wrench,
  DollarSign,
} from 'lucide-react';

interface MatrixViewProps {
  onSelectDesign: (design: CoolingDesign) => void;
}

const COST_LEVELS: CostLevel[] = ['Free', 'Cheap', 'Moderate', 'Expensive', 'Very Expensive'];
const DIFFICULTY_LEVELS: Difficulty[] = ['Easy', 'Moderate', 'Difficult', 'Extremely Difficult'];

export const MatrixView: React.FC<MatrixViewProps> = ({ onSelectDesign }) => {
  const [selectedQuadrant, setSelectedQuadrant] = useState<string | null>(null);

  // Quadrants
  const quickWins = ALL_COOLING_DESIGNS.filter(
    (d) => (d.costLevel === 'Free' || d.costLevel === 'Cheap') && d.difficulty === 'Easy'
  );

  const highEfficiencyRetrofits = ALL_COOLING_DESIGNS.filter(
    (d) =>
      (d.costLevel === 'Cheap' || d.costLevel === 'Moderate') &&
      (d.difficulty === 'Moderate' || d.difficulty === 'Easy')
  );

  const majorStructuralInvestments = ALL_COOLING_DESIGNS.filter(
    (d) =>
      (d.costLevel === 'Expensive' || d.costLevel === 'Very Expensive') &&
      (d.difficulty === 'Difficult' || d.difficulty === 'Extremely Difficult')
  );

  const specializedInnovations = ALL_COOLING_DESIGNS.filter(
    (d) => d.categorySlug === 'advanced-experimental-designs' || d.costLevel === 'Very Expensive'
  );

  return (
    <div className="space-y-6">
      {/* Matrix Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-cyan-400 font-bold text-xs uppercase tracking-wider mb-1">
              <ThermometerSnowflake className="w-4 h-4" />
              <span>Architectural Decision Matrix</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Cost vs. Construction Difficulty Grid
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Cross-reference all 100 cooling techniques across economic capital expenditure and physical construction complexity to identify optimal ROI interventions.
            </p>
          </div>
        </div>
      </div>

      {/* 4 Quadrant Macro Summary Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Quadrant 1: Quick Wins */}
        <div
          onClick={() => setSelectedQuadrant(selectedQuadrant === 'quick-wins' ? null : 'quick-wins')}
          className={`cursor-pointer bg-emerald-950/20 border p-4 rounded-xl space-y-2 transition-all ${
            selectedQuadrant === 'quick-wins'
              ? 'border-emerald-400 ring-2 ring-emerald-500/20 shadow-lg shadow-emerald-950/40'
              : 'border-emerald-500/20 hover:border-emerald-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Quick Wins (DIY / Zero Cost)
            </span>
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs flex items-center justify-center">
              {quickWins.length}
            </span>
          </div>
          <p className="text-xs text-emerald-100/80 leading-relaxed">
            Free to $100 interventions installable in under 1 day with zero structural permits.
          </p>
        </div>

        {/* Quadrant 2: High ROI Retrofits */}
        <div
          onClick={() => setSelectedQuadrant(selectedQuadrant === 'high-roi' ? null : 'high-roi')}
          className={`cursor-pointer bg-cyan-950/20 border p-4 rounded-xl space-y-2 transition-all ${
            selectedQuadrant === 'high-roi'
              ? 'border-cyan-400 ring-2 ring-cyan-500/20 shadow-lg shadow-cyan-950/40'
              : 'border-cyan-500/20 hover:border-cyan-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
              High-ROI Retrofits
            </span>
            <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold text-xs flex items-center justify-center">
              {highEfficiencyRetrofits.length}
            </span>
          </div>
          <p className="text-xs text-cyan-100/80 leading-relaxed">
            Moderate budget ($300–$2k) yielding maximum long-term thermal drop and energy savings.
          </p>
        </div>

        {/* Quadrant 3: Heavy Structural */}
        <div
          onClick={() => setSelectedQuadrant(selectedQuadrant === 'structural' ? null : 'structural')}
          className={`cursor-pointer bg-amber-950/20 border p-4 rounded-xl space-y-2 transition-all ${
            selectedQuadrant === 'structural'
              ? 'border-amber-400 ring-2 ring-amber-500/20 shadow-lg shadow-amber-950/40'
              : 'border-amber-500/20 hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Structural & New Builds
            </span>
            <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold text-xs flex items-center justify-center">
              {majorStructuralInvestments.length}
            </span>
          </div>
          <p className="text-xs text-amber-100/80 leading-relaxed">
            High-mass bioclimatic architecture requiring ground-up integration and structural engineering.
          </p>
        </div>

        {/* Quadrant 4: Advanced & Experimental */}
        <div
          onClick={() => setSelectedQuadrant(selectedQuadrant === 'advanced' ? null : 'advanced')}
          className={`cursor-pointer bg-indigo-950/20 border p-4 rounded-xl space-y-2 transition-all ${
            selectedQuadrant === 'advanced'
              ? 'border-indigo-400 ring-2 ring-indigo-500/20 shadow-lg shadow-indigo-950/40'
              : 'border-indigo-500/20 hover:border-indigo-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
              Advanced & Kinetic
            </span>
            <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-bold text-xs flex items-center justify-center">
              {specializedInnovations.length}
            </span>
          </div>
          <p className="text-xs text-indigo-100/80 leading-relaxed">
            Cutting-edge materials science, solar tracking, ERVs, geothermal, and biomimicry.
          </p>
        </div>
      </div>

      {/* Full 5x4 Architectural Grid Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg overflow-x-auto">
        <h3 className="text-base font-bold text-white mb-4">
          Complete 100-Design Cross-Density Distribution
        </h3>

        <div className="min-w-[720px] space-y-4">
          {/* Header Row for Difficulties */}
          <div className="grid grid-cols-5 gap-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
            <div className="text-left font-mono">Cost Tier ↓ / Difficulty →</div>
            <div>Easy (DIY)</div>
            <div>Moderate (Handyman)</div>
            <div>Difficult (Trade Pro)</div>
            <div>Extremely Difficult (Structural)</div>
          </div>

          {/* Rows for Each Cost Level */}
          {COST_LEVELS.map((cost) => (
            <div key={cost} className="grid grid-cols-5 gap-3 items-stretch">
              {/* Cost Label */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-bold text-amber-300">
                <span>{cost}</span>
              </div>

              {/* Cells for Each Difficulty */}
              {DIFFICULTY_LEVELS.map((diff) => {
                const cellDesigns = ALL_COOLING_DESIGNS.filter(
                  (d) => d.costLevel === cost && d.difficulty === diff
                );

                return (
                  <div
                    key={`${cost}-${diff}`}
                    className="min-h-[100px] p-2 rounded-xl bg-slate-950/40 border border-slate-850 hover:border-slate-700 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mb-1">
                      <span>{cellDesigns.length} items</span>
                    </div>

                    <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                      {cellDesigns.map((d) => (
                        <div
                          key={d.id}
                          onClick={() => onSelectDesign(d)}
                          className="text-[11px] p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 cursor-pointer border border-slate-800/80 truncate transition-colors"
                          title={d.name}
                        >
                          <span className="font-mono text-cyan-400 font-bold mr-1">#{d.id}</span>
                          <span>{d.name}</span>
                        </div>
                      ))}
                      {cellDesigns.length === 0 && (
                        <span className="text-[11px] text-slate-600 italic block text-center py-4">
                          None
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
