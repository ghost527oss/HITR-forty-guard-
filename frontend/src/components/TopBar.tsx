import type { Units } from "../App";

interface TopBarProps {
  title: string;
  onSearch: (q: string) => void;
  units: Units;
  onToggleUnits: () => void;
}

// Map options / city search bar (structure first — design/polish comes later).
export default function TopBar({ title, onSearch, units, onToggleUnits }: TopBarProps) {
  return (
    <header className="absolute top-0 left-0 right-0 z-10 flex items-center gap-3 p-3">
      <div className="rounded-lg bg-white/90 px-4 py-2 shadow font-semibold">{title}</div>
      <input
        className="flex-1 max-w-md rounded-lg bg-white/90 px-4 py-2 shadow outline-none placeholder:text-gray-500"
        placeholder="Search any city or place…"
        onKeyDown={(e) => {
          if (e.key === "Enter") onSearch((e.target as HTMLInputElement).value);
        }}
      />
      <button
        onClick={onToggleUnits}
        className="rounded-full bg-black/50 px-3 py-1 text-xs text-white"
        title="Switch temperature units"
      >
        {units === "imperial" ? "°F" : "°C"}
      </button>
    </header>
  );
}
