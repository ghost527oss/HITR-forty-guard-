import { Eye, HardHat, Info, MapPin } from "lucide-react";
import {
  CHANGE_LEVELS,
  type ChangeLevel,
  type Plan,
} from "../api";

interface PlannerScreenProps {
  changeLevel: ChangeLevel;
  onSetChangeLevel: (l: ChangeLevel) => void;
  plan: Plan | null;
  loading: boolean;
  onGenerate: () => void;
  hasPicked: boolean;
  onGoMap: () => void;
}

const COST_COLOR: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
  high: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800",
};

export default function PlannerScreen(props: PlannerScreenProps) {
  const { changeLevel, onSetChangeLevel, plan, loading, onGenerate, hasPicked, onGoMap } = props;
  const activeLevel = CHANGE_LEVELS.find((l) => l.value === changeLevel);

  return (
    <div className="flex h-full flex-col bg-slate-50/60 dark:bg-slate-900/90 pt-10 text-slate-800 dark:text-slate-100 overflow-y-auto pb-20">
      <div className="border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">City Resilience Scope</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-light mt-0.5">{activeLevel?.desc}</p>
      </div>

      <div className="border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-4 sm:px-6 py-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {CHANGE_LEVELS.map((l) => (
            <button
              key={l.value}
              onClick={() => onSetChangeLevel(l.value)}
              className={`flex-1 min-w-[70px] rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                changeLevel === l.value
                  ? "bg-orange-500 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-4 px-4 sm:px-6 py-5 max-w-3xl">
        {!hasPicked && (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 p-4 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200">
            Pick a location on the Heat Map first, then generate a tailored resilience plan for it.
            <button
              onClick={onGoMap}
              className="mt-3 block rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-orange-600 transition-colors"
            >
              Go to Heat Map
            </button>
          </div>
        )}

        {hasPicked && !plan && !loading && (
          <p className="text-xs text-slate-500 dark:text-slate-400">Generate a spatial plan for your selected coordinates.</p>
        )}

        {hasPicked && (
          <button
            onClick={onGenerate}
            disabled={loading}
            className="w-full rounded-2xl bg-slate-900 dark:bg-white py-3.5 text-xs font-bold text-white dark:text-slate-900 shadow-md hover:bg-orange-600 dark:hover:bg-orange-500 dark:hover:text-white transition-all disabled:opacity-50"
          >
            {loading ? "Calculating Spatial Plan…" : "Generate Resilience Plan"}
          </button>
        )}

        {plan && (
          <div className="rounded-2xl bg-white dark:bg-slate-800/80 p-5 ring-1 ring-slate-200/80 dark:ring-slate-700/60 shadow-sm">
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  plan.scale.changes_city
                    ? "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300"
                    : "bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300"
                }`}
              >
                {plan.scale.changes_city ? (
                  <HardHat className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Eye className="h-5 w-5" aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{plan.scale.label}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">— touches {plan.scale.touches}</span>
                </div>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 font-light leading-relaxed">{plan.scale.note}</p>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 dark:border-slate-700/60 pt-3 text-center">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pattern</dt>
                <dd className="mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-200">{plan.pattern_label}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Temp</dt>
                <dd className="mt-0.5 text-xs font-bold text-orange-600 dark:text-orange-400">{plan.temp_f}°F</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Severity</dt>
                <dd className="mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  {plan.heat_severity_pct}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {plan?.note && plan.interventions.length > 0 && (
          <div className="flex gap-2.5 rounded-2xl bg-white dark:bg-slate-800/60 p-3.5 ring-1 ring-slate-200/80 dark:ring-slate-700/60 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <span>{plan.note}</span>
          </div>
        )}

        {plan && plan.interventions.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-800/40 p-6 text-center">
            <Eye className="mx-auto h-6 w-6 text-slate-400" aria-hidden="true" />
            <p className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-200">No interventions proposed</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {plan.note ?? "This scope proposes no physical change."}
            </p>
          </div>
        )}

        {plan && plan.interventions.length > 0 && (
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 pt-2 pl-1">
            {plan.interventions.length} Ranked Actions (Highest Impact First)
          </p>
        )}

        {plan?.interventions.map((it) => (
          <div key={it.rank} className="rounded-2xl bg-white dark:bg-slate-800 p-4 ring-1 ring-slate-200/80 dark:ring-slate-700/60 text-xs shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-extrabold text-orange-600 dark:text-orange-400">#{it.rank}</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                  COST_COLOR[it.cost] ?? "bg-slate-100 text-slate-600"
                }`}
              >
                {it.cost} cost
              </span>
            </div>
            <p className="font-bold text-slate-900 dark:text-white text-xs">{it.what}</p>
            <p className="flex items-start gap-1 text-[11px] text-slate-500 dark:text-slate-400">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" aria-hidden="true" />
              {it.where}
            </p>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{it.impact}</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-light">{it.why}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
