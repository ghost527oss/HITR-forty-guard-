import { useState, useEffect } from "react";
import {
  ChevronRight,
  MapPin,
  Sparkles,
  Droplets,
  Plus,
  RotateCcw,
  ThermometerSun,
  Flame,
  Activity,
  Database,
  Search,
  Trees,
} from "lucide-react";
import type { View } from "../nav";

interface HomeScreenProps {
  onNavigate: (v: View) => void;
  location: string;
  temp: string;
}

export default function HomeScreen({ onNavigate, location, temp }: HomeScreenProps) {
  // Water hydration tracking state
  const [waterMl, setWaterMl] = useState(() => {
    const saved = localStorage.getItem("hitr.water-ml");
    return saved ? parseInt(saved, 10) : 1000;
  });
  const goalMl = 2500;

  useEffect(() => {
    localStorage.setItem("hitr.water-ml", waterMl.toString());
  }, [waterMl]);

  const addWater = (amount: number) => {
    setWaterMl((prev) => Math.min(goalMl + 1000, prev + amount));
  };

  const resetWater = () => {
    setWaterMl(0);
  };

  const waterPct = Math.min(100, Math.round((waterMl / goalMl) * 100));

  // Determine heat risk level based on temperature
  const tempNum = parseFloat(temp);
  let riskLevel = { label: "Moderate Heat", color: "text-amber-600 bg-amber-50 border-amber-200", icon: ThermometerSun };
  if (!isNaN(tempNum)) {
    if (tempNum >= 95) {
      riskLevel = { label: "Severe Heat Alert", color: "text-rose-600 bg-rose-50 border-rose-200", icon: Flame };
    } else if (tempNum >= 85) {
      riskLevel = { label: "Elevated Heat", color: "text-orange-600 bg-orange-50 border-orange-200", icon: ThermometerSun };
    } else {
      riskLevel = { label: "Comfortable", color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: Activity };
    }
  }

  return (
    <div className="flex h-full flex-col bg-slate-50/60 dark:bg-slate-900/90 overflow-y-auto p-4 sm:p-6 pb-20 text-slate-800 dark:text-slate-100">
      {/* Header Badge & Brand */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-orange-500" aria-hidden="true" />
          HITR · Heat Intelligence & Spatial Resilience
        </span>
      </div>

      {/* Hero Title */}
      <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
        Spatial Heat Intelligence Overview
      </h1>
      <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-light">
        Hyperlocal temperature telemetry, personal hydration wellness, and urban cooling project database.
      </p>

      {/* Key Status Block: Target Region & Selected Location Temperature */}
      <div className="mt-5 rounded-2xl bg-white dark:bg-slate-800 p-5 shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700/60 transition-all hover:shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 ring-1 ring-orange-200/60 dark:ring-orange-900/40">
              <MapPin className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-400">Target Region & City</div>
              <div className="text-base font-bold text-slate-900 dark:text-white">
                {location}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-700">
            <div>
              <div className="text-[11px] font-medium text-slate-400 text-right">Live Reading</div>
              <div className="text-xl font-black text-orange-600 dark:text-orange-400">
                {temp}
              </div>
            </div>

            <button
              onClick={() => onNavigate("map")}
              className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-orange-600 transition-colors"
            >
              <span>Explore Map</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${riskLevel.color}`}>
            <riskLevel.icon className="h-3.5 w-3.5" /> {riskLevel.label}
          </span>
          <span className="text-[11px] text-slate-400">Region configured in Settings</span>
        </div>
      </div>

      {/* Utilities Grid: Hydration Tracker & Spatial Resilience Database Card */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Water Hydration Tracker */}
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-4 sm:p-5 shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700/60 transition-all hover:shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 ring-1 ring-sky-200/60 dark:ring-sky-900/40">
                  <Droplets className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Hydration Tracker</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Target: {goalMl} ml / day</div>
                </div>
              </div>
              <button
                onClick={resetWater}
                title="Reset Hydration"
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-4 space-y-1.5">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-bold text-sky-600 dark:text-sky-400 text-sm">
                  {waterMl} <span className="text-xs font-normal text-slate-500">ml</span>
                </span>
                <span className="text-[11px] font-semibold text-slate-400">{waterPct}% of daily goal</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-sky-500 transition-all duration-300"
                  style={{ width: `${waterPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => addWater(250)}
              className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-slate-50 dark:bg-slate-700/50 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 ring-1 ring-slate-200/70 dark:ring-slate-600/50 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-600 transition-all active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" /> +250 ml
            </button>
            <button
              onClick={() => addWater(500)}
              className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-slate-50 dark:bg-slate-700/50 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 ring-1 ring-slate-200/70 dark:ring-slate-600/50 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-600 transition-all active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" /> +500 ml
            </button>
          </div>
        </div>

        {/* 2. Resilience Knowledge Base & Spatial Search Card */}
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-4 sm:p-5 shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700/60 transition-all hover:shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-200/60 dark:ring-indigo-900/40">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Resilience Project Database</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Passive designs & cooling plans</div>
                </div>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 font-light leading-relaxed">
              Explore localized cooling interventions, passive ventilation studies, and tree canopy distribution data.
            </p>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => onNavigate("database")}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 py-2.5 text-xs font-bold text-indigo-600 dark:text-indigo-300 ring-1 ring-indigo-200/60 dark:ring-indigo-900/40 hover:bg-indigo-100 transition-all"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Browse Database</span>
            </button>
          </div>
        </div>
      </div>

      {/* Featured Cooling Highlights */}
      <div className="mt-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 p-4 ring-1 ring-emerald-200/60 dark:ring-emerald-900/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trees className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200">Urban Canopy & Cooling Interventions</div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-light">
              Add trees and shade shelters on the map to lower ambient surface heat by up to 5°F.
            </div>
          </div>
        </div>
      </div>

      <p className="mt-auto pt-8 text-center text-[11px] text-slate-400 dark:text-slate-500">
        HITR Platform · FortyGuard Hyperlocal Temperature Telemetry
      </p>
    </div>
  );
}
