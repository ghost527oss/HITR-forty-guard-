// Screen/view routing for the HITR app.
export type View =
  | "home"
  | "map"
  | "assistant"
  | "planner"
  | "tools"
  | "settings";

export const NAV_ITEMS: { view: View; label: string; icon: string }[] = [
  { view: "home", label: "Home", icon: "🏠" },
  { view: "map", label: "Heat Map", icon: "🗺️" },
  { view: "assistant", label: "Assistant", icon: "🤖" },
  { view: "planner", label: "Planner", icon: "🌳" },
  { view: "tools", label: "Tools", icon: "🧰" },
  { view: "settings", label: "Settings", icon: "⚙️" },
];
