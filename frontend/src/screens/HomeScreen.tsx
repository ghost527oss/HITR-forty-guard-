import { ChevronRight, MapPin, Trees, Map as MapIcon, Bot, ShieldAlert, Sparkles, Building2, type LucideIcon } from "lucide-react";
import type { View } from "../nav";

interface HomeScreenProps {
  onNavigate: (v: View) => void;
  location: string;
  temp: string;
}

const QUICK_ACTIONS: { view: View; label: string; icon: LucideIcon; desc: string; color: string }[] = [
  { view: "map", label: "Heat Map Explorer", icon: MapIcon, desc: "Interactive heat raster & location risk analysis", color: "bg-heat-500 text-white" },
  { view: "planner", label: "City Resilience Planner", icon: Trees, desc: "Actionable tree canopy, shade & urban cooling plans", color: "bg-emerald-600 text-white" },
  { view: "architectural_designs", label: "Passive Design Studio", icon: Building2, desc: "Zero-energy architectural & ventilation techniques", color: "bg-indigo-600 text-white" },
  { view: "assistant", label: "AI Heat Assistant", icon: Bot, desc: "Instant grounded medical & architectural guidance", color: "bg-amber-600 text-white" },
];

export default function HomeScreen({ onNavigate, location, temp }: HomeScreenProps) {
  return (
    <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-900 overflow-y-auto p-5 pt-12 text-slate-800 dark:text-slate-100">
      {/* Header Badge */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-heat-100 dark:bg-heat-950/80 px-3 py-1 text-xs font-bold text-heat-700 dark:text-heat-300 ring-1 ring-heat-300 dark:ring-heat-800">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> HITR · Heat Intelligence & Resilience
        </span>
      </div>

      {/* Hero Heading */}
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
        Master extreme heat & build resilient cities.
      </h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Real-time microclimate intelligence, passive cooling design, and ranked urban resilience plans.
      </p>

      {/* Location & Live Temp Card */}
      <div className="mt-5 rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-md ring-1 ring-slate-200 dark:ring-slate-700/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-heat-100 dark:bg-heat-900/50 text-heat-600 dark:text-heat-400">
            <MapPin className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400">Target Region</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">{location}</div>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs font-medium text-slate-400">Live Reading</span>
          <span className="mt-0.5 rounded-full bg-gradient-to-r from-orange-500 to-heat-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
            {temp}
          </span>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="mt-6 space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Core Tools
        </div>
        {QUICK_ACTIONS.map((a) => (
          <button
            key={a.view}
            onClick={() => onNavigate(a.view)}
            className="group flex w-full items-center gap-3.5 rounded-2xl bg-white dark:bg-slate-800 p-4 text-left shadow-sm ring-1 ring-slate-200 dark:ring-slate-700/60 transition-all hover:scale-[1.01] hover:shadow-md active:scale-[0.99]"
          >
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm ${a.color}`}>
              <a.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-heat-600 dark:group-hover:text-heat-400 transition-colors">
                {a.label}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {a.desc}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
          </button>
        ))}
      </div>

      {/* Emergency Callout Card */}
      <button
        onClick={() => onNavigate("emergency")}
        className="mt-5 flex w-full items-center justify-between rounded-2xl bg-rose-50 dark:bg-rose-950/30 p-3.5 text-left ring-1 ring-rose-200 dark:ring-rose-900/40 text-rose-800 dark:text-rose-300 transition-colors hover:bg-rose-100 dark:hover:bg-rose-950/50"
      >
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
          <div>
            <div className="text-xs font-bold">Heat Emergency & 911 Contacts</div>
            <div className="text-[11px] text-rose-600 dark:text-rose-400">First-aid protocols & cooling helplines</div>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
      </button>

      <p className="mt-auto pt-6 text-center text-[11px] text-slate-400 dark:text-slate-500">
        HITR Platform · Bounded Grounded Intelligence Engine
      </p>
    </div>
  );
}
