/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FileText, 
  AlertTriangle, 
  Layers, 
  Users, 
  Sparkles, 
  TrendingUp, 
  ShieldAlert, 
  Clock, 
  MapPin, 
  Navigation, 
  Zap, 
  Activity, 
  ChevronRight, 
  CheckCircle2 
} from 'lucide-react';

export default function ProblemDocumentation() {
  const [activeTab, setActiveTab] = useState<'overview' | 'problem' | 'causes' | 'stakeholders' | 'vision'>('overview');

  const stats = [
    { value: "60%+", label: "Women feel unsafe walking alone at night", desc: "Restrictions on freedom of movement", color: "from-[#ef4444] to-[#f43f5e]" },
    { value: "80%", label: "Harassment incidents go unreported", desc: "Due to systemic neglect or fear", color: "from-[#ec4899] to-[#d946ef]" },
    { value: "71%", label: "Feel available routes are unsafe after dark", desc: "No lighting or safety navigation metadata", color: "from-[#f59e0b] to-[#eab308]" },
    { value: "3x", label: "Faster response with live GPS", desc: "Using sensor stress auto-trigger SOS", color: "from-[#10b981] to-[#059669]" },
  ];

  const rootCauses = [
    {
      id: "A",
      title: "Technology Built for Speed, Not Safety",
      desc: "Navigation tools like Google Maps and Apple Maps route users by fastest time or shortest distance. No mainstream platform weights crime data, lighting, or real-time risks.",
      icon: Navigation,
      color: "border-purple-500/30 text-purple-400 bg-purple-500/5"
    },
    {
      id: "B",
      title: "Reactive Emergency Systems",
      desc: "Emergency services are called after an incident. There is no proactive monitoring layer that detects physiological signs of panic (heart rate spikes, accelerometer shaking, etc.).",
      icon: Clock,
      color: "border-pink-500/30 text-pink-400 bg-pink-500/5"
    },
    {
      id: "C",
      title: "Fragmented & Siloed Safety Data",
      desc: "Police crime logs, street lighting audits, CCTV maps, and community hazard alerts exist in isolated places. They are never combined into a real-time safety layer.",
      icon: Layers,
      color: "border-amber-500/30 text-amber-400 bg-amber-500/5"
    },
    {
      id: "D",
      title: "Manual SOS Requires Active Presence of Mind",
      desc: "Existing solutions require a user to unlock their phone and press a button. In real panic or shock, physical freeze or sudden incapacitation makes this impossible.",
      icon: ShieldAlert,
      color: "border-red-500/30 text-red-400 bg-red-500/5"
    },
    {
      id: "E",
      title: "Urban Infrastructure Neglect",
      desc: "Poorly lit lanes, broken CCTV networks, and isolated transit stops are chronic issues. They are rarely tracked systematically or reported with instant transparency.",
      icon: MapPin,
      color: "border-teal-500/30 text-teal-400 bg-teal-500/5"
    },
    {
      id: "F",
      title: "Social Normalisation of Risk",
      desc: "Because safety threats are so frequent, they are falsely treated as individual responsibilities rather than systemic issues requiring proactive technological rescue layers.",
      icon: Users,
      color: "border-indigo-500/30 text-indigo-400 bg-indigo-500/5"
    }
  ];

  const stakeholders = {
    primary: [
      { type: "Working Women", impact: "Women commuting early morning or late night via public transit or on foot." },
      { type: "College Students", impact: "Young students walking between campus, hostels, library, and transit hubs." },
      { type: "Night-Shift Workers", impact: "Nurses, hospitality, and factory staff returning home in highly unsafe hours." },
      { type: "Solo Travellers", impact: "Women navigating brand-new cities without any local safety background." },
      { type: "Elderly & Vulnerable", impact: "Older women with limited quick mobility or manual digital response speed." }
    ],
    secondary: [
      { role: "Families & Trusted Contacts", need: "Need continuous reassurance and instant, hands-free emergency notifications." },
      { role: "Police & Responders", need: "Require immediate precise GPS and physiological context when dispatching help." },
      { role: "Municipal Authorities", need: "Need crowdsourced data regarding broken streetlights or dark zones to upgrade infrastructure." },
      { role: "Employers & Universities", need: "Need to satisfy duty-of-care obligations safely for shifts/study sessions." }
    ]
  };

  const corePillars = [
    { title: "Detect automatically", desc: "No manual action required — stress triggers based on wearable biometrics.", status: "Active" },
    { title: "Alert instantly", desc: "Dispatches location coordinates and stress levels to trusted contacts and police.", status: "Real-time" },
    { title: "Guide proactively", desc: "Reroutes through bright, crowded, and heavily secured streets rather than just fast paths.", status: "AI Powered" },
    { title: "Enrich community", desc: "Enables interactive reports of unlit corners, stalking hotspots, and community warnings.", status: "Live Feed" }
  ];

  return (
    <div className="glass-card rounded-2xl border border-[#ffe4d6] overflow-hidden shadow-sm transition-all duration-300 h-full flex flex-col bg-white" id="nari-doc-panel">
      {/* Upper header section */}
      <div className="p-6 border-b border-[#ffe4d6] bg-[#fff6f0]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#d97706] text-white">
            <FileText className="w-5 h-5 font-bold" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#111827] tracking-tight flex items-center gap-2">
              NARI Analytical Documentation
              <span className="text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-mono border border-amber-300 font-bold">
                Problem Statement & Analysis
              </span>
            </h2>
            <p className="text-xs text-[#374151] font-semibold mt-0.5">NextGen AI powered ROUTE Identification research and architecture specs</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#ffe4d6] bg-[#fff6f0]/50 px-4 overflow-x-auto gap-1">
        {[
          { key: 'overview', label: '1. Executive Overview', icon: Sparkles },
          { key: 'problem', label: '2. Core Problem && Info', icon: AlertTriangle },
          { key: 'causes', label: '3. Root Causes', icon: Layers },
          { key: 'stakeholders', label: '4. Stakeholder Mapping', icon: Users },
          { key: 'vision', label: '5. Technical Solution', icon: ShieldAlert },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                isSelected 
                  ? 'border-[#d97706] text-[#b45309] bg-white font-bold shadow-sm' 
                  : 'border-transparent text-[#374151] hover:text-[#111827] hover:bg-white/50 font-medium'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#d97706]' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content Container */}
      <div className="flex-1 p-6 overflow-y-auto bg-white">
        
        {/* Tab 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6" id="doc-overview">
            <div className="p-5 rounded-xl border border-amber-200 bg-amber-50">
              <h3 className="text-sm font-bold text-amber-900 mb-2 font-mono uppercase tracking-wider">PROJECT DEFINITION</h3>
              <p className="text-sm text-[#111827] font-medium leading-relaxed">
                <strong className="text-[#b45309] font-bold">NARI</strong> stands for <em className="text-[#d97706] not-italic font-bold">NextGen AI powered ROUTE Identification</em>. 
                In Sanskrit and Hindi, <span className="text-rose-800 font-bold italic">Nāri (नारी)</span> means <strong className="text-rose-900">Woman</strong>. The platform is designed to protect physical autonomy, empower secure independence, and combine an advanced IoT wearable stress response system with an AI-driven safety routing engine.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-mono text-[#111827]">
                <span className="px-2.5 py-1 rounded-md bg-white border border-amber-200 font-bold">DEVICE TYPE: IoT physiological Stress-Wearable</span>
                <span className="px-2.5 py-1 rounded-md bg-white border border-amber-200 font-bold">ALGORITHM: Multi-criteria Risk Optimization</span>
                <span className="px-2.5 py-1 rounded-md bg-white border border-amber-200 font-bold">RELEASE VERSION: MVP v1.0 • Hackathon Prototype</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-[#ffe4d6] bg-[#fff6f0]">
                <h4 className="text-xs font-bold text-[#111827] uppercase tracking-widest mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-600"></span> Primary Purpose
                </h4>
                <p className="text-xs text-[#374151] font-medium leading-relaxed">
                  To eliminate the physical and structural barriers of public spaces by providing continuous safety assurances through automatic distress detection, instant peer / emergency alerting, and crowdsourced hazard routes.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-[#ffe4d6] bg-[#fff6f0]">
                <h4 className="text-xs font-bold text-[#111827] uppercase tracking-widest mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span> Technological Lever
                </h4>
                <p className="text-xs text-[#374151] font-medium leading-relaxed">
                  Integrating low-cost consumer wearables (heart rate, gyroscope) with adaptive web tools, utilizing crowd logs and AI scoring models to deliver active identification.
                </p>
              </div>
            </div>

            {/* Document stats */}
            <div>
              <h4 className="text-[11px] font-bold text-[#111827] uppercase tracking-widest mb-3">Key Metrics at a Glance</h4>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {stats.map((stat, i) => (
                  <div key={i} className="p-4 rounded-xl border border-[#ffe4d6] bg-[#fff6f0] flex flex-col justify-between">
                    <div>
                      <span className="text-2xl font-black text-[#d97706]">
                        {stat.value}
                      </span>
                      <p className="text-[11px] text-[#111827] font-bold mt-1 leading-tight">{stat.label}</p>
                    </div>
                    <p className="text-[10px] text-[#4B5563] mt-2 font-mono font-medium">{stat.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: THE CORE PROBLEM */}
        {activeTab === 'problem' && (
          <div className="space-y-6" id="doc-problem">
            <div className="border border-rose-200 p-5 rounded-2xl bg-rose-50/50">
              <span className="text-[9px] uppercase font-mono tracking-widest px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 font-bold">
                01 · The Threat
              </span>
              <h3 className="text-lg font-bold text-[#111827] mt-2 mb-3">Defining the Core Problem</h3>
              <p className="text-sm text-[#374151] font-medium leading-relaxed">
                Women face consistent, measurable physical stress while moving through urban pathways. Navigation maps solve purely for speed and distance, ignoring risk indexes, dark streets, and incident logs. 
              </p>
              <div className="mt-4 p-4 rounded-xl bg-white border border-rose-200">
                <span className="text-[10px] font-mono font-bold text-rose-800 uppercase tracking-widest">CORE SYSTEMIC HOLE:</span>
                <p className="text-xs text-[#111827] font-medium mt-1">
                  No existing consumer system simultaneously <strong>detects distress-signatures automatically</strong> (hands-free), <strong>communicates real-time GPS</strong> via reliable pipelines, AND <strong>guides users proactively along demonstrably brighter/safer pathways</strong>.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-[#ffe4d6] bg-[#fff6f0]">
                <div className="text-rose-700 font-bold font-mono text-xs">DIMENSION 01</div>
                <h4 className="text-[#111827] font-bold text-sm mt-1 mb-1">Physical Stalking/Danger</h4>
                <p className="text-xs text-[#374151] font-medium">Poorly lit, neglected urban corridors, unlit paths and dark lanes that isolate people and lead to high stalking frequency.</p>
              </div>
              <div className="p-4 rounded-xl border border-[#ffe4d6] bg-[#fff6f0]">
                <div className="text-amber-700 font-bold font-mono text-xs">DIMENSION 02</div>
                <h4 className="text-[#111827] font-bold text-sm mt-1 mb-1">Digital Information Gap</h4>
                <p className="text-xs text-[#374151] font-medium">Navigation services lack any infrastructure metadata: lighting statistics, police proximity, localized danger ratings, and crowd clusters.</p>
              </div>
              <div className="p-4 rounded-xl border border-[#ffe4d6] bg-[#fff6f0]">
                <div className="text-rose-700 font-bold font-mono text-xs">DIMENSION 03</div>
                <h4 className="text-[#111827] font-bold text-sm mt-1 mb-1">Delayed Responders</h4>
                <p className="text-xs text-[#374151] font-medium">SOS applications assume manual click-activation, impossible during panic/shock states: resulting in slow, imprecise emergency action.</p>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-[#fff6f0] border border-[#ffe4d6] italic text-[#374151] font-medium text-xs leading-relaxed max-w-full">
              <span className="font-bold text-[#b45309] not-italic block mb-1">💡 Real-Life Scenario:</span>
              &ldquo;Consider a woman walking home from a late shift. She takes what appears to be the shortest route — but it passes through an area with zero active lighting and unmonitored corners. She feels followed, gets frightened, but has her phone inside her bag. She cannot stop to search for it, slide to unlock, and open an app. Traditional systems fail right when things go wrong.&rdquo;
            </div>
          </div>
        )}

        {/* Tab 3: ROOT CAUSES */}
        {activeTab === 'causes' && (
          <div className="space-y-4" id="doc-causes">
            <h3 className="text-sm font-bold text-[#111827] uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-3 bg-pink-500 rounded-sm"></span> Why Does This Problem Persist?
            </h3>
            <p className="text-xs text-[#374151] font-medium">A structured breakdown of overlapping technical, structural, and social factors:</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rootCauses.map((cause) => {
                return (
                  <div key={cause.id} className="p-4 rounded-xl border border-[#ffe4d6] bg-[#fff6f0] flex gap-3 h-full">
                    <div className="flex-shrink-0 flex flex-col items-center">
                      <span className="w-6 h-6 rounded-md flex items-center justify-center bg-[#d97706] text-white font-bold text-xs shadow-sm">
                        {cause.id}
                      </span>
                      <div className="h-full w-[1px] bg-[#ffe4d6] my-2"></div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#111827] mb-1 flex items-center gap-2">
                        {cause.title}
                      </h4>
                      <p className="text-[11px] text-[#374151] font-medium leading-relaxed">{cause.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 4: STAKEHOLDERS */}
        {activeTab === 'stakeholders' && (
          <div className="space-y-6" id="doc-stakeholders">
            <div>
              <h3 className="text-sm font-bold text-[#111827] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <span className="w-1.5 h-3 bg-amber-500 rounded-sm"></span> Primary Target Stakeholders
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {stakeholders.primary.map((item, index) => (
                  <div key={index} className="p-3 bg-[#fff6f0] border border-[#ffe4d6] rounded-xl flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-pink-100 text-pink-700 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#111827]">{item.type}</h4>
                      <p className="text-[11px] text-[#374151] font-medium mt-0.5">{item.impact}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-[#ffe4d6] pt-6">
              <h3 className="text-sm font-bold text-[#111827] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <span className="w-1.5 h-3 bg-purple-600 rounded-sm"></span> Secondary Beneficiaries
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {stakeholders.secondary.map((item, index) => (
                  <div key={index} className="p-3 bg-[#fff6f0] border border-[#ffe4d6] rounded-xl flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#111827]">{item.role}</h4>
                      <p className="text-[11px] text-[#374151] font-medium mt-0.5">{item.need}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: TECHNICAL VISION */}
        {activeTab === 'vision' && (
          <div className="space-y-6" id="doc-vision">
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200">
              <span className="text-[9px] font-mono font-bold tracking-widest uppercase bg-amber-200 text-amber-900 px-3 py-1 rounded-full">
                Unified safety shield
              </span>
              <h3 className="text-base font-bold text-[#111827] mt-3 mb-2">How NARI Bridges the Gap</h3>
              <p className="text-xs text-[#374151] font-medium leading-relaxed">
                NARI acts as an active, preventative, and rapid action ecosystem. By syncing a physiological Stress-Wearable (capturing panic alerts without physical manual trigger) with a cloud-guided optimization engine, NARI helps navigate routes based on safe infrastructure indicators.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {corePillars.map((pillar, i) => (
                <div key={i} className="p-4 rounded-xl border border-[#ffe4d6] bg-[#fff6f0] transition-all flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-[#111827] flex items-center gap-2">
                      <span className="p-1 h-2 w-2 rounded-full bg-[#d97706]"></span>
                      {pillar.title}
                    </h4>
                    <p className="text-[11px] text-[#374151] font-medium mt-1 leading-relaxed">{pillar.desc}</p>
                  </div>
                  <span className="text-[8px] font-mono bg-amber-100 border border-amber-200 px-2 py-0.5 rounded text-amber-900 font-bold uppercase shrink-0">
                    {pillar.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl border border-[#ffe4d6] bg-[#fff6f0]">
              <h4 className="text-xs font-bold text-[#111827] mb-2">First MVP Features Set</h4>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-[#374151] font-bold">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span> Dynamic Hotspot Overlays
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span> Real-Time Wearable Simulation
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span> Automatic Heart-Rate distress spikes
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span> Turn-by-Turn Safe Path Guidance
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span> Single-click Panic Siren Trigger
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-600 font-bold">✓</span> Community Local Incident Pins
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
      
      {/* Footer metadata */}
      <div className="p-4 border-t border-[#ffe4d6] bg-[#fff6f0] text-[10px] text-[#374151] font-mono font-bold flex flex-wrap justify-between items-center gap-2">
        <span>Audience: Hackathon Evaluators / Stakeholders</span>
        <span>Version 1.0 (2026 Archive) • NARI Project</span>
      </div>
    </div>
  );
}
