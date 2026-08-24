import { useState } from "react";

// Tool folders shown as image + text cards (like a file/folder browser).
// To add real images: set the `image` field to a URL (Supabase Storage, a
// public image, or a file in /public). To add new folders, add an entry below.
const TOOL_FOLDERS = [
  {
    id: "architecture",
    label: "Architecture",
    emoji: "🏛️",
    image: "",
    desc: "Cool house & building designs, explained simply",
  },
  {
    id: "farming",
    label: "Farming",
    emoji: "🌾",
    image: "",
    desc: "Shelter-belts, crop rows & keeping farms cool",
  },
  {
    id: "first-aid",
    label: "First Aid",
    emoji: "🩹",
    image: "",
    desc: "Heat stroke, exhaustion, dehydration & more",
  },
] as const;

// Placeholder entries inside a folder (empty for now — add via code later).
const FOLDER_CONTENT: Record<string, string[]> = {
  architecture: [],
  farming: [],
  "first-aid": [],
};

export default function ToolsScreen() {
  const [open, setOpen] = useState<string | null>(null);

  if (open) {
    const folder = TOOL_FOLDERS.find((f) => f.id === open)!;
    const items = FOLDER_CONTENT[folder.id];
    return (
      <div className="flex h-full flex-col bg-white pt-12">
        <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
          <button onClick={() => setOpen(null)} className="text-heat-600 font-semibold">
            ‹ Back
          </button>
          <h2 className="font-semibold text-gray-800">{folder.label}</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {items.length === 0 ? (
            <div className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-400">
              This folder is ready. Content will appear here soon.
            </div>
          ) : (
            items.map((t) => <p key={t}>{t}</p>)
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white pt-12">
      <div className="border-b border-gray-200 px-4 py-3">
        <h2 className="font-semibold text-gray-800">Tools</h2>
        <p className="text-xs text-gray-500">Guides & reference for heat resilience</p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {TOOL_FOLDERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setOpen(f.id)}
            className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 p-3 text-left hover:bg-gray-50"
          >
            {/* Image slot — use f.image when you add a URL; emoji is the placeholder */}
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-gray-100 text-3xl">
              {f.image ? <img src={f.image} alt={f.label} className="h-full w-full object-cover" /> : f.emoji}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-800">{f.label}</div>
              <div className="text-xs text-gray-500">{f.desc}</div>
            </div>
            <span className="text-gray-400">›</span>
          </button>
        ))}
        <p className="pt-2 text-center text-[11px] text-gray-400">
          Add images by setting the <code>image</code> URL in ToolsScreen.tsx
        </p>
      </div>
    </div>
  );
}
