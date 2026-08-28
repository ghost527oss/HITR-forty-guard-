// Screen/view routing for the HITR app.
import { Bot, Database, Home, Settings, Map as MapIcon, type LucideIcon } from "lucide-react";

export type View =
  | "home"
  | "map"
  | "assistant"
  | "planner"
  | "settings"
  | "database"
  | "architectural_designs"
  | "design_studio"
  | "heat_surface"
  | "city_simulation"
  | "training"
  | "emergency";

// `icon` is a lucide component reference, not an emoji string: emoji render at
// inconsistent sizes across platforms and break the bottom bar's alignment.
export const NAV_ITEMS: { view: View; label: string; icon: LucideIcon }[] = [
  { view: "home", label: "Home", icon: Home },
  { view: "map", label: "Map", icon: MapIcon },
  { view: "assistant", label: "Assistant", icon: Bot },
  { view: "database", label: "Database", icon: Database },
  { view: "settings", label: "Settings", icon: Settings },
];
