// @ts-nocheck
/**
 * HITR - 100 House Cooling Architectural Designs
 * Offline Bioclimatic & Heat Medical Intelligence Studio
 * 100% Free • Zero API Tokens • Instant On-Device Reasoning
 */

import React, { useState } from 'react';
import { ALL_COOLING_DESIGNS } from '../data/designs';
import { CoolingDesign } from '../types';
import {
  HEAT_MEDICAL_PROTOCOLS,
  MedicalEmergencyProtocol,
} from '../data/medicalKnowledge';
import {
  queryOfflineAiEngine,
  generateOfflineBioclimaticPlan,
  AiQueryResult,
  GeneratedCustomPlan,
} from '../utils/offlineAiEngine';
import {
  Sparkles,
  Send,
  Compass,
  ThermometerSnowflake,
  ShieldCheck,
  ArrowRight,
  AlertTriangle,
  HeartPulse,
  Flame,
  Zap,
  BookOpen,
  DollarSign,
  Droplets,
  Wind,
  Layers,
  CheckCircle2,
  BookmarkPlus,
  HelpCircle,
  Activity,
  Cpu,
  RefreshCw,
} from 'lucide-react';

interface AiAdvisorViewProps {
  onSelectDesign: (design: CoolingDesign) => void;
  onAddDesignToPlan: (id: number) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text?: string;
  result?: AiQueryResult;
  plan?: GeneratedCustomPlan;
  timestamp: string;
}

