import { useState } from "react";
import { Bot, Database, Plus, Siren, Trees, X, type LucideIcon } from "lucide-react";

interface Props {
  hasPicked: boolean;
  onPlan: () => void;
  onAssistant: () => void;
  onSOS: () => void;
  onDatabase: () => void;
}

export default function HeatMapFAB({ hasPicked, onPlan, onAssistant, onSOS, onDatabase }: Props) {
  const [open, setOpen] = useState(false);
  const actions: { icon: LucideIcon; label: string; action: () => void }[] = [
    { icon: Trees, label: "Plan", action: onPlan },
    { icon: Bot, label: "Assistant", action: onAssistant },
    { icon: Siren, label: "SOS", action: onSOS },
    { icon: Database, label: "Database", action: onDatabase },
  ];

  return (
    <div className="absolute bottom-28 right-4 z-20 flex flex-col items-end gap-2">
      {open &&
        actions.map(({ icon: Icon, label, action }) => (
          <button
            key={label}
            onClick={() => {
              setOpen(false);
              action();
            }}
            className="flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-semibold shadow-lg"
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
            {label === "Plan" && !hasPicked ? " · select map point first" : ""}
          </button>
        ))}
      <button
        aria-label={open ? "Close map actions" : "Open map actions"}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-heat-600 text-white shadow-xl transition-transform active:scale-95"
      >
        {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </button>
    </div>
  );
}
