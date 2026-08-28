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
  low: "bg-green-100 text-green-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-red-100 text-red-800",
};

// Level descriptions live in CHANGE_LEVELS (api.ts) — this map used to duplicate
// them and only covered levels 1–3, so 0 and 4 rendered a blank description.

// Full-screen ranked intervention planner.
export default function PlannerScreen(props: PlannerScreenProps) {
  const { changeLevel, onSetChangeLevel, plan, loading, onGenerate, hasPicked, onGoMap } = props;
  const activeLevel = CHANGE_LEVELS.find((l) => l.value === changeLevel);

  return (
    <div className="flex h-full flex-col bg-white pt-12">
      <div className="border-b border-gray-200 px-4 py-3">
        <h2 className="font-semibold text-gray-800">How much do you want to change?</h2>
        <p className="text-xs text-gray-500">{activeLevel?.desc}</p>
      </div>

      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex gap-1">
          {CHANGE_LEVELS.map((l) => (
            <button
              key={l.value}
              onClick={() => onSetChangeLevel(l.value)}
              className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${
                changeLevel === l.value
                  ? "bg-heat-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {!hasPicked && (
          <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
            Pick a location on the Heat Map first, then come back here to generate a plan for it.
            <button
              onClick={onGoMap}
              className="mt-3 block rounded-xl bg-heat-600 px-4 py-2 font-semibold text-white"
            >
              Go to Heat Map
            </button>
          </div>
        )}
        {hasPicked && !plan && !loading && (
          <p className="text-sm text-gray-500">Generate a plan for your picked spot.</p>
        )}
        {hasPicked && (
          <button
            onClick={onGenerate}
            disabled={loading}
            className="w-full rounded-xl bg-heat-600 py-3 font-semibold text-white hover:bg-heat-700 disabled:opacity-50"
          >
            {loading ? "Planning…" : "Generate plan"}
          </button>
        )}

        {/* What this plan actually does. Without this the planner looks like it
            returned nothing: the scale block answers "did anything change, and
            how much of the city does it touch?" */}
        {plan && (
          <div className="rounded-2xl border border-gray-200 p-4">
            <div className="flex items-start gap-2.5">
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  plan.scale.changes_city
                    ? "bg-amber-100 text-amber-700"
                    : "bg-heat-50 text-heat-600"
                }`}
              >
                {plan.scale.changes_city ? (
                  <HardHat className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-1.5">
                  <span className="text-sm font-bold text-gray-900">{plan.scale.label}</span>
                  <span className="text-xs text-gray-500">— touches {plan.scale.touches}</span>
                </div>
                <p className="mt-0.5 text-xs leading-5 text-gray-600">{plan.scale.note}</p>
              </div>
            </div>

            {/* The diagnosis behind the recommendation */}
            <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 text-center">
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-gray-400">Detected</dt>
                <dd className="mt-0.5 text-xs font-semibold text-gray-800">{plan.pattern_label}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-gray-400">Temp</dt>
                <dd className="mt-0.5 text-xs font-semibold text-gray-800">{plan.temp_f}°F</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-gray-400">Severity</dt>
                <dd className="mt-0.5 text-xs font-semibold text-gray-800">
                  {plan.heat_severity_pct}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {plan?.note && plan.interventions.length > 0 && (
          <div className="flex gap-2 rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <span>{plan.note}</span>
          </div>
        )}

        {plan && plan.interventions.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-center">
            <Eye className="mx-auto h-6 w-6 text-gray-400" aria-hidden="true" />
            <p className="mt-2 text-sm font-semibold text-gray-700">No interventions proposed</p>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              {plan.note ?? "This level proposes no physical change."}
            </p>
          </div>
        )}

        {plan && plan.interventions.length > 0 && (
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            {plan.interventions.length} actions, highest impact first
          </p>
        )}

        {plan?.interventions.map((it) => (
          <div key={it.rank} className="rounded-2xl border border-gray-200 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-heat-700">#{it.rank}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                  COST_COLOR[it.cost] ?? "bg-gray-100 text-gray-600"
                }`}
              >
                {it.cost}
              </span>
            </div>
            <p className="mt-1 font-medium text-gray-800">{it.what}</p>
            <p className="mt-1 flex items-start gap-1 text-[11px] text-gray-500">
              <MapPin className="mt-px h-3 w-3 shrink-0 text-gray-400" aria-hidden="true" />
              {it.where}
            </p>
            <p className="mt-1 text-xs text-gray-600">{it.impact}</p>
            <p className="mt-1 text-[11px] text-gray-400">{it.why}</p>
          </div>
        ))}
        {plan && (
          <p className="text-center text-[11px] text-gray-400">
            {plan.change_label} · {plan.land.label} · {plan.temp_f}°F ({plan.risk})
          </p>
        )}
      </div>
    </div>
  );
}
