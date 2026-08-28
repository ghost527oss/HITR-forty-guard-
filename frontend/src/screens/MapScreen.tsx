import { useState } from "react";
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
    center, zoom, title, onSearch, onPick, picked, reading,
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

      <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[10px] font-medium text-white shadow">
        Hold <kbd className="rounded bg-white/25 px-1 py-px font-sans">Shift</kbd> + drag to draw a box · Tap to select spot
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