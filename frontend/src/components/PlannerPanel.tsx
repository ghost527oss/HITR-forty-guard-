import {
  CHANGE_LEVELS,
  type ChangeLevel,
  type Plan,
} from "../api";

interface PlannerPanelProps {
  changeLevel: ChangeLevel;
  onSetChangeLevel: (l: ChangeLevel) => void;
  plan: Plan | null;
  loading: boolean;
  onGenerate: () => void;
}

const COST_COLOR: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-red-100 text-red-800",
};

// Right-side panel: choose how much you want to change the city, then view
// the ranked intervention plan.
export default function PlannerPanel({
  changeLevel,
  onSetChangeLevel,
  plan,
  loading,
  onGenerate,
}: PlannerPanelProps) {
  return (
    <aside className="absolute right-3 top-16 bottom-24 z-10 w-72 rounded-2xl bg-white/95 shadow-lg p-4 backdrop-blur flex flex-col">
      <h2 className="font-semibold text-gray-800 mb-1">How much to change?</h2>
      <p className="text-xs text-gray-500 mb-3">
        Light = add trees/shade/water. Medium = + retrofit buildings. Full re-plan =
        redesign the layout.
      </p>

      {/* Change-level selector */}
      <div className="flex gap-1 mb-3">
        {CHANGE_LEVELS.map((l) => (
          <button
            key={l.value}
            onClick={() => onSetChangeLevel(l.value)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
              changeLevel === l.value
                ? "bg-heat-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      <button
        onClick={onGenerate}
        disabled={loading}
        className="w-full rounded-xl bg-heat-600 py-2.5 font-semibold text-white hover:bg-heat-700 disabled:opacity-50"
      >
        {loading ? "Planning…" : "Generate plan"}
      </button>

      {/* Ranked plan */}
      <div className="mt-3 flex-1 overflow-y-auto space-y-2">
        {!plan && !loading && (
          <p className="text-xs text-gray-400">
            Pick a spot on the map and generate a plan.
          </p>
        )}
        {plan?.interventions.map((it) => (
          <div
            key={it.rank}
            className="rounded-xl border border-gray-200 p-3 text-sm"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-heat-700">#{it.rank}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
                  COST_COLOR[it.cost] ?? "bg-gray-100 text-gray-600"
                }`}
              >
                {it.cost}
              </span>
            </div>
            <p className="mt-1 text-gray-800 leading-snug">{it.what}</p>
            <p className="mt-1 text-xs text-gray-500">{it.impact}</p>
          </div>
        ))}
        {plan && (
          <p className="text-[10px] text-gray-400">
            {plan.change_label} plan · {plan.land.label} · {plan.temp_f}°F ({plan.risk})
          </p>
        )}
      </div>
    </aside>
  );
}
