import ArchitecturalDesigns from "../features/architectural-designs/ArchitecturalDesigns";

// Patch1.0v's complete cooling-design experience is intentionally nested under
// Database, leaving HITR's map, planner and assistant application shell intact.
export default function ArchitecturalDesignsScreen() {
  return <div className="h-full overflow-y-auto"><ArchitecturalDesigns /></div>;
}
