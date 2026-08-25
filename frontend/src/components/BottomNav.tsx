import { NAV_ITEMS, type View } from "../nav";

interface BottomNavProps {
  active: View;
  onNavigate: (v: View) => void;
}

// Bottom toolbar: Home, Map, Assistant, Database, Settings.
export default function BottomNav({ active, onNavigate }: BottomNavProps) {
  return (
    <nav className="absolute bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.view;
          return (
            <button
              key={item.view}
              onClick={() => onNavigate(item.view)}
              className={`flex flex-col items-center gap-0.5 py-2 px-1 text-[10px] font-medium transition-colors ${
                isActive ? "text-heat-600" : "text-gray-500"
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
