import { CHANGE_LEVELS, type ChangeLevel } from "../api";
import { X } from "lucide-react";
import type { HeatwaveStatus } from "../planner/uhiFactors";

interface Props {
  pickedTemp?: number | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (level: ChangeLevel) => void;
  hasPicked: boolean;
  loading?: boolean;
  heatwave?: HeatwaveStatus | null;
}

export default function PlanSheet({ open, onClose, onConfirm, hasPicked, loading, heatwave }: Props) {
  if (!open) return null;
  const alert = heatwave?.level === "alert";
  return (
    <div className="absolute inset-0 z-40 flex items-end bg-black/30" onClick={onClose}>
      <section className="w-full rounded-t-3xl bg-white p-5 dark:bg-[var(--hitr-surface)]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex justify-between">
          <h2 className="font-bold">Choose plan scale</h2>
          <button onClick={onClose} aria-label="Close" className="text-gray-500">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {alert && (
          <p className="mb-3 rounded-xl bg-rose-50 p-2 text-xs text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
            Heatwave forecast: prefer <b>Light</b> (trees, shade, water) before rebuilds. {heatwave?.reason}
          </p>
        )}
        {!hasPicked && <p className="mb-3 text-sm text-amber-700">Select a point on the map first.</p>}
        <div className="space-y-2">
          {CHANGE_LEVELS.map((level) => (
            <button
              disabled={!hasPicked || loading}
              key={level.value}
              onClick={() => onConfirm(level.value)}
              className={`block w-full rounded-xl border p-3 text-left disabled:opacity-50 ${
                alert && level.value === 1 ? "border-orange-500 ring-2 ring-orange-400" : ""
              }`}
            >
              <b>{level.label}</b>
              {alert && level.value === 1 ? <span className="ml-2 text-[10px] font-bold text-orange-600">recommended</span> : null}
              <span className="block text-xs text-gray-600">{level.desc}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
