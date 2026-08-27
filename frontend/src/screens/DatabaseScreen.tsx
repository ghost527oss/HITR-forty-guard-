interface DatabaseScreenProps {
  onOpenArchitecturalDesigns: () => void;
  onOpenPlanner: () => void;
  onOpenTools: () => void;
}

interface FolderCardProps {
  icon: string;
  title: string;
  description: string;
  action?: () => void;
  status?: string;
}

function FolderCard({ icon, title, description, action, status }: FolderCardProps) {
  const body = (
    <>
      <span className="text-3xl" aria-hidden="true">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-gray-900">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-gray-600">{description}</span>
        {status && <span className="mt-2 block text-[11px] font-medium text-heat-700">{status}</span>}
      </span>
      {action && <span className="text-gray-400" aria-hidden="true">›</span>}
    </>
  );

  return action ? (
    <button onClick={action} className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-heat-300 hover:bg-heat-50">{body}</button>
  ) : (
    <div className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">{body}</div>
  );
}

// Feature hub for the compact five-item navigation. Existing Planner and Tools
// are kept intact and opened through this screen instead of the bottom bar.
export default function DatabaseScreen({ onOpenArchitecturalDesigns, onOpenPlanner, onOpenTools }: DatabaseScreenProps) {
  return (
    <section className="h-full overflow-y-auto bg-gray-50 px-4 pb-24 pt-6">
      <div className="mx-auto max-w-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-heat-700">HITR library</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">Database</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">Browse HITR knowledge and planning tools without removing the live map workflow.</p>
        <div className="mt-6 space-y-3">
          <FolderCard icon="🏛️" title="Knowledge Set" description="Browse the 100-method cooling design library, comparison tools, house anatomy and offline advisor." action={onOpenArchitecturalDesigns} />
          <FolderCard icon="🌳" title="City Planner" description="Create a location-specific heat intervention plan using the selected map point." action={onOpenPlanner} />
          <FolderCard icon="🧰" title="Tools" description="Open HITR's supporting analysis and reference tools." action={onOpenTools} />
        </div>
      </div>
    </section>
  );
}
