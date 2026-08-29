import { useState, useEffect } from "react";
import {
  ChevronRight,
  MapPin,
  Trees,
  Map as MapIcon,
  Bot,
  ShieldAlert,
  Sparkles,
  Building2,
  Droplets,
  Plus,
  RotateCcw,
  ThermometerSun,
  Flame,
  Activity,
  type LucideIcon,
} from "lucide-react";
import type { View } from "../nav";

interface HomeScreenProps {
  onNavigate: (v: View) => void;
  location: string;
  temp: string;
}

const QUICK_ACTIONS: { view: View; label: string; icon: LucideIcon; desc: string; badge: string; color: string }[] = [
  {
    view: "map",
    label: "Heat Map Explorer",
    icon: MapIcon,
    desc: "Interactive heat raster & spatial risk analysis",
    badge: "Live Grid",
    color: "bg-orange-50/80 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 border border-orange-200/50 dark:border-orange-900/30",
  },
  {
    view: "planner",
    label: "City Resilience Planner",
    icon: Trees,
    desc: "Actionable tree canopy, shade & urban cooling plans",
    badge: "Masterplan",
    color: "bg-emerald-50/80 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30",
  },
  {
    view: "architectural_designs",
    label: "Passive Design Studio",
    icon: Building2,
    desc: "Zero-energy architectural & ventilation techniques",
    badge: "Passive 3D",
    color: "bg-indigo-50/80 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/30",
  },
  {
    view: "assistant",
    label: "AI Heat Assistant",
    icon: Bot,
    desc: "Instant grounded medical & architectural guidance",
    badge: "Agentic AI",
    color: "bg-amber-50/80 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30",
  },
];

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
  let riskLevel = { label: "Moderate Risk", color: "text-amber-600 bg-amber-50 border-amber-200", icon: ThermometerSun };
  if (!isNaN(tempNum)) {
    if (tempNum >= 95) {
      riskLevel = { label: "Severe Heat Alert", color: "text-rose-600 bg-rose-50 border-rose-200", icon: Flame };
    } else if (tempNum >= 85) {
      riskLevel = { label: "Elevated Heat", color: "text-orange-600 bg-orange-50 border-orange-200", icon: ThermometerSun };
    } else {
      riskLevel = { label: "Mild / Comfortable", color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: Activity };
    }
  }

  return (
    <div className="flex h-full flex-col bg-slate-50/50 dark:bg-slate-900/90 overflow-y-auto p-4 sm:p-6 pb-20 text-slate-800 dark:text-slate-100">
      {/* Header Badge & Brand */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
          HITR Platform · Resilience Operating System
        </span>
      </div>

      {/* Hero Title */}
      <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
        Master extreme heat & urban microclimates
      </h1>
      <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-light">
        Hyperlocal temperature telemetry, passive cooling strategies, and daily heat wellness tracking.
      </p>

      {/* Essential Daily Utility Trackers Grid */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Water Hydration Tracker */}
        <div className="rounded-2xl bg-white dark:bg-slate-800/80 p-4 shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700/60 transition-all hover:shadow-md">
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

          <div className="mt-3 space-y-1.5">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-bold text-sky-600 dark:text-sky-400 text-sm">
                {waterMl} <span className="text-xs font-normal text-slate-500">ml</span>
              </span>
              <span className="text-[11px] font-semibold text-slate-400">{waterPct}% of daily goal</span>
            </div>
            {/* Progress bar */}
            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-600 transition-all duration-300"
                style={{ width: `${waterPct}%` }}
              />
            </div>
          </div>

          {/* Soft tactile Quick Add Buttons */}
          <div className="mt-3.5 flex items-center gap-2">
            <button
              onClick={() => addWater(250)}
              className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-slate-50 dark:bg-slate-700/50 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 ring-1 ring-slate-200/70 dark:ring-slate-600/50 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-600 dark:hover:text-sky-300 transition-all active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" /> +250 ml
            </button>
            <button
              onClick={() => addWater(500)}
              className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-slate-50 dark:bg-slate-700/50 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 ring-1 ring-slate-200/70 dark:ring-slate-600/50 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-600 dark:hover:text-sky-300 transition-all active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" /> +500 ml
            </button>
          </div>
        </div>

        {/* 2. Target Region & Temperature Card */}
        <div className="rounded-2xl bg-white dark:bg-slate-800/80 p-4 shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700/60 flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 ring-1 ring-orange-200/60 dark:ring-orange-900/40">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-medium text-slate-400">Target Region</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[160px] sm:max-w-[200px]">
                  {location}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[11px] font-medium text-slate-400">Live Reading</div>
              <div className="text-base font-extrabold text-orange-600 dark:text-orange-400">
                {temp}
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/50">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border ${riskLevel.color}`}>
              <riskLevel.icon className="h-3.5 w-3.5" /> {riskLevel.label}
            </span>

            <button
              onClick={() => onNavigate("map")}
              className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-0.5"
            >
              Analyze <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Core Tools Quick Action Navigation */}
      <div className="mt-6 space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 pl-1">
          Core Resilience Tools
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {QUICK_ACTIONS.map((a) => (
            <button
              key={a.view}
              onClick={() => onNavigate(a.view)}
              className="group flex items-center gap-3.5 rounded-2xl bg-white dark:bg-slate-800/80 p-3.5 text-left shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700/60 transition-all hover:scale-[1.01] hover:shadow-md active:scale-[0.99]"
            >
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm ${a.color}`}>
                <a.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors truncate">
                    {a.label}
                  </div>
                  <span className="shrink-0 text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-md">
                    {a.badge}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {a.desc}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      {/* Emergency Callout Card - Soft tactile pill */}
      <button
        onClick={() => onNavigate("emergency")}
        className="mt-5 flex w-full items-center justify-between rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 p-3.5 text-left ring-1 ring-rose-200/80 dark:ring-rose-900/30 text-rose-800 dark:text-rose-300 transition-all hover:bg-rose-100/70 hover:shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <div className="text-xs font-bold">Heat Emergency & 911 Contacts</div>
            <div className="text-[11px] text-rose-600/80 dark:text-rose-400/80">First-aid protocols, shelters & cooling helplines</div>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
      </button>

      <p className="mt-8 text-center text-[11px] text-slate-400 dark:text-slate-500">
        HITR Platform · FortyGuard Hyperlocal Temperature Telemetry
      </p>
    </div>
  );
}
