// @ts-nocheck
/**
 * HITR - 100 House Cooling Architectural Designs
 * Multi-Dimensional Filter Toolbar & Search Controller
 */

import React from 'react';
import { FilterState } from '../types';
import { CATEGORIES } from '../data/categories';
import {
  Search,
  Filter,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

interface FiltersProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  totalResults: number;
  onReset: () => void;
}

export const Filters: React.FC<FiltersProps> = ({
  filters,
  setFilters,
  totalResults,
  onReset,
}) => {
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const costOptions = ['All Costs', 'Free', 'Cheap', 'Moderate', 'Expensive', 'Very Expensive'];
  const effortOptions = ['All Efforts', 'Low', 'Medium', 'High', 'Extremely High'];
  const difficultyOptions = ['All Difficulties', 'Easy', 'Moderate', 'Difficult', 'Extremely Difficult'];
  const natureOptions = ['All Types', 'Natural', 'Artificial / Mechanical', 'Hybrid'];
  const zoneOptions = [
    'All House Zones',
    'Roof & Attic',
    'Windows & Glazing',
    'Walls & Envelope',
    'Orientation & Layout',
    'Traditional & Courtyard',
    'Water & Evaporative',
    'Landscape & Site',
    'Ventilation & Airflow',
    'Mechanical & Active',
    'Low-Cost DIY Hacks',
    'Advanced & Experimental',
    'Subterranean & Foundation',
  ];
  const climateOptions = [
    'All Climates',
    'Hot-Arid',
    'Hot-Humid',
    'Mediterranean',
    'Temperate',
    'Tropical',
  ];

  return (
    <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
      {/* Top Search & Primary Category Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400 dark:text-slate-400" />
          <input
            id="cooling-search-input"
            type="text"
            placeholder="Search all 100 designs by keyword (e.g. radiant barrier, badgir, terracotta, evaporative)..."
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            className="w-full pl-10 pr-4 py-2.5 bg-white/90 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 focus:border-cyan-500 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
          />
          {filters.search && (
            <button
              onClick={() => setFilters((prev) => ({ ...prev, search: '' }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Dropdown */}
        <div className="w-full md:w-64">
          <select
            id="category-filter-select"
            value={filters.category}
            onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
            className="w-full py-2.5 px-3 bg-white/90 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 focus:border-cyan-500 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="all">All 11 Categories (100 Designs)</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.range} {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Dropdown */}
        <div className="w-full md:w-48">
          <select
            id="sort-filter-select"
            value={filters.sortBy}
            onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value as any }))}
            className="w-full py-2.5 px-3 bg-white/90 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 focus:border-cyan-500 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="id">Sort: Number (#1 – #100)</option>
            <option value="name">Sort: Alphabetical (A-Z)</option>
            <option value="cost-asc">Sort: Lowest Cost First</option>
            <option value="cost-desc">Sort: Highest Cost First</option>
            <option value="cooling-desc">Sort: Highest Cooling Delta</option>
          </select>
        </div>

        {/* Toggle Advanced Filters Button */}
        <button
          id="toggle-advanced-filters-btn"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all ${
            showAdvanced || filters.cost !== 'all' || filters.difficulty !== 'all' || filters.nature !== 'all' || filters.climate !== 'all'
              ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
              : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-white'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filters</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Advanced Filter Drawers */}
      {showAdvanced && (
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 animate-in fade-in duration-150">
          {/* Cost Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Cost Tier
            </label>
            <select
              id="cost-filter-select"
              value={filters.cost}
              onChange={(e) => setFilters((prev) => ({ ...prev, cost: e.target.value }))}
              className="w-full py-1.5 px-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">All Costs</option>
              {costOptions.slice(1).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Difficulty
            </label>
            <select
              id="difficulty-filter-select"
              value={filters.difficulty}
              onChange={(e) => setFilters((prev) => ({ ...prev, difficulty: e.target.value }))}
              className="w-full py-1.5 px-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">All Difficulties</option>
              {difficultyOptions.slice(1).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Nature / Technology Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Type / Nature
            </label>
            <select
              id="nature-filter-select"
              value={filters.nature}
              onChange={(e) => setFilters((prev) => ({ ...prev, nature: e.target.value }))}
              className="w-full py-1.5 px-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">All Types</option>
              {natureOptions.slice(1).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* House Zone Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              House Zone
            </label>
            <select
              id="zone-filter-select"
              value={filters.houseZone}
              onChange={(e) => setFilters((prev) => ({ ...prev, houseZone: e.target.value }))}
              className="w-full py-1.5 px-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">All House Zones</option>
              {zoneOptions.slice(1).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Climate Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Climate Zone
            </label>
            <select
              id="climate-filter-select"
              value={filters.climate}
              onChange={(e) => setFilters((prev) => ({ ...prev, climate: e.target.value }))}
              className="w-full py-1.5 px-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">All Climates</option>
              {climateOptions.slice(1).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Action */}
          <div className="flex items-end">
            <button
              id="reset-filters-btn"
              onClick={onReset}
              className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All</span>
            </button>
          </div>
        </div>
      )}

      {/* Results Count & Active Tags Summary */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 pt-1">
        <div>
          Showing <span className="font-bold text-cyan-400">{totalResults}</span> of{' '}
          <span className="font-semibold text-slate-700 dark:text-slate-300">100 architectural cooling designs</span>
        </div>

        {/* Category Range Pill */}
        {filters.category !== 'all' && (
          <div className="flex items-center space-x-1">
            <span className="text-slate-500 dark:text-slate-400 dark:text-slate-400">Filtering:</span>
            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30 text-[11px]">
              {CATEGORIES.find((c) => c.id === filters.category)?.name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
