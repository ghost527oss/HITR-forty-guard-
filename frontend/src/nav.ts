// Screen/view routing for the HITR app.
export type View =
  | "home"
  | "map"
  | "assistant"
  | "planner"
  | "tools"
  | "settings"
  | "database"
  | "architectural_designs"
  | "heat_surface"
  | "city_simulation"
  | "training"
  | "emergency";

export const NAV_ITEMS: { view: View; label: string; icon: string }[] = [
  { view: "home", label: "Home", icon: "🏠" },
  { view: "map", label: "Map", icon: "🗺️" },
  { view: "assistant", label: "Assistant", icon: "🤖" },
  { view: "database", label: "Database", icon: "🗂️" },
  { view: "settings", label: "Settings", icon: "⚙️" },
];
