// @ts-nocheck
/**
 * HITR - 100 House Cooling Architectural Designs
 * Navigation Bar with HITR Territorial Branding and Module Switcher
 */

import React from 'react';
import {
  Compass,
  Layers,
  SlidersHorizontal,
  GitCompare,
  Sparkles,
  Bookmark,
  ThermometerSnowflake,
  Menu,
  X,
  Flame,
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'catalogue' | 'anatomy' | 'planner' | 'matrix' | 'compare' | 'ai-advisor';
  setActiveTab: (tab: 'catalogue' | 'anatomy' | 'planner' | 'matrix' | 'compare' | 'ai-advisor') => void;
  savedCount: number;
  compareCount: number;
  onOpenSaved: () => void;
  onOpenCompare: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  savedCount,
  compareCount,
  onOpenSaved,
  onOpenCompare,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navItems = [
    { id: 'catalogue', label: '100 Designs', icon: Layers },
    { id: 'anatomy', label: 'House Anatomy', icon: Compass },
    { id: 'planner', label: 'Strategy Planner', icon: SlidersHorizontal },
    { id: 'matrix', label: 'Cost/Effort Matrix', icon: ThermometerSnowflake },
    { id: 'ai-advisor', label: 'AI & Medical Studio', icon: Sparkles, highlight: true },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Branding */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('catalogue')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-orange-500/20 text-slate-950 font-black text-xl tracking-tight">
              H
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                  HITR <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-semibold border border-cyan-500/30">100 COOLING DESIGNS</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium leading-none hidden sm:block">
                Heat Intelligence & Territorial Resilience Architectural Library
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-inner'
                      : item.highlight
                      ? 'text-amber-400 hover:bg-amber-500/10 border border-amber-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : item.highlight ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Tools */}
          <div className="flex items-center space-x-2">
            {/* Compare Pill */}
            <button
              id="open-compare-btn"
              onClick={onOpenCompare}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                compareCount > 0
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>Compare</span>
              {compareCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-cyan-500 text-slate-950 font-bold text-[10px] flex items-center justify-center">
                  {compareCount}
                </span>
              )}
            </button>

            {/* Saved Plan Pill */}
            <button
              id="open-saved-btn"
              onClick={onOpenSaved}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-amber-300 hover:border-amber-500/30"
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">My Plan</span>
              {savedCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center justify-center">
                  {savedCount}
                </span>
              )}
            </button>

            {/* Mobile menu toggle */}
            <button
              id="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-900 px-4 pt-2 pb-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`mobile-nav-${item.id}`}
                onClick={() => {
                  setActiveTab(item.id as any);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive
                    ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4 text-cyan-400" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
