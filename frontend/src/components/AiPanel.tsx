import { useEffect, useState } from "react";
import {
  askAssistant,
  getKnowledgeStats,
  type AssistantReply,
  type KnowledgeStats,
} from "../api";

const INTENT_HINT: Record<string, string> = {
  emergency: "🆘 Emergency & helplines",
  first_aid: "🩹 First aid",
  buildings: "🏠 Building designs",
  plan: "🗺️ Planning",
  encyclopedia: "📚 Knowledge",
};

// Left-side AI assistant panel: chat with the grounded knowledge assistant,
// plus a small knowledge-base overview.
export default function AiPanel() {
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState<KnowledgeStats | null>(null);

  useEffect(() => {
    getKnowledgeStats().then(setStats).catch(() => {});
  }, []);

  const send = async () => {
    const q = input.trim();
    if (!q || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setBusy(true);
    try {
      const r: AssistantReply = await askAssistant(q);
      const hint = INTENT_HINT[r.intent] ?? "";
      setMessages((m) => [
        ...m,
        { role: "ai", text: `${hint ? hint + "\n\n" : ""}${r.answer}` },
      ]);
    } catch {
      setMessages((m) => [...m, { role: "ai", text: "Sorry, I couldn't reach the assistant right now." }]);
    } finally {
      setBusy(false);
    }
  };

  const suggestions = [
    "What should I do for heat stroke?",
    "How can I build a cool house?",
    "What is a shelter belt?",
    "How do I stay hydrated?",
    "Tell me about urban heat island",
    "Give me emergency numbers",
  ];

  return (
    <aside className="absolute left-3 top-16 bottom-24 z-10 w-72 rounded-2xl bg-white/95 shadow-lg p-4 backdrop-blur flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-gray-800">Heat Assistant</h2>
        {stats && (
          <span className="text-[10px] text-gray-400" title={`Knowledge base: ${stats.source}`}>
            {stats.health_conditions + stats.encyclopedia + stats.buildings} topics
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-2">
        Answers grounded in our knowledge database — first aid, emergency numbers, buildings, heat.
      </p>

      <div className="flex-1 overflow-y-auto space-y-2 mb-2 pr-1">
        {messages.length === 0 && (
          <div className="text-xs text-gray-400 space-y-1.5">
            <p>Try asking:</p>
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => setInput(s)}
                className="block w-full text-left rounded-lg bg-gray-100 px-2 py-1.5 hover:bg-gray-200"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`whitespace-pre-line rounded-xl px-3 py-2 text-sm ${
              m.role === "user"
                ? "bg-heat-600 text-white ml-6"
                : "bg-gray-100 text-gray-800 mr-2"
            }`}
          >
            {m.text}
          </div>
        ))}
        {busy && <p className="text-xs text-gray-400">Thinking…</p>}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask about heat, health, buildings…"
          className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-heat-400"
        />
        <button
          onClick={send}
          disabled={busy || !input.trim()}
          className="rounded-xl bg-heat-600 px-3 py-2 text-white text-sm font-semibold hover:bg-heat-700 disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </aside>
  );
}
