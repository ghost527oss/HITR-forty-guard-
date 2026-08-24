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

const LEVEL_DESC: Record<number, string> = {
  1: "Add trees, shelter-belts, shade & water. The city looks the same.",
  2: "Everything in Light, plus building retrofit & orientation guidance.",
  3: "Plus full block re-plan — layout redesigned while keeping services reachable.",
};

// Full-screen ranked intervention planner.
export default function PlannerScreen(props: PlannerScreenProps) {
  const { changeLevel, onSetChangeLevel, plan, loading, onGenerate, hasPicked, onGoMap } = props;

  return (
    <div className="flex h-full flex-col bg-white pt-12">
      <div className="border-b border-gray-200 px-4 py-3">
        <h2 className="font-semibold text-gray-800">How much do you want to change?</h2>
        <p className="text-xs text-gray-500">{LEVEL_DESC[changeLevel]}</p>
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
            <p className="mt-1 text-xs text-gray-500">{it.impact}</p>
            <p className="mt-1 text-[11px] text-gray-400">{it.why}</p>
          </div>
        ))}
        {plan && (
          <p className="text-center text-[11px] text-gray-400">
            {plan.change_label} plan · {plan.land.label} · {plan.temp_f}°F ({plan.risk})
          </p>
        )}
      </div>
    </div>
  );
}
