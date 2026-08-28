import { ChevronRight, MapPin, Bot, Trees, Wrench, Map as MapIcon, type LucideIcon } from "lucide-react";
import type { View } from "../nav";

interface HomeScreenProps {
  onNavigate: (v: View) => void;
  location: string;
  temp: string;
}

const QUICK_ACTIONS: { view: View; label: string; icon: LucideIcon; desc: string }[] = [
  { view: "map", label: "Heat Map", icon: MapIcon, desc: "See live temperature across your city" },
  { view: "assistant", label: "Heat Assistant", icon: Bot, desc: "First aid, emergency, buildings & heat answers" },
  { view: "planner", label: "How much to change", icon: Trees, desc: "Plan trees, shade & water by change level" },
  { view: "tools", label: "Tools", icon: Wrench, desc: "Architecture, farming & first-aid guides" },
];

// Landing screen shown first. Big, clean entry into the app.
export default function HomeScreen({ onNavigate, location, temp }: HomeScreenProps) {
  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-heat-50 to-white p-6 pt-14">
      <div className="mb-1 text-sm font-semibold text-heat-600">HITR · Heat Intelligence</div>
      <h1 className="text-3xl font-bold text-gray-900 leading-tight">
        Be ready for the heat, anywhere.
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        Live heat maps, a grounded assistant, and city-cooling plans for your area.
      </p>

      <div className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow">
        <MapPin className="h-5 w-5 shrink-0 text-heat-600" aria-hidden="true" />
        <div>
          <div className="text-xs text-gray-500">Current location</div>
          <div className="text-sm font-semibold text-gray-800">{location}</div>
        </div>
        <span className="ml-2 rounded-full bg-orange-100 px-2 py-1 text-xs font-bold text-orange-700">
          {temp}
        </span>
      </div>

      <div className="mt-6 space-y-3">
        {QUICK_ACTIONS.map((a) => (
          <button
            key={a.view}
            onClick={() => onNavigate(a.view)}
            className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow hover:bg-gray-50"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-heat-50 text-heat-600">
              <a.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-800">{a.label}</div>
              <div className="text-xs text-gray-500">{a.desc}</div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
          </button>
        ))}
      </div>

      <p className="mt-auto pt-6 text-center text-[11px] text-gray-400">
        First aid guidance is general — for a real emergency call 911.
      </p>
    </div>
  );
}
