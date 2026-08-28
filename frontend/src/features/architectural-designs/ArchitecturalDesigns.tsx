// @ts-nocheck
/**
 * HITR - 100 House Cooling Architectural Designs
 * Main Application Shell & Master Controller
 */

import React, { useState, useMemo, useEffect } from 'react';
import { ALL_COOLING_DESIGNS, getQuickStats } from './data/designs';
import { CATEGORIES } from './data/categories';
import { CoolingDesign, FilterState } from './types';
import { Navbar } from './components/Navbar';
import { DesignCard } from './components/DesignCard';
import { DesignDetailModal } from './components/DesignDetailModal';
import { Filters } from './components/Filters';
import { HouseAnatomyView } from './components/HouseAnatomyView';
import { CoolingPlanner } from './components/CoolingPlanner';
import { MatrixView } from './components/MatrixView';
import { CompareModal } from './components/CompareModal';
import { AiAdvisorView } from './components/AiAdvisorView';
import { SavedProjectsDrawer } from './components/SavedProjectsDrawer';
import {
  Layers,
  ThermometerSnowflake,
  Compass,
  Sparkles,
  Flame,
  Wind,
  Droplets,
  DollarSign,
  ShieldCheck,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';

export default function ArchitecturalDesigns() {
  // Navigation Tab
  const [activeTab, setActiveTab] = useState<
    'catalogue' | 'anatomy' | 'planner' | 'matrix' | 'compare' | 'ai-advisor'
  >('catalogue');

  // Filter State
  const initialFilters: FilterState = {
    search: '',
    category: 'all',
    cost: 'all',
    effort: 'all',
    difficulty: 'all',
    nature: 'all',
    houseZone: 'all',
    climate: 'all',
    sortBy: 'id',
  };

  const [filters, setFilters] = useState<FilterState>(initialFilters);

  // Selected Design for Detailed Blueprint Modal
  const [selectedDesign, setSelectedDesign] = useState<CoolingDesign | null>(null);

  // Saved / Planner Designs (Stored in localStorage)
  const [savedDesignIds, setSavedDesignIds] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem('hitr_saved_cooling_designs');
      return stored ? JSON.parse(stored) : [11, 14, 21, 50, 71, 84]; // default initial 6-pack
    } catch {
      return [11, 14, 21, 50, 71, 84];
    }
  });

  // Comparing Designs (max 4)
  const [comparingIds, setComparingIds] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem('hitr_comparing_designs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Modals & Drawers Visibility
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Sync saved to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('hitr_saved_cooling_designs', JSON.stringify(savedDesignIds));
    } catch (e) {
      console.error(e);
    }
  }, [savedDesignIds]);

  // Sync comparing to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('hitr_comparing_designs', JSON.stringify(comparingIds));
    } catch (e) {
      console.error(e);
    }
  }, [comparingIds]);

  // Toggle Saved Item
  const handleToggleSaved = (id: number) => {
    setSavedDesignIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle Compare Item (max 4)
  const handleToggleCompare = (id: number) => {
    setComparingIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 4) {
        // Replace oldest or cap
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  };

  // Filter and Sort Logic
  const filteredDesigns = useMemo(() => {
    return ALL_COOLING_DESIGNS.filter((design) => {
      // Search
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const matchesName = design.name.toLowerCase().includes(query);
        const matchesSummary = design.summary.toLowerCase().includes(query);
        const matchesPrinciple = design.architecturalPrinciple.toLowerCase().includes(query);
        const matchesTags = design.tags.some((t) => t.toLowerCase().includes(query));
        const matchesCategory = design.category.toLowerCase().includes(query);
        if (!matchesName && !matchesSummary && !matchesPrinciple && !matchesTags && !matchesCategory) {
          return false;
        }
      }

      // Category
      if (filters.category !== 'all') {
        if (design.categorySlug !== filters.category) return false;
      }

      // Cost
      if (filters.cost !== 'all') {
        if (design.costLevel !== filters.cost) return false;
      }

      // Effort
      if (filters.effort !== 'all') {
        if (design.effortLevel !== filters.effort) return false;
      }

      // Difficulty
      if (filters.difficulty !== 'all') {
        if (design.difficulty !== filters.difficulty) return false;
      }

      // Nature
      if (filters.nature !== 'all') {
        if (design.nature !== filters.nature) return false;
      }

      // House Zone
      if (filters.houseZone !== 'all') {
        if (design.houseZone !== filters.houseZone) return false;
      }

      // Climate
      if (filters.climate !== 'all') {
        const matchesClimate = design.climateSuitability.some(
          (c) => c.includes(filters.climate) || c === 'All Climates'
        );
        if (!matchesClimate) return false;
      }

      return true;
    }).sort((a, b) => {
      if (filters.sortBy === 'id') {
        return a.id - b.id;
      }
      if (filters.sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (filters.sortBy === 'cost-asc') {
        const costWeight: Record<string, number> = {
          Free: 0,
          Cheap: 1,
          Moderate: 2,
          Expensive: 3,
          'Very Expensive': 4,
        };
        return (costWeight[a.costLevel] ?? 2) - (costWeight[b.costLevel] ?? 2);
      }
      if (filters.sortBy === 'cost-desc') {
        const costWeight: Record<string, number> = {
          Free: 0,
          Cheap: 1,
          Moderate: 2,
          Expensive: 3,
          'Very Expensive': 4,
        };
        return (costWeight[b.costLevel] ?? 2) - (costWeight[a.costLevel] ?? 2);
      }
      if (filters.sortBy === 'cooling-desc') {
        return b.tempDropCelsiusRange[1] - a.tempDropCelsiusRange[1];
      }
      return 0;
    });
  }, [filters]);

  const quickStats = getQuickStats();

  const handleFilterZone = (zone: string) => {
    setFilters((prev) => ({ ...prev, houseZone: zone, category: 'all' }));
    setActiveTab('catalogue');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* App Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        savedCount={savedDesignIds.length}
        compareCount={comparingIds.length}
        onOpenSaved={() => setIsSavedDrawerOpen(true)}
        onOpenCompare={() => setIsCompareModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Hero Banner (Shown on Catalogue view) */}
        {activeTab === 'catalogue' && (
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-100 dark:from-slate-900 via-slate-100 dark:via-slate-900 to-cyan-950/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            {/* Ambient Background Accents */}
            <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-4 max-w-3xl">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider">
                <ThermometerSnowflake className="w-3.5 h-3.5 text-cyan-400" />
                <span>100 Architectural House Cooling Designs</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Bioclimatic Passive & Active Architectural Cooling Master Library
              </h1>

              <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                Explore 100 comprehensive architectural techniques to cool a home across 11 structural categories—ranging from ancient vernacular windcatchers and zero-cost DIY hacks to high-tech phase-change materials and radiant barriers.
              </p>

              {/* Quick Stat Highlights */}
              <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/90 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  <span className="font-extrabold text-cyan-400 font-mono">100</span>
                  <span>Total Designs</span>
                </div>
                <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/90 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  <span className="font-extrabold text-emerald-400 font-mono">
                    {quickStats.cheapOrFreeCount}
                  </span>
                  <span>Free / Low Cost</span>
                </div>
                <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/90 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  <span className="font-extrabold text-teal-400 font-mono">
                    {quickStats.naturalCount}
                  </span>
                  <span>100% Natural Passive</span>
                </div>
                <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/90 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  <span className="font-extrabold text-amber-400 font-mono">
                    {quickStats.diyFriendlyCount}
                  </span>
                  <span>DIY Friendly</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: 100 DESIGNS CATALOGUE */}
        {activeTab === 'catalogue' && (
          <div className="space-y-6">
            {/* Category Quick Selector Chips */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                id="cat-chip-all"
                onClick={() => setFilters((prev) => ({ ...prev, category: 'all' }))}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  filters.category === 'all'
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:border-slate-700 hover:text-white'
                }`}
              >
                All 100 Designs
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  id={`cat-chip-${cat.id}`}
                  onClick={() => setFilters((prev) => ({ ...prev, category: cat.id }))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                    filters.category === cat.id
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20 font-bold'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:border-slate-700 hover:text-white'
                  }`}
                >
                  <span className="font-mono opacity-60 text-[10px] mr-1">{cat.range}</span>
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Filter Toolbar */}
            <Filters
              filters={filters}
              setFilters={setFilters}
              totalResults={filteredDesigns.length}
              onReset={() => setFilters(initialFilters)}
            />

            {/* Designs Grid */}
            {filteredDesigns.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredDesigns.map((design) => (
                  <DesignCard
                    key={design.id}
                    design={design}
                    onSelect={(d) => setSelectedDesign(d)}
                    onToggleSaved={handleToggleSaved}
                    isSaved={savedDesignIds.includes(design.id)}
                    onToggleCompare={handleToggleCompare}
                    isComparing={comparingIds.includes(design.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-12 text-center space-y-3">
                <ThermometerSnowflake className="w-10 h-10 text-slate-500 dark:text-slate-400 mx-auto" />
                <h3 className="text-lg font-bold text-white">No Matching Cooling Designs Found</h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 max-w-sm mx-auto">
                  Try clearing your search query or adjusting active filters to explore more of the 100 architectural techniques.
                </p>
                <button
                  onClick={() => setFilters(initialFilters)}
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-colors"
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: HOUSE ANATOMY */}
        {activeTab === 'anatomy' && (
          <HouseAnatomyView
            onSelectDesign={(d) => setSelectedDesign(d)}
            onFilterZone={handleFilterZone}
          />
        )}

        {/* TAB 3: STRATEGY PLANNER */}
        {activeTab === 'planner' && (
          <CoolingPlanner
            savedDesignIds={savedDesignIds}
            onSelectDesign={(d) => setSelectedDesign(d)}
            onToggleSaved={handleToggleSaved}
            onClearSaved={() => setSavedDesignIds([])}
          />
        )}

        {/* TAB 4: COST / EFFORT MATRIX */}
        {activeTab === 'matrix' && (
          <MatrixView onSelectDesign={(d) => setSelectedDesign(d)} />
        )}

        {/* TAB 5: AI ADVISOR */}
        {activeTab === 'ai-advisor' && (
          <AiAdvisorView
            onSelectDesign={(d) => setSelectedDesign(d)}
            onAddDesignToPlan={handleToggleSaved}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 py-8 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-800 dark:text-slate-200">HITR Architectural Systems</span>
            <span>•</span>
            <span>100 House Cooling Designs Bioclimatic Compendium</span>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setActiveTab('catalogue')}
              className="hover:text-cyan-400 transition-colors"
            >
              Catalogue
            </button>
            <button
              onClick={() => setActiveTab('anatomy')}
              className="hover:text-cyan-400 transition-colors"
            >
              Anatomy
            </button>
            <button
              onClick={() => setActiveTab('planner')}
              className="hover:text-cyan-400 transition-colors"
            >
              Strategy Planner
            </button>
            <button
              onClick={() => setActiveTab('matrix')}
              className="hover:text-cyan-400 transition-colors"
            >
              Matrix
            </button>
            <button
              onClick={() => setActiveTab('ai-advisor')}
              className="text-amber-400 hover:text-amber-300 font-semibold transition-colors"
            >
              AI & Medical Studio
            </button>
          </div>
        </div>
      </footer>

      {/* Deep Blueprint Modal */}
      <DesignDetailModal
        design={selectedDesign}
        onClose={() => setSelectedDesign(null)}
        onToggleSaved={handleToggleSaved}
        isSaved={selectedDesign ? savedDesignIds.includes(selectedDesign.id) : false}
        onToggleCompare={handleToggleCompare}
        isComparing={selectedDesign ? comparingIds.includes(selectedDesign.id) : false}
      />

      {/* Compare Modal */}
      {isCompareModalOpen && (
        <CompareModal
          comparingIds={comparingIds}
          onClose={() => setIsCompareModalOpen(false)}
          onRemoveFromCompare={handleToggleCompare}
          onSelectDesign={(d) => setSelectedDesign(d)}
        />
      )}

      {/* Saved Strategy Plan Drawer */}
      <SavedProjectsDrawer
        isOpen={isSavedDrawerOpen}
        onClose={() => setIsSavedDrawerOpen(false)}
        savedDesignIds={savedDesignIds}
        onRemove={handleToggleSaved}
        onClearAll={() => setSavedDesignIds([])}
        onSelectDesign={(d) => setSelectedDesign(d)}
      />
    </div>
  );
}
