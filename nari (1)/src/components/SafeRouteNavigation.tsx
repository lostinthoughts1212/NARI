/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import {
  Plus,
  AlertCircle,
  Sun,
  EyeOff,
  Sparkles,
  Loader2,
  MapPin,
  ListFilter,
  CheckCircle2,
} from 'lucide-react';
import { Hazard } from '../types';
import LiveNavMap from './LiveNavMap';
import { HAZARD_COLORS } from '../lib/bhubaneswarData';
import { analyzeHazard } from '../lib/geminiAnalysis';

interface SafeRouteNavigationProps {
  onAddHazard: (hazard: Hazard) => void;
  onVoteHazard?: (id: string) => void;
  hazards: Hazard[];
  metricsPanicScore: number;
}

export default function SafeRouteNavigation({
  onAddHazard,
  onVoteHazard,
  hazards,
  metricsPanicScore,
}: SafeRouteNavigationProps) {

  // ── Mobile Segmented View ──────────────────────────────────────────────────
  const [mobileView, setMobileView] = useState<'map' | 'logs'>('map');

  // ── Log interaction ────────────────────────────────────────────────────────
  const [highlightedHazardId, setHighlightedHazardId] = useState<string | null>(null);
  const [votedIds,   setVotedIds]   = useState<Record<string, boolean>>({});
  const [logFilter,  setLogFilter]  = useState<string>('all');

  // ── Real-time AI analysis cache ────────────────────────────────────────────
  const [hazardAnalyses, setHazardAnalyses] = useState<Record<string, string>>({});
  const [analyzingId,    setAnalyzingId]    = useState<string | null>(null);

  // ── Hazard pin state ───────────────────────────────────────────────────────
  const [hazardType,     setHazardType]     = useState<'unlit' | 'harassment' | 'isolated' | 'cctv_fail'>('unlit');
  const [hazardSeverity, setHazardSeverity] = useState<'medium' | 'high'>('high');
  const [hazardDesc,     setHazardDesc]     = useState<string>('');
  const [isAddingCustomPin,  setIsAddingCustomPin]  = useState<boolean>(false);
  const [isPinMode,          setIsPinMode]          = useState<boolean>(false);
  const [pendingPinCoords,   setPendingPinCoords]   = useState<{ lat: number; lng: number } | null>(null);

  // ── AI analysis trigger ────────────────────────────────────────────────────
  const triggerHazardAnalysis = useCallback(async (hazard: Hazard) => {
    if (hazardAnalyses[hazard.id]) return;
    setAnalyzingId(hazard.id);
    try {
      const text = await analyzeHazard({
        type:        hazard.type,
        severity:    hazard.severity,
        description: hazard.description,
        reporter:    hazard.reporter,
        timeAgo:     hazard.timeAgo,
        votes:       hazard.votes,
      });
      setHazardAnalyses((prev) => ({ ...prev, [hazard.id]: text }));
    } catch {
      setHazardAnalyses((prev) => ({ ...prev, [hazard.id]: 'AI assessment unavailable.' }));
    } finally {
      setAnalyzingId(null);
    }
  }, [hazardAnalyses]);

  // ── Hazard selection: syncs log ↔ map marker + triggers AI analysis ────────
  const handleSelectHazard = useCallback((id: string) => {
    const newId = highlightedHazardId === id ? null : id;
    setHighlightedHazardId(newId);
    if (newId) {
      const h = hazards.find((x) => x.id === newId);
      if (h) triggerHazardAnalysis(h);
    }
  }, [highlightedHazardId, hazards, triggerHazardAnalysis]);

  // ── Pin mode flow ──────────────────────────────────────────────────────────
  const startPinMode = useCallback(() => {
    setIsPinMode(true);
    setIsAddingCustomPin(false);
    setPendingPinCoords(null);
    setMobileView('map'); // Switch to map view on mobile
  }, []);

  const handleMapPinCoords = useCallback((lat: number, lng: number) => {
    setPendingPinCoords({ lat, lng });
    setIsPinMode(false);
    setIsAddingCustomPin(true);
    setMobileView('map');
  }, []);

  const cancelPin = useCallback(() => {
    setIsPinMode(false);
    setIsAddingCustomPin(false);
    setPendingPinCoords(null);
    setHazardDesc('');
  }, []);

  // ── Submit hazard form ─────────────────────────────────────────────────────
  const handleCreateHazardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hazardDesc.trim()) return;

    const newHazard: Hazard = {
      id: `h_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      lat: 50, lng: 50,
      realLat: pendingPinCoords?.lat,
      realLng: pendingPinCoords?.lng,
      type: hazardType,
      severity: hazardSeverity,
      description: hazardDesc,
      reporter: 'NARI Active User (Verified Client)',
      timeAgo: 'Just now',
      votes: 1,
    };

    onAddHazard(newHazard);
    setHazardDesc('');
    setIsAddingCustomPin(false);
    setPendingPinCoords(null);
  };

  const filteredHazards = hazards.filter(
    (h) => logFilter === 'all' || h.type === logFilter
  );

  return (
    <div className="space-y-3" id="routing-engine-panel">
      {/* ── MOBILE VIEW SWITCHER (Segmented control on screens < xl) ── */}
      <div className="xl:hidden flex items-center p-1 bg-[#F9DBBD] border border-[#f0c39c] rounded-2xl shadow-sm">
        <button
          type="button"
          onClick={() => setMobileView('map')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer touch-target ${
            mobileView === 'map' ? 'bg-[#A53860] text-white shadow-sm' : 'text-[#450920] hover:bg-white/40'
          }`}
        >
          <span>🗺️</span>
          <span>Safe Route Map</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileView('logs')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer touch-target ${
            mobileView === 'logs' ? 'bg-[#A53860] text-white shadow-sm' : 'text-[#450920] hover:bg-white/40'
          }`}
        >
          <span>📋</span>
          <span>Community Intel ({hazards.length})</span>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">

        {/* ── LEAFLET MAP CONTAINER (Always visible on desktop, tabbed on mobile) ── */}
        <div className={`xl:col-span-9 flex flex-col xl:min-h-[700px] relative ${mobileView === 'logs' ? 'hidden xl:flex' : 'flex'}`}>

          {/* Context heading */}
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div>
              <h3 className="text-xs font-bold text-[#450920] uppercase tracking-wider font-mono flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#A53860] animate-pulse inline-block" />
                NARI Live Navigation · Bhubaneswar Safe Routes
              </h3>
              <p className="text-[10px] text-[#450920]/80 font-semibold mt-0.5">
                Bhubaneswar danger zones dataset · Real-time safe corridors & community alerts
              </p>
            </div>
            {metricsPanicScore >= 80 && (
              <div className="flex items-center gap-1.5 bg-[#FFA5AB]/30 border border-[#A53860] px-3 py-1 rounded-full text-[10px] font-bold text-[#450920] animate-pulse">
                <AlertCircle className="w-3 h-3 text-[#A53860]" />
                High stress — consider NARI Safe Corridor
              </div>
            )}
          </div>

          {/* Pin-mode instruction banner */}
          {isPinMode && (
            <div className="mb-2 flex items-center justify-between gap-2 px-3 py-2 bg-[#A53860] text-white rounded-xl text-xs font-bold font-mono animate-pulse shadow-md">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>Tap anywhere on the map to drop your hazard marker</span>
              </div>
              <button
                type="button"
                onClick={cancelPin}
                className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-[10px] cursor-pointer transition-all"
              >
                ✕ Cancel
              </button>
            </div>
          )}

          {/* Map canvas */}
          <div className="flex-1 relative">
            <LiveNavMap
              hazards={hazards}
              highlightedHazardId={highlightedHazardId}
              onHazardMarkerClick={handleSelectHazard}
              isPinMode={isPinMode}
              onPinCoords={handleMapPinCoords}
              pendingPinCoords={pendingPinCoords}
            />

            {/* ── FLOATING HAZARD REGISTRATION MODAL / BOTTOM SHEET (Over Map) ── */}
            {!isPinMode && isAddingCustomPin && (
              <div className="absolute inset-x-2 bottom-3 sm:bottom-auto sm:top-14 sm:right-3 sm:left-auto sm:w-88 z-[1005] bg-[#F5EBE0]/98 backdrop-blur-xl border-2 border-[#A53860] rounded-2xl p-4 shadow-2xl animate-slide-up">
                <div className="flex items-center justify-between border-b border-[#f0c39c] pb-2 mb-3">
                  <h3 className="text-xs font-black text-[#A53860] uppercase tracking-widest font-mono flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-[#A53860]" />
                    Register Environmental Threat
                  </h3>
                  <button
                    type="button"
                    onClick={cancelPin}
                    className="text-xs text-[#450920] hover:text-[#A53860] font-bold p-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {pendingPinCoords && (
                  <div className="mb-3 flex items-center gap-1.5 px-2.5 py-1.5 bg-[#A53860]/10 border border-[#A53860]/30 rounded-xl text-[10px] font-mono text-[#450920]">
                    <MapPin className="w-3.5 h-3.5 text-[#A53860] shrink-0" />
                    <span className="font-bold">Coords:</span>
                    {pendingPinCoords.lat.toFixed(5)}, {pendingPinCoords.lng.toFixed(5)}
                  </div>
                )}

                <form onSubmit={handleCreateHazardSubmit} className="space-y-3">
                  <div>
                    <label className="text-[10px] uppercase font-mono text-[#450920] font-bold block mb-1">
                      Hazard Category
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: 'unlit',      label: 'Unlit Area' },
                        { id: 'harassment', label: 'Harassment' },
                        { id: 'isolated',   label: 'Isolated' },
                        { id: 'cctv_fail',  label: 'CCTV Fail' },
                      ].map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => setHazardType(item.id as typeof hazardType)}
                          className={`py-2 px-2 rounded-xl text-[10px] font-bold text-center border font-mono transition-all cursor-pointer touch-target ${
                            hazardType === item.id
                              ? 'border-[#A53860] bg-[#A53860] text-white shadow-sm'
                              : 'border-[#f0c39c] bg-white text-[#450920] hover:bg-[#FFA5AB]/25'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-mono text-[#450920] font-bold block mb-1">
                      Severity Level
                    </label>
                    <div className="flex gap-2">
                      {(['medium', 'high'] as const).map((sev) => (
                        <button
                          type="button"
                          key={sev}
                          onClick={() => setHazardSeverity(sev)}
                          className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold border font-mono transition-all cursor-pointer touch-target ${
                            hazardSeverity === sev
                              ? 'border-[#A53860] bg-[#A53860] text-white shadow-sm'
                              : 'border-[#f0c39c] bg-white text-[#450920] hover:bg-[#FFA5AB]/25'
                          }`}
                        >
                          {sev.toUpperCase()} PRIORITY
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-mono text-[#450920] font-bold block mb-1">
                      Threat Description
                    </label>
                    <input
                      type="text"
                      value={hazardDesc}
                      onChange={(e) => setHazardDesc(e.target.value)}
                      placeholder="e.g. Broken streetlamp, poorly lit lane near gate"
                      className="w-full text-xs p-2.5 rounded-xl border border-[#f0c39c] bg-white text-[#450920] placeholder-[#450920]/45 focus:outline-none focus:border-[#A53860] font-sans font-bold shadow-sm"
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-2 pt-1 justify-end">
                    <button
                      type="button"
                      onClick={cancelPin}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#450920] bg-white hover:bg-[#FFA5AB]/30 border border-[#f0c39c] transition-all font-mono cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!hazardDesc.trim()}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#A53860] hover:bg-[#8c2e50] transition-all font-mono disabled:opacity-50 cursor-pointer shadow-md"
                    >
                      Deploy Pin
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* ── CROWDSOURCED LOG PANEL (Always visible on desktop, tabbed on mobile) ── */}
        <div className={`xl:col-span-3 flex flex-col gap-3 ${mobileView === 'map' ? 'hidden xl:flex' : 'flex'}`}>

          <div className="p-4 bg-[#F9DBBD] rounded-2xl border border-[#f0c39c] shadow-sm flex flex-col gap-3 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
              <h3 className="text-xs font-bold text-[#450920] uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-[#A53860]" />
                Crowdsourced Intel
                <span className="text-[10px] font-normal text-[#A53860] bg-white px-2 py-0.5 rounded-full border border-[#f0c39c]">
                  {hazards.length} Reports
                </span>
              </h3>

              {/* Filter pills */}
              <div className="flex items-center gap-1 text-[9px] font-mono flex-wrap">
                {['all', 'unlit', 'harassment', 'cctv_fail'].map((filterKey) => (
                  <button
                    key={filterKey}
                    type="button"
                    onClick={() => setLogFilter(filterKey)}
                    className={`px-2 py-1 rounded-full uppercase transition-all cursor-pointer font-bold ${
                      logFilter === filterKey
                        ? 'bg-[#A53860] text-white'
                        : 'bg-white text-[#450920] border border-[#f0c39c] hover:bg-[#FFA5AB]/30'
                    }`}
                  >
                    {filterKey === 'cctv_fail' ? 'CCTV' : filterKey}
                  </button>
                ))}
              </div>
            </div>

            {/* Log entries list */}
            <div className="space-y-2 overflow-y-auto flex-grow pr-0.5 max-h-[540px]">
              {filteredHazards.map((item) => {
                const isHL       = highlightedHazardId === item.id;
                const hasVoted   = votedIds[item.id];
                const analysis   = hazardAnalyses[item.id];
                const isAnalyzing = analyzingId === item.id;
                const dotColor   = HAZARD_COLORS[item.type] ?? '#888';

                return (
                  <div key={item.id} className="flex flex-col">
                    <div
                      onClick={() => {
                        handleSelectHazard(item.id);
                        if (window.innerWidth < 1280) {
                          setMobileView('map');
                        }
                      }}
                      className={`p-3 rounded-xl border transition-all flex gap-2 justify-between items-start text-xs cursor-pointer ${
                        isHL
                          ? 'bg-white border-[#A53860] shadow-md ring-1 ring-[#A53860] rounded-b-none'
                          : 'bg-[#F5EBE0] border-[#f0c39c] hover:border-[#A53860]'
                      }`}
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className="text-[8px] font-mono uppercase px-2 py-0.5 rounded-full font-bold text-white shadow-xs"
                            style={{ backgroundColor: dotColor }}
                          >
                            {item.type.replace('_', ' ')}
                          </span>
                          <span className="text-[#450920] font-mono font-bold text-[10px]">{item.timeAgo}</span>
                          <span className="text-[10px] text-[#450920]/60 font-mono truncate max-w-[100px]">
                            {item.reporter}
                          </span>
                        </div>
                        <p className="text-[#450920] font-sans font-bold leading-snug">
                          {item.description}
                        </p>
                        <div className="text-[9px] font-mono text-[#A53860] font-bold flex items-center gap-1">
                          {isHL ? (
                            <span className="flex items-center gap-1">
                              <EyeOff className="w-2.5 h-2.5" />
                              Focused on map · Tap to unfocus
                            </span>
                          ) : (
                            <span>↗ Tap to focus on map + AI audit</span>
                          )}
                        </div>
                      </div>

                      {/* Upvote button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onVoteHazard) onVoteHazard(item.id);
                          else item.votes += 1;
                          setVotedIds((prev) => ({ ...prev, [item.id]: true }));
                        }}
                        className={`px-2.5 py-1.5 rounded-xl border transition-all font-mono text-xs font-bold shadow-sm cursor-pointer shrink-0 flex items-center gap-1 touch-target ${
                          hasVoted
                            ? 'bg-[#A53860] text-white border-[#A53860]'
                            : 'bg-white border-[#f0c39c] text-[#450920] hover:bg-[#FFA5AB]/30'
                        }`}
                        title="Confirm & verify report"
                      >
                        <span>▲</span>
                        <span>{item.votes}</span>
                      </button>
                    </div>

                    {/* AI Safety Analysis Expandable Drawer */}
                    {isHL && (
                      <div className="px-3.5 py-3 bg-white border border-[#A53860] border-t-0 rounded-b-xl shadow-md space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#A53860]" />
                          <span className="text-[10px] font-mono font-bold uppercase text-[#A53860] tracking-wider">
                            NARI AI Incident Assessment
                          </span>
                          {isAnalyzing && (
                            <span className="ml-auto text-[9px] font-mono text-[#450920]/50 italic">
                              analyzing…
                            </span>
                          )}
                        </div>
                        {isAnalyzing ? (
                          <div className="flex items-center gap-2 text-xs text-[#450920]/70 py-1">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#A53860]" />
                            Generating real-time threat response guidance…
                          </div>
                        ) : analysis ? (
                          <p className="text-xs text-[#450920] leading-relaxed font-sans">
                            {analysis}
                          </p>
                        ) : (
                          <p className="text-xs text-[#450920]/50 italic font-sans">
                            Preparing AI assessment…
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredHazards.length === 0 && (
                <div className="p-4 text-center text-xs text-[#450920] font-mono bg-[#F5EBE0] rounded-xl border border-[#f0c39c]">
                  No reports logged under "{logFilter}".
                </div>
              )}
            </div>

            {/* Panel footer */}
            <div className="pt-2 border-t border-[#f0c39c] flex items-center justify-between text-[10px] font-mono text-[#450920] shrink-0">
              <span className="flex items-center gap-1 font-bold">
                <span className="w-2 h-2 rounded-full bg-[#A53860] animate-pulse inline-block" />
                Real-time consensus
              </span>
              <button
                type="button"
                onClick={startPinMode}
                className="text-[#A53860] font-bold hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Pin New Hazard
              </button>
            </div>
          </div>

          {/* Quick-add pin button */}
          <button
            onClick={startPinMode}
            className="w-full bg-[#A53860] text-white px-4 py-3 rounded-xl text-xs uppercase tracking-wider font-bold hover:bg-[#8c2e50] transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer touch-target"
          >
            <Plus className="w-4 h-4" />
            Pin Community Hazard Alert
          </button>
        </div>
      </div>
    </div>
  );
}
