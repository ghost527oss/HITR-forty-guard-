import { useState } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  Crosshair,
  Landmark as LandmarkIcon,
  ListOrdered,
  MapPin,
  Sprout,
  Trees,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ── Planning scopes (P2 area/zoning/point + farm mode) ──────────────────────

export type PlannerScope = "spot" | "block" | "district" | "city" | "farm";

export interface ScopeMeta {
  id: PlannerScope;
  label: string;
  tagline: string;
  /** Classic backend change level (1–3 supported; 4 = vision only). */
  changeLevel: number;
  icon: LucideIcon;
  accent: string;
}

export const SCOPES: ScopeMeta[] = [
  {
    id: "spot",
    label: "Spot retouch",
    tagline: "Fix one hot spot on the real map — trees, shade & water.",
    changeLevel: 1,
    icon: MapPin,
    accent: "from-emerald-400/80 to-teal-500/80",
  },
  {
    id: "block",
    label: "Block retrofit",
    tagline: "One block: building retrofits, cool roofs, orientation.",
    changeLevel: 2,
    icon: Building2,
    accent: "from-sky-400/80 to-indigo-500/80",
  },
  {
    id: "district",
    label: "District re-plan",
    tagline: "Redesign the block layout — streets, shade, water features.",
    changeLevel: 3,
    icon: LandmarkIcon,
    accent: "from-violet-400/80 to-fuchsia-500/80",
  },
  {
    id: "city",
    label: "Whole city",
    tagline: "City-wide masterplan vision — zoning, wind ways, green network.",
    changeLevel: 4,
    icon: Trees,
    accent: "from-amber-400/80 to-heat-600/80",
  },
  {
    id: "farm",
    label: "Farm & garden",
    tagline: "Build a cooling garden or urban farm — food + °C relief.",
    changeLevel: 1,
    icon: Sprout,
    accent: "from-lime-400/80 to-emerald-600/80",
  },
];

interface PlannerStartModalProps {
  open: boolean;
  spot: { lat: number; lng: number } | null;
  locationName: string;
  onClose: () => void;
  onChooseOnMap: () => void;
  onLaunch: (spot: { lat: number; lng: number }, scope: PlannerScope) => void;
  onOpenClassic: () => void;
}

// Premium glass popup: pick WHERE + HOW MUCH to change, then enter the studio.
export default function PlannerStartModal(props: PlannerStartModalProps) {
  const { open, spot, locationName, onClose, onChooseOnMap, onLaunch, onOpenClassic } = props;
  const [scope, setScope] = useState<PlannerScope>("spot");
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
      />
      <div
        className="relative z-10 max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl sm:rounded-3xl
                   bg-gradient-to-b from-slate-900 to-slate-950 ring-1 ring-white/10 shadow-2xl"
        style={{ animation: "hitrModalIn .28s cubic-bezier(.22,1,.36,1)" }}
      >
        <style>{`@keyframes hitrModalIn { from { opacity: 0; transform: translateY(24px) scale(.97);} to { opacity: 1; transform: none; } }`}</style>

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-slate-900/90 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-heat-400">
              City Planner
            </p>
            <h2 className="text-lg font-bold text-white">Start a design</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Dismiss"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 px-5 pb-6 pt-4">
          {/* Step 1 — location */}
          <section>
            <p className="mb-2 text-xs font-semibold text-slate-300">
              <span className="mr-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px]">1</span>
              Choose a place
            </p>
            {spot ? (
              <div className="flex items-center gap-3 rounded-2xl bg-emerald-400/10 px-4 py-3 ring-1 ring-emerald-400/30">
                <MapPin size={18} className="shrink-0 text-emerald-300" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{locationName}</p>
                  <p className="text-[11px] text-slate-400">
                    {spot.lat.toFixed(4)}, {spot.lng.toFixed(4)} — selected on map
                  </p>
                </div>
                <button
                  onClick={onChooseOnMap}
                  className="ml-auto shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:bg-white/20"
                >
                  Change
                </button>
              </div>
            ) : (
              <button
                onClick={onChooseOnMap}
                className="flex w-full items-center justify-center gap-2 rounded-2xl
                           bg-gradient-to-r from-heat-600 to-heat-700 px-4 py-3.5 text-sm font-bold
                           text-white shadow-lg shadow-heat-600/25 transition active:scale-[.98]"
              >
                <Crosshair size={17} />
                Select on map
              </button>
            )}
          </section>

          {/* Step 2 — level of change */}
          <section>
            <p className="mb-2 text-xs font-semibold text-slate-300">
              <span className="mr-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px]">2</span>
              Level of change
            </p>
            <div className="space-y-2">
              {SCOPES.map((s) => {
                const active = scope === s.id;
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => setScope(s.id)}
                    className={`flex w-full items-start gap-3 rounded-2xl px-3.5 py-3 text-left transition
                      ${active ? "bg-white/10 ring-1 ring-heat-400/60" : "bg-white/5 ring-1 ring-white/5 hover:bg-white/10"}`}
                  >
                    <span
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl
                        bg-gradient-to-br ${s.accent} text-white shadow`}
                    >
                      <Icon size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${active ? "text-white" : "text-slate-200"}`}>
                          {s.label}
                        </span>
                        <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-300">
                          L{s.changeLevel}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-4 text-slate-400">{s.tagline}</span>
                    </span>
                    {active && <Check size={16} className="mt-1 shrink-0 text-heat-400" />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Actions */}
          <div className="space-y-2 pt-1">
            <button
              disabled={!spot}
              onClick={() => spot && onLaunch(spot, scope)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl
                         bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3.5 text-sm font-bold
                         text-white shadow-lg shadow-emerald-500/25 transition active:scale-[.98] disabled:opacity-40"
            >
              Launch Design Studio
              <ArrowRight size={16} />
            </button>
            <button
              onClick={onOpenClassic}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium text-slate-400 transition hover:text-slate-200"
            >
              <ListOrdered size={14} />
              Or use the classic ranked-list planner
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
