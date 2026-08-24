import MapView from "../components/MapView";
import TopBar from "../components/TopBar";
import BottomBar from "../components/BottomBar";
import type { Units } from "../App";
import type { HeatReading, LandInfo } from "../api";

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
  heatData: HeatReading[] | null;
}

// Full-screen live heat map with tap-to-analyze.
export default function MapScreen(props: MapScreenProps) {
  const {
    center, zoom, title, onSearch, onPick, picked, reading,
    land, loading, units, onToggleUnits, heatData,
  } = props;
  return (
    <div className="relative h-full w-full overflow-hidden">
      <MapView center={center} zoom={zoom} onPick={onPick} heatData={heatData} />
      <TopBar title={title} onSearch={onSearch} units={units} onToggleUnits={onToggleUnits} />
      <BottomBar picked={picked} reading={reading} land={land} loading={loading} units={units} />
    </div>
  );
}
