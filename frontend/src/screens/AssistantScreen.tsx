import { useEffect, useRef, useState } from "react";
import {
  Bandage,
  BookOpen,
  Home,
  Map as MapIcon,
  Siren,
  type LucideIcon,
} from "lucide-react";
import {
  askAssistant,
  getKnowledgeStats,
  type AssistantReply,
  type KnowledgeStats,
} from "../api";

const INTENT_META: Record<string, { label: string; icon: LucideIcon }> = {
  emergency: { label: "Emergency & helplines", icon: Siren },
  first_aid: { label: "First aid", icon: Bandage },
  buildings: { label: "Building designs", icon: Home },
  plan: { label: "Planning", icon: MapIcon },
  encyclopedia: { label: "Knowledge", icon: BookOpen },
};

// Labels the answer with the intent the router matched, so a user can see at a
// glance *why* they got this answer. Returns null for unknown intents.
function IntentBadge({ intent }: { intent?: string }) {
  const meta = intent ? INTENT_META[intent] : undefined;
  if (!meta) return null;
  const { icon: Icon, label } = meta;
  return (
    <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-60">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

const SUGGESTIONS = [
  "What should I do for heat stroke?",
  "How can I build a cool house?",
  "What is a shelter belt?",
  "How do I stay hydrated?",
  "Tell me about urban heat island",
  "Give me emergency numbers",
];

// Full-screen grounded chat assistant.
export default function AssistantScreen() {
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string; intent?: string }[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getKnowledgeStats().then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const send = async (raw?: string) => {
    const q = (raw ?? input).trim();
    if (!q || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setBusy(true);
    try {
      const r: AssistantReply = await askAssistant(q);
      setMessages((m) => [...m, { role: "ai", text: r.answer, intent: r.intent }]);
    } catch {
      setMessages((m) => [...m, { role: "ai", text: "Sorry, I couldn't reach the assistant right now." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-white pt-12">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div>
          <h2 className="font-semibold text-gray-800">Heat Assistant</h2>
          <p className="text-xs text-gray-500">Grounded in our knowledge database</p>
        </div>
        {stats && (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">
            {((stats.knowledge?.health_conditions ?? stats.health_conditions ?? 0) +
              (stats.knowledge?.encyclopedia ?? stats.encyclopedia ?? 0) +
              (stats.knowledge?.buildings ?? stats.buildings ?? 0))} topics
          </span>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="text-sm text-gray-500">
            <p className="mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full bg-gray-100 px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-200"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm ${
              m.role === "user"
                ? "ml-auto max-w-[80%] bg-heat-600 text-white"
                : "mr-auto max-w-[85%] bg-gray-100 text-gray-800"
            }`}
          >
            <IntentBadge intent={m.intent} />
            {m.text}
          </div>
        ))}
        {busy && (
          <div className="mr-auto rounded-2xl bg-gray-100 px-4 py-2 text-sm text-gray-400">
            Thinking…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-gray-200 p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask about heat, health, buildings…"
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-heat-400"
          />
          <button
            onClick={() => send()}
            disabled={busy || !input.trim()}
            className="rounded-xl bg-heat-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-heat-700 disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