export const AiAdvisorView: React.FC<AiAdvisorViewProps> = ({
  onSelectDesign,
  onAddDesignToPlan,
}) => {
  // Studio View Mode: 'chat' | 'planner' | 'medical-protocols'
  const [studioMode, setStudioMode] = useState<'chat' | 'planner' | 'medical-protocols'>('chat');

  // Chat State
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: 'Hello! I am your 100% Free & Offline HITR Bioclimatic & Heat Emergency Intelligence Assistant. I am loaded with all 100 architectural cooling designs, building envelope thermodynamics, and clinical heatwave emergency medical protocols. Ask me any question or try the prompts below!',
      timestamp: 'Just now',
    },
  ]);

  // Planner Inputs
  const [climate, setClimate] = useState('Hot-Arid / Desert (e.g. Phoenix, Dubai, Rajasthan)');
  const [houseType, setHouseType] = useState('2-Story Timber/Drywall Home with Asphalt Shingles');
  const [budget, setBudget] = useState('Moderate ($500 – $2,500)');
  const [specificProblem, setSpecificProblem] = useState(
    'Our upstairs bedrooms become an unbearable 34°C oven every evening. AC runs constantly and west-facing windows trap extreme solar heat.'
  );
  const [customPlan, setCustomPlan] = useState<GeneratedCustomPlan | null>(null);

  // Selected Medical Protocol
  const [activeProtocol, setActiveProtocol] = useState<MedicalEmergencyProtocol>(HEAT_MEDICAL_PROTOCOLS[0]);

  // Gallery Prompt Presets
  const galleryPrompts = [
    {
      category: 'Medical Emergency',
      title: 'Heat Stroke First Aid Protocol',
      prompt: 'What are the immediate life-saving medical emergency steps for a person with suspected heat stroke and core temp over 40°C?',
      badge: 'Critical First Aid',
      icon: HeartPulse,
      color: 'border-rose-500/30 text-rose-300 hover:border-rose-500',
    },
    {
      category: 'Architecture',
      title: 'Top Floor / Attic Oven Heat',
      prompt: 'Our second floor attic heats up to 60°C and radiates heat down into our master bedroom until midnight. What are the best retrofits?',
      badge: 'Radiant Purge',
      icon: Flame,
      color: 'border-amber-500/30 text-amber-300 hover:border-amber-500',
    },
    {
      category: 'Renter & DIY',
      title: 'Zero-Dollar Low-Cost Renter Hacks',
      prompt: 'I am renting an apartment and have almost zero budget. What non-invasive hacks can cool my room without drilling?',
      badge: 'DIY Hacks',
      icon: Zap,
      color: 'border-emerald-500/30 text-emerald-300 hover:border-emerald-500',
    },
    {
      category: 'Physics & Climate',
      title: 'High Humidity & Wet Bulb Limits',
      prompt: 'How do we cool a home in extreme tropical humidity where fans don’t feel cool and wet-bulb temperature is dangerous?',
      badge: 'Latent Heat',
      icon: Droplets,
      color: 'border-cyan-500/30 text-cyan-300 hover:border-cyan-500',
    },
    {
      category: 'Disaster / Grid',
      title: 'Power Outage / Blackout Survival',
      prompt: 'How to survive an extreme heatwave during a power outage or blackout with no air conditioning?',
      badge: 'Grid Failure',
      icon: ShieldCheck,
      color: 'border-purple-500/30 text-purple-300 hover:border-purple-500',
    },
    {
      category: 'Vulnerable Groups',
      title: 'Elderly & Infant Heat Protection',
      prompt: 'What are the medical guidelines for protecting elderly grandparents and infants during a 40°C heatwave?',
      badge: 'Vulnerable Care',
      icon: Activity,
      color: 'border-yellow-500/30 text-yellow-300 hover:border-yellow-500',
    },
  ];

  // Submit Question to Offline AI Engine
  const handleSendQuery = (textToSend?: string) => {
    const text = textToSend || query;
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const aiResult = queryOfflineAiEngine(text);

    const aiMsg: ChatMessage = {
      id: `ai-${Date.now()}`,
      sender: 'ai',
      result: aiResult,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setQuery('');
    setStudioMode('chat');
  };

  // Generate Tailored Plan
  const handleGeneratePlan = (e: React.FormEvent) => {
    e.preventDefault();
    const plan = generateOfflineBioclimaticPlan({
      climate,
      houseType,
      budget,
      specificProblem,
    });
    setCustomPlan(plan);
  };

  return (
    <div className="space-y-6">
      {/* Studio Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-100 dark:from-slate-900 via-slate-100 dark:via-slate-900 to-amber-950/30 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>100% Free & Offline Knowledge Engine • Zero API Cost</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-400" />
              Bioclimatic & Heat Medical Intelligence Studio
            </h1>

            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              Instant, comprehensive responses on <strong>heat wave medical emergency protocols</strong>, <strong>clinical first aid</strong>, and <strong>all 100 architectural cooling designs</strong>. Runs entirely on your device with 0 network calls.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
            <button
              id="studio-tab-chat"
              onClick={() => setStudioMode('chat')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                studioMode === 'chat'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                  : 'bg-white/90 dark:bg-slate-950/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:border-slate-700 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask AI Studio</span>
            </button>

            <button
              id="studio-tab-planner"
              onClick={() => setStudioMode('planner')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                studioMode === 'planner'
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-lg shadow-cyan-500/20'
                  : 'bg-white/90 dark:bg-slate-950/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:border-slate-700 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Tailored Masterplan</span>
            </button>

            <button
              id="studio-tab-medical"
              onClick={() => setStudioMode('medical-protocols')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                studioMode === 'medical-protocols'
                  ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/20'
                  : 'bg-white/90 dark:bg-slate-950/80 text-rose-300 border-rose-900/50 hover:border-rose-500/50'
              }`}
            >
              <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
              <span>Medical First Aid Protocols</span>
            </button>
          </div>
        </div>
      </div>

      {/* Emergency Quick Banner */}
      <div className="bg-rose-950/40 border border-rose-800/60 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3 text-rose-200">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 animate-pulse" />
          <div>
            <strong className="text-rose-300 font-bold">Medical Heat Emergency Quick Triage:</strong>
            <span className="ml-1 text-slate-700 dark:text-slate-300">
              Suspecting heat stroke (core temp &gt; 40°C, confusion, slurred speech)?
            </span>
          </div>
        </div>
        <button
          onClick={() => {
            setStudioMode('medical-protocols');
            setActiveProtocol(HEAT_MEDICAL_PROTOCOLS[0]);
          }}
          className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold whitespace-nowrap shadow transition-colors cursor-pointer"
        >
          View Heat Stroke Emergency Protocol
        </button>
      </div>

      {/* MODE 1: CONVERSATIONAL AI STUDIO & PROMPT GALLERY */}
      {studioMode === 'chat' && (
        <div className="space-y-6">
          {/* Curated Prompt Gallery Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>Curated Knowledge Studio Prompts (Click to Ask)</span>
              </h3>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {galleryPrompts.map((card, idx) => {
                const Icon = card.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSendQuery(card.prompt)}
                    className={`p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border text-left transition-all hover:scale-[1.01] flex flex-col justify-between space-y-2 cursor-pointer ${card.color}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        {card.category}
                      </span>
                      <Icon className="w-4 h-4 opacity-80" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{card.title}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {card.prompt}
                      </p>
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 flex items-center gap-1 pt-1">
                      <span>{card.badge}</span>
                      <ArrowRight className="w-3 h-3 ml-auto" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Chat Stream */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Live Offline Intelligence Assistant
                </h3>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                On-Device Engine Active
              </span>
            </div>

            {/* Message Thread */}
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 px-1">{msg.timestamp}</div>

                  {msg.sender === 'user' ? (
                    <div className="max-w-2xl bg-amber-500/20 border border-amber-500/40 text-amber-100 rounded-2xl rounded-tr-sm p-4 text-xs sm:text-sm leading-relaxed shadow-sm">
                      {msg.text}
                    </div>
                  ) : msg.text ? (
                    <div className="max-w-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-2xl rounded-tl-sm p-4 text-xs sm:text-sm leading-relaxed">
                      {msg.text}
                    </div>
                  ) : msg.result ? (
                    <div className="w-full max-w-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-sm p-5 space-y-4 text-slate-800 dark:text-slate-200 shadow-md">
                      {/* Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 dark:border-slate-200 dark:border-slate-800 pb-3">
                        <div>
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            msg.result.category === 'medical-emergency'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : msg.result.category === 'diy-renter-hack'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          }`}>
                            {msg.result.badge}
                          </span>
                          <h4 className="text-sm sm:text-base font-extrabold text-white mt-1">
                            {msg.result.title}
                          </h4>
                        </div>

                        {msg.result.estimatedTempDrop && (
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-400 block font-semibold">Estimated Impact</span>
                            <span className="text-xs font-bold text-emerald-400 font-mono">
                              {msg.result.estimatedTempDrop}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Summary */}
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {msg.result.summary}
                      </p>

                      {/* Key Directives / Step by Step */}
                      <div className="space-y-2 bg-white/90 dark:bg-slate-900/90 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                        <h5 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                          Key Protocols & Architectural Directives:
                        </h5>
                        <ul className="space-y-2 text-xs text-slate-800 dark:text-slate-200">
                          {msg.result.keyDirectives.map((action, i) => (
                            <li key={i} className="flex items-start gap-2 leading-relaxed">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Contraindications if any */}
                      {msg.result.contraindications && (
                        <div className="space-y-1.5 bg-rose-950/30 p-3.5 rounded-xl border border-rose-900/50">
                          <h5 className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>CRITICAL CONTRAINDICATIONS (WHAT NOT TO DO):</span>
                          </h5>
                          <ul className="space-y-1 text-xs text-rose-200">
                            {msg.result.contraindications.map((contra, i) => (
                              <li key={i}>• {contra}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Physics & Scientific Principle */}
                      {msg.result.physicsExplanation && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800/80">
                          <strong className="text-cyan-400 font-semibold">Underlying Thermodynamics & Physics: </strong>
                          <span>{msg.result.physicsExplanation}</span>
                        </div>
                      )}

                      {/* Linked Architectural Designs (Clickable Cards) */}
                      {msg.result.recommendedDesigns.length > 0 && (
                        <div className="space-y-2 pt-2">
                          <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Recommended Catalogue Blueprints:</span>
                          </h5>
                          <div className="grid sm:grid-cols-2 gap-2">
                            {msg.result.recommendedDesigns.map((design) => (
                              <div
                                key={design.id}
                                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 transition-colors flex items-center justify-between gap-2"
                              >
                                <div
                                  onClick={() => onSelectDesign(design)}
                                  className="cursor-pointer space-y-0.5 flex-1"
                                >
                                  <div className="flex items-center space-x-1.5">
                                    <span className="text-[10px] font-mono font-bold text-cyan-400 bg-white dark:bg-slate-950 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-800">
                                      #{design.id}
                                    </span>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase font-semibold">
                                      {design.houseZone}
                                    </span>
                                  </div>
                                  <div className="text-xs font-bold text-white hover:text-cyan-300 transition-colors line-clamp-1">
                                    {design.name}
                                  </div>
                                  <div className="text-[10px] text-emerald-400 font-semibold">
                                    {design.tempDropEstimate} • {design.costLevel}
                                  </div>
                                </div>

                                <button
                                  onClick={() => onAddDesignToPlan(design.id)}
                                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-500 dark:text-slate-400 dark:text-slate-400 transition-colors"
                                  title="Add to Strategy Plan"
                                >
                                  <BookmarkPlus className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            {/* Prompt Input Box */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendQuery();
              }}
              className="pt-2"
            >
              <div className="relative flex items-center">
                <input
                  id="offline-ai-prompt-input"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask any question about heat wave medical emergencies, cooling architecture, DIY hacks, or physics..."
                  className="w-full py-3.5 pl-4 pr-24 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-amber-500 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-colors shadow-inner"
                />
                <button
                  id="send-offline-ai-btn"
                  type="submit"
                  disabled={!query.trim()}
                  className="absolute right-2 flex items-center space-x-1 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span>Ask</span>
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODE 2: CUSTOM BIOCLIMATIC MASTERPLAN GENERATOR */}
      {studioMode === 'planner' && (
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Form: Building Parameters (5 cols) */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center space-x-2">
              <Compass className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Home Bioclimatic Parameters
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
              Specify your regional climate and thermal bottlenecks to generate a custom 3-phase roadmap.
            </p>

            <form onSubmit={handleGeneratePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Local Climate Type
                </label>
                <select
                  value={climate}
                  onChange={(e) => setClimate(e.target.value)}
                  className="w-full py-2.5 px-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="Hot-Arid / Desert (e.g. Phoenix, Dubai, Rajasthan)">Hot-Arid / Desert (High dry-bulb, high diurnal swing)</option>
                  <option value="Hot-Humid / Tropical (e.g. Miami, Bangkok, Mumbai)">Hot-Humid / Tropical (High relative humidity, low wet-bulb depression)</option>
                  <option value="Mediterranean / Dry Summer (e.g. Athens, Southern California)">Mediterranean / Dry Summer (Intense sun, cool ocean nights)</option>
                  <option value="Temperate / Urban Heat Island (e.g. Tokyo, Chicago, London)">Temperate / Urban Heat Island (Concrete thermal trapping)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Building Archetype & Roof Type
                </label>
                <input
                  type="text"
                  value={houseType}
                  onChange={(e) => setHouseType(e.target.value)}
                  placeholder="e.g. 2-Story timber frame with asphalt shingles, flat concrete roof apartment..."
                  className="w-full py-2.5 px-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Target Budget Tier
                </label>
                <select
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full py-2.5 px-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="Zero Dollar / DIY Renter ($0 – $150)">Zero Dollar / DIY Renter ($0 – $150)</option>
                  <option value="Moderate ($500 – $2,500)">Moderate ($500 – $2,500)</option>
                  <option value="Comprehensive Structural ($3,000 – $10,000+)">Comprehensive Structural ($3,000 – $10,000+)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Specific Thermal Discomfort & Issues
                </label>
                <textarea
                  rows={4}
                  value={specificProblem}
                  onChange={(e) => setSpecificProblem(e.target.value)}
                  placeholder="Describe which rooms get hot, times of day, and goals..."
                  className="w-full py-2.5 px-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>Generate Bioclimatic Masterplan (Offline)</span>
              </button>
            </form>
          </div>

          {/* Right Plan View (7 cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            {customPlan ? (
              <div className="space-y-5">
                <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                    Offline Masterplan Generated
                  </span>
                  <h3 className="text-lg sm:text-xl font-extrabold text-white mt-1">
                    {customPlan.title}
                  </h3>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                    {customPlan.summary}
                  </p>
                  <div className="mt-2 text-xs text-cyan-400 font-semibold">
                    Cumulative Thermal Drop: {customPlan.totalTempDrop}
                  </div>
                </div>

                {/* 3 Staged Phases */}
                <div className="space-y-4">
                  {customPlan.phases.map((phase, idx) => (
                    <div
                      key={idx}
                      className="bg-white/90 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 dark:border-slate-200 dark:border-slate-800 pb-2">
                        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                          {phase.phaseName}
                        </h4>
                        <div className="text-[11px] font-mono text-emerald-400 font-semibold">
                          Drop: {phase.estimatedDrop} | Cost: {phase.costEstimate}
                        </div>
                      </div>

                      <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                        {phase.actions.map((act, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{act}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Design Pills */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {phase.recommendedDesigns.map((d) => (
                          <button
                            key={d.id}
                            onClick={() => onSelectDesign(d)}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-cyan-500 hover:text-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-[10px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <span className="text-cyan-400 font-mono">#{d.id}</span>
                            <span>{d.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Medical Preparedness & Warnings */}
                <div className="grid sm:grid-cols-2 gap-4 pt-2">
                  <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-3.5 space-y-1.5">
                    <h5 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Architectural Precautions</span>
                    </h5>
                    <ul className="space-y-1 text-[11px] text-amber-200/90">
                      {customPlan.architecturalWarnings.map((w, i) => (
                        <li key={i}>• {w}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-3.5 space-y-1.5">
                    <h5 className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                      <HeartPulse className="w-3.5 h-3.5" />
                      <span>Medical Heat Preparedness</span>
                    </h5>
                    <ul className="space-y-1 text-[11px] text-rose-200/90">
                      {customPlan.medicalPreparedness.map((m, i) => (
                        <li key={i}>• {m}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-24 text-center space-y-3">
                <Compass className="w-12 h-12 text-cyan-400 mx-auto" />
                <h4 className="text-base font-bold text-white">
                  Configure Your House Parameters
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 max-w-sm mx-auto">
                  Click the button on the left to synthesize a customized 3-stage bioclimatic cooling masterplan completely on-device.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 3: MEDICAL FIRST AID PROTOCOLS EXPLORER */}
      {studioMode === 'medical-protocols' && (
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Protocol List (4 cols) */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-rose-400" />
              <span>Clinical Emergency Protocols</span>
            </h3>

            <div className="space-y-2">
              {HEAT_MEDICAL_PROTOCOLS.map((proto) => (
                <button
                  key={proto.id}
                  onClick={() => setActiveProtocol(proto)}
                  className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                    activeProtocol.id === proto.id
                      ? 'bg-rose-500/20 border-rose-500 text-white shadow-md'
                      : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.2 rounded-full ${
                      proto.severity === 'CRITICAL EMERGENCY'
                        ? 'bg-rose-500 text-white'
                        : proto.severity === 'HIGH ALERT'
                        ? 'bg-orange-500 text-slate-950'
                        : 'bg-yellow-500 text-slate-950'
                    }`}>
                      {proto.severity}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold">{proto.condition}</h4>
                </button>
              ))}
            </div>
          </div>

          {/* Active Protocol Full View (8 cols) */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30">
                  {activeProtocol.severity}
                </span>
                <h3 className="text-lg sm:text-xl font-extrabold text-white mt-1">
                  {activeProtocol.condition}
                </h3>
                <p className="text-xs text-amber-400 font-mono mt-0.5">
                  Core Temp Criterion: {activeProtocol.coreTempThreshold}
                </p>
              </div>
            </div>

            {/* Immediate Life-Saving Steps */}
            <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Immediate Step-by-Step Action Protocol</span>
              </h4>
              <div className="space-y-2 text-xs text-slate-800 dark:text-slate-200">
                {activeProtocol.immediateActions.map((step, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 leading-relaxed font-medium">
                    {step}
                  </div>
                ))}
              </div>
            </div>

            {/* Critical Contraindications */}
            <div className="bg-rose-950/30 p-4 rounded-2xl border border-rose-900/60 space-y-2">
              <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>CRITICAL CONTRAINDICATIONS (DO NOT DO THIS):</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-rose-200">
                {activeProtocol.criticalContraindications.map((contra, i) => (
                  <li key={i} className="leading-relaxed">• {contra}</li>
                ))}
              </ul>
            </div>

            {/* Technical Medical Sub-cards */}
            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                <strong className="text-cyan-400 block uppercase font-bold text-[11px]">
                  Cooling Physics & Method
                </strong>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{activeProtocol.coolingTechnique}</p>
              </div>

              <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                <strong className="text-emerald-400 block uppercase font-bold text-[11px]">
                  Hydration & Fluid Protocol
                </strong>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{activeProtocol.hydrationProtocol}</p>
              </div>

              <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                <strong className="text-amber-400 block uppercase font-bold text-[11px]">
                  When to Activate EMS (911)
                </strong>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{activeProtocol.whenToCallEMS}</p>
              </div>

              <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                <strong className="text-purple-400 block uppercase font-bold text-[11px]">
                  High Risk & Vulnerable Groups
                </strong>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{activeProtocol.specialPopulations}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
