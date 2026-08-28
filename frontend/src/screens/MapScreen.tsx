import { useState } from "react";
import { Crosshair } from "lucide-react";
import MapView, { type BoxBounds } from "../components/MapView";
import TopBar from "../components/TopBar";
import BottomBar from "../components/BottomBar";
import HeatMapFAB from "../components/HeatMapFAB";
import PlanSheet from "../components/PlanSheet";
import type { Units } from "../App";
import type { HeatReading, HeatCell, LandInfo, ChangeLevel } from "../api";

interface Center {
  lat: number;
  lng: number;
}

interface MapScreenProps {
  center: Center;
  zoom: number;
  title: string;
  onSearch: (q: string) => void;
  onPick: (lat: number, lng: number) => void;
  onClearPick?: () => void;
  picked: { lat: number; lng: number } | null;
  reading: HeatReading | null;
  land: LandInfo | null;
  loading: boolean;
  units: Units;
  onToggleUnits: () => void;
  heatData: HeatCell[] | null;
  onViewSurface?: () => void;
  onAssistant?: () => void;
  onSOS?: () => void;
  onDatabase?: () => void;
  onGeneratePlan?: (level: ChangeLevel) => void;
  planLoading?: boolean;
}

// Full-screen live heat map with FAB menu, iPhone-style plan sheet,
// and shift+drag box-selection (Google Lens style).
export default function MapScreen(props: MapScreenProps) {
  const {
    center, zoom, title, onSearch, onPick, onClearPick, picked, reading,
    land, loading, units, onToggleUnits, heatData, onViewSurface,
    onAssistant, onSOS, onDatabase, onGeneratePlan, planLoading,
  } = props;
  const [planSheetOpen, setPlanSheetOpen] = useState(false);
  const [box, setBox] = useState<BoxBounds | null>(null);

  const handlePlanConfirm = (level: ChangeLevel) => {
    setPlanSheetOpen(false);
    if (onGeneratePlan) onGeneratePlan(level);
  };

  // Suppress unused vars warning for the prop names used by App wiring.
  void box; void setBox;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MapView
        center={center}
        zoom={zoom}
        onPick={onPick}
        onBoxSelected={setBox}
        heatData={heatData}
        selectionBox={box}
        picked={picked}
      />
      <TopBar title={title} onSearch={onSearch} units={units} onToggleUnits={onToggleUnits} />
      <BottomBar
        picked={picked}
        reading={reading}
        land={land}
        loading={loading}
        units={units}
        onViewSurface={onViewSurface}
      />

      {/* Two different things can be selected: the AREA you are looking at
          (set by search) and the SPOT you picked by tapping. Plans, heat
          surface and simulation all act on the SPOT, so surfacing it here
          answers "why won't my plan generate?" before it is asked. */}
      <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-4">
        {picked ? (
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-slate-900/90 py-1.5 pl-3 pr-1.5 text-[10px] font-medium text-white shadow-lg ring-1 ring-white/15">
            <Crosshair className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
            <span>
              Spot {picked.lat.toFixed(4)}, {picked.lng.toFixed(4)}
            </span>
            {onClearPick && (
              <button
                onClick={onClearPick}
                className="rounded-full px-2 py-0.5 text-white/70 transition hover:bg-white/15 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-full bg-slate-900/90 px-3 py-1.5 text-[10px] font-medium text-white shadow-lg ring-1 ring-white/15">
            Tap the map to choose a spot · Hold{" "}
            <kbd className="rounded bg-white/25 px-1 py-px font-sans">Shift</kbd> + drag for an area
          </div>
        )}
      </div>

      <HeatMapFAB
        hasPicked={!!picked}
        onPlan={() => setPlanSheetOpen(true)}
        onAssistant={onAssistant || (() => {})}
        onSOS={onSOS || (() => {})}
        onDatabase={onDatabase || (() => {})}
      />

      <PlanSheet
        open={planSheetOpen}
        onClose={() => setPlanSheetOpen(false)}
        onConfirm={handlePlanConfirm}
        hasPicked={!!picked}
        loading={planLoading}
        pickedTemp={reading?.temp_f ?? null}
      />
    </div>
  );
}