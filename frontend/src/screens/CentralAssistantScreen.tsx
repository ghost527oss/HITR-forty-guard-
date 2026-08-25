import { useMemo, useState } from "react";
import type { LandInfo, Plan, HeatReading } from "../api";
import {
  queryOfflineAiEngine,
  type AiQueryResult,
} from "../features/architectural-designs/utils/offlineAiEngine";

interface CentralAssistantScreenProps {
  picked: { lat: number; lng: number } | null;
  reading: HeatReading | null;
  land: LandInfo | null;
  plan: Plan | null;
  onOpenPlanner: () => void;
}

type Message = { role: "user" | "assistant"; text: string; result?: AiQueryResult };

const PROMPTS = [
  "Someone is confused and very hot. What should I do?",
  "How can I cool a west-facing room on a low budget?",
  "What should this hot location prioritise?",
  "How do I protect elderly people during a heatwave?",
];

function contextSummary(reading: HeatReading | null, land: LandInfo | null, plan: Plan | null) {
  if (!reading) return "No selected heat reading yet. Pick a map location to give the assistant local context.";
  const planText = plan ? ` Current planner result: ${plan.interventions.length} interventions.` : " No planner result has been generated yet.";
  return `${reading.temp_f}°F (${reading.risk}) at ${land?.label ?? "selected location"}; source: ${reading.source}.${planText}`;
}

// The active app-wide assistant. Its decision engine is local and deterministic:
// Patch1.0v Knowledge Set records + offlineAiEngine, not Gemini or a paid API.
export default function CentralAssistantScreen({ picked, reading, land, plan, onOpenPlanner }: CentralAssistantScreenProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    text: "I am HITR's free local heat, safety, and cooling-design assistant. I use the Knowledge Set on this device. Select a map point to include its current heat context.",
  }]);
  const summary = useMemo(() => {
    const coordinates = picked ? ` Coordinates: ${picked.lat.toFixed(4)}, ${picked.lng.toFixed(4)}.` : "";
    return `${contextSummary(reading, land, plan)}${coordinates}`;
  }, [picked, reading, land, plan]);

  const send = (raw?: string) => {
    const question = (raw ?? input).trim();
    if (!question) return;
    const result = queryOfflineAiEngine(question);
    const localContext = reading
      ? `\n\nSelected map context: ${summary}`
      : "";
    setMessages((items) => [
      ...items,
      { role: "user", text: question },
      { role: "assistant", result, text: `${result.summary}\n\n${result.keyDirectives.join("\n")}${localContext}` },
    ]);
    setInput("");
  };

  return (
    <section className="flex h-full flex-col bg-white pt-12">
      <header className="border-b border-gray-200 px-4 py-3">
        <h1 className="font-semibold text-gray-900">HITR Assistant</h1>
        <p className="mt-1 text-xs text-gray-600">Free local Knowledge Set reasoning · online heat context when available</p>
        <p className="mt-2 rounded-lg bg-heat-50 p-2 text-[11px] text-heat-900">{summary}</p>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((message, index) => (
          <article key={index} className={`whitespace-pre-line rounded-2xl px-4 py-3 text-sm ${message.role === "user" ? "ml-auto max-w-[82%] bg-heat-600 text-white" : "mr-auto max-w-[92%] bg-gray-100 text-gray-800"}`}>
            {message.text}
            {message.result?.medicalAlert && <p className="mt-3 rounded-lg bg-red-100 p-2 text-xs font-semibold text-red-900">Emergency guidance only — for California, USA only. Call 911 for a life-threatening emergency.</p>}
            {message.result?.recommendedDesigns.length ? <p className="mt-3 text-xs font-medium">Knowledge Set matches: {message.result.recommendedDesigns.slice(0, 3).map((d) => `#${d.id} ${d.name}`).join(" · ")}</p> : null}
          </article>
        ))}
        <div className="flex flex-wrap gap-2">
          {PROMPTS.map((prompt) => <button key={prompt} onClick={() => send(prompt)} className="rounded-full bg-gray-100 px-3 py-1.5 text-left text-xs text-gray-700">{prompt}</button>)}
        </div>
      </div>

      <footer className="border-t border-gray-200 p-3">
        <button onClick={onOpenPlanner} className="mb-2 w-full rounded-xl border border-heat-300 bg-heat-50 px-3 py-2 text-sm font-semibold text-heat-800">Open City Planner and use a change template</button>
        <div className="flex gap-2">
          <input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && send()} placeholder="Ask about symptoms, heat, buildings, or plans…" className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
          <button onClick={() => send()} disabled={!input.trim()} className="rounded-xl bg-heat-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Send</button>
        </div>
      </footer>
    </section>
  );
}
