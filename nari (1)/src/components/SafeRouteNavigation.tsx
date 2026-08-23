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
} from 'lucide-react';
import { Hazard } from '../types';
import LiveNavMap, { HAZARD_COLORS } from './LiveNavMap';
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
    if (hazardAnalyses[hazard.id]) return; // already cached
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
      setHazardAnalyses((prev) => ({ ...prev, [hazard.id]: 'Analysis unavailable.' }));
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
  }, []);

  const handleMapPinCoords = useCallback((lat: number, lng: number) => {
    setPendingPinCoords({ lat, lng });
    setIsPinMode(false);
    setIsAddingCustomPin(true);
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
      id: Math.random().toString(),
      lat: 50, lng: 50, // legacy SVG coords — unused in Leaflet map
      realLat: pendingPinCoords?.lat,
      realLng: pendingPinCoords?.lng,
      type: hazardType,
      severity: hazardSeverity,
      description: hazardDesc,
      reporter: 'NARI Active User (Verified Client)',
      timeAgo: '1m ago',
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
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4" id="routing-engine-panel">

      {/* ── LEAFLET MAP — 9 columns (75%) ── */}
      <div className="xl:col-span-9 flex flex-col" style={{ minHeight: '680px' }}>

        {/* Context heading */}
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div>
            <h3 className="text-xs font-bold text-[#450920] uppercase tracking-wider font-mono flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#A53860] animate-pulse inline-block" />
              NARI Live Navigation · Bhubaneswar Safe Routes
            </h3>
            <p className="text-[10px] text-[#450920] font-semibold mt-0.5">
              Real routing via Valhalla engine · Danger zones from community dataset
            </p>
          </div>
          {metricsPanicScore >= 80 && (
            <div className="flex items-center gap-1.5 bg-[#FFA5AB]/30 border border-[#A53860] px-3 py-1.5 rounded-full text-[10px] font-bold text-[#450920] animate-pulse">
              <AlertCircle className="w-3 h-3 text-[#A53860]" />
              High stress — consider NARI Safe Route
            </div>
          )}
        </div>

        {/* Pin-mode instruction banner above map */}
        {isPinMode && (
          <div className="mb-2 flex items-center gap-2 px-3 py-2 bg-[#A53860] text-white rounded-xl text-xs font-bold font-mono animate-pulse">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            Click anywhere on the map to drop your hazard pin
            <button
              type="button"
              onClick={cancelPin}
              className="ml-auto px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded-lg text-[9px] cursor-pointer transition-all"
            >
              ✕ Cancel
            </button>
          </div>
        )}

        {/* Map — flex-1 fills remaining column height */}
        <div className="flex-1">
          <LiveNavMap
            hazards={hazards}
            highlightedHazardId={highlightedHazardId}
            onHazardMarkerClick={handleSelectHazard}
            isPinMode={isPinMode}
            onPinCoords={handleMapPinCoords}
            pendingPinCoords={pendingPinCoords}
          />
        </div>
      </div>

      {/* ── LOG + FORM PANEL — 3 columns (25%) ── */}
      <div className="xl:col-span-3 flex flex-col gap-4">

        {/* ── PIN MODE waiting prompt ── */}
        {isPinMode && (
          <div className="p-4 bg-[#A53860]/10 border-2 border-[#A53860] border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 text-center min-h-[130px]">
            <MapPin className="w-7 h-7 text-[#A53860] animate-bounce" />
            <p className="text-xs font-bold text-[#450920] font-mono uppercase tracking-wide">
              Tap on the map to place pin
            </p>
            <button
              type="button"
              onClick={cancelPin}
              className="px-3 py-1 rounded-lg text-[10px] font-bold text-[#450920] bg-white hover:bg-[#FFA5AB]/30 border border-[#f0c39c] transition-all font-mono cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}

        {/* ── HAZARD FORM (after pin placed on map) ── */}
        {!isPinMode && isAddingCustomPin && (
          <div className="p-4 bg-[#F9DBBD] border-2 border-[#A53860] rounded-2xl shadow-md">
            <h3 className="text-xs font-bold text-[#A53860] uppercase tracking-widest font-mono mb-3 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-[#A53860]" />
              Register Environmental Threat
            </h3>

            {/* Coords badge */}
            {pendingPinCoords && (
              <div className="mb-3 flex items-center gap-1.5 px-2 py-1.5 bg-[#A53860]/10 border border-[#A53860]/30 rounded-lg text-[9px] font-mono text-[#450920]">
                <MapPin className="w-3 h-3 text-[#A53860] shrink-0" />
                <span className="font-bold">Pinned:</span>
                {pendingPinCoords.lat.toFixed(5)}, {pendingPinCoords.lng.toFixed(5)}
              </div>
            )}

            <form onSubmit={handleCreateHazardSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-mono text-[#450920] font-bold block mb-1">
                  Hazard Type
                </label>
                <div className="grid grid-cols-2 gap-1">
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
                      className={`p-1.5 rounded text-[9px] font-bold text-center border font-mono transition-all cursor-pointer ${
                        hazardType === item.id
                          ? 'border-[#A53860] bg-[#A53860] text-white'
                          : 'border-[#f0c39c] bg-white text-[#450920] hover:bg-[#FFA5AB]/30'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono text-[#450920] font-bold block mb-1">
                  Severity
                </label>
                <div className="flex gap-2">
                  {(['medium', 'high'] as const).map((sev) => (
                    <button
                      type="button"
                      key={sev}
                      onClick={() => setHazardSeverity(sev)}
                      className={`flex-1 p-1.5 rounded text-[10px] font-bold border font-mono transition-all cursor-pointer ${
                        hazardSeverity === sev
                          ? 'border-[#A53860] bg-[#A53860] text-white'
                          : 'border-[#f0c39c] bg-white text-[#450920] hover:bg-[#FFA5AB]/30'
                      }`}
                    >
                      {sev.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono text-[#450920] font-bold block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={hazardDesc}
                  onChange={(e) => setHazardDesc(e.target.value)}
                  placeholder="e.g. Broken streetlamp near campus gate"
                  className="w-full text-xs p-2 rounded-lg border border-[#f0c39c] bg-white text-[#450920] placeholder-[#450920]/50 focus:outline-none focus:border-[#A53860] font-sans font-bold shadow-sm"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={cancelPin}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-[#450920] bg-white hover:bg-[#FFA5AB]/30 border border-[#f0c39c] transition-all font-mono cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!hazardDesc.trim()}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-white bg-[#A53860] hover:bg-[#8c2e50] transition-all font-mono disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  Deploy Pin
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── CROWDSOURCED LOG PANEL ── */}
        {!isPinMode && !isAddingCustomPin && (
          <div className="p-4 bg-[#F9DBBD] rounded-2xl border border-[#f0c39c] shadow-sm flex flex-col gap-3 flex-1">

            <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
              <h3 className="text-xs font-bold text-[#450920] uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-[#A53860]" />
                Live Crowdsourced Logs
                <span className="text-[10px] font-normal text-[#A53860] bg-white px-2 py-0.5 rounded-full border border-[#f0c39c]">
                  {hazards.length} Active
                </span>
              </h3>
              {/* Filter pills */}
              <div className="flex items-center gap-1 text-[9px] font-mono flex-wrap">
                {['all', 'unlit', 'harassment', 'cctv_fail'].map((filterKey) => (
                  <button
                    key={filterKey}
                    type="button"
                    onClick={() => setLogFilter(filterKey)}
                    className={`px-2 py-0.5 rounded-full uppercase transition-all cursor-pointer font-bold ${
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

            {/* Log entries */}
            <div className="space-y-1.5 overflow-y-auto flex-grow pr-0.5" style={{ maxHeight: '480px' }}>
              {filteredHazards.map((item) => {
                const isHL       = highlightedHazardId === item.id;
                const hasVoted   = votedIds[item.id];
                const analysis   = hazardAnalyses[item.id];
                const isAnalyzing = analyzingId === item.id;
                const dotColor   = HAZARD_COLORS[item.type] ?? '#888';

                return (
                  <div key={item.id} className="flex flex-col">
                    {/* Entry card */}
                    <div
                      onClick={() => handleSelectHazard(item.id)}
                      className={`p-2.5 rounded-xl border transition-all flex gap-2 justify-between items-start text-[10px] cursor-pointer ${
                        isHL
                          ? 'bg-white border-[#A53860] shadow-md ring-1 ring-[#A53860] rounded-b-none'
                          : 'bg-[#F5EBE0] border-[#f0c39c] hover:border-[#A53860]'
                      }`}
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Colored type badge */}
                          <span
                            className="text-[8px] font-mono uppercase px-1.5 py-0.5 rounded font-bold text-white"
                            style={{ backgroundColor: dotColor }}
                          >
                            {item.type.replace('_', ' ')}
                          </span>
                          <span className="text-[#450920] font-mono font-bold">{item.timeAgo}</span>
                          <span className="text-[9px] text-[#450920]/60 font-mono truncate max-w-[80px]">
                            {item.reporter}
                          </span>
                        </div>
                        <p className="text-[#450920] font-sans font-bold leading-snug line-clamp-2">
                          {item.description}
                        </p>
                        <div className="text-[8px] font-mono text-[#450920]/60 flex items-center gap-1">
                          {isHL ? (
                            <span className="flex items-center gap-0.5 text-[#A53860] font-bold">
                              <EyeOff className="w-2 h-2" />
                              {item.realLat ? 'Focused on map · click to unfocus' : 'Click to unfocus'}
                            </span>
                          ) : (
                            <span>{item.realLat ? '↗ Click to focus on map + AI analysis' : 'Click to focus'}</span>
                          )}
                        </div>
                      </div>

                      {/* Upvote */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onVoteHazard) onVoteHazard(item.id);
                          else item.votes += 1;
                          setVotedIds((prev) => ({ ...prev, [item.id]: true }));
                        }}
                        className={`px-2 py-1 rounded-lg border transition-all font-mono text-[9px] font-bold shadow-sm cursor-pointer shrink-0 flex items-center gap-0.5 ${
                          hasVoted
                            ? 'bg-[#A53860] text-white border-[#A53860]'
                            : 'bg-white border-[#f0c39c] text-[#450920] hover:bg-[#FFA5AB]/30'
                        }`}
                        title="Confirm / Verify hazard report"
                      >
                        <span>▲</span>
                        <span>{item.votes}</span>
                      </button>
                    </div>

                    {/* ── AI ANALYSIS PANEL (expands below selected entry) ── */}
                    {isHL && (
                      <div className="px-3 py-2.5 bg-white border border-[#A53860] border-t-0 rounded-b-xl shadow-md">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Sparkles className="w-3 h-3 text-[#A53860]" />
                          <span className="text-[9px] font-mono font-bold uppercase text-[#A53860] tracking-wider">
                            NARI-AI Safety Analysis
                          </span>
                          {isAnalyzing && (
                            <span className="ml-auto text-[8px] font-mono text-[#450920]/50 italic">
                              generating…
                            </span>
                          )}
                        </div>
                        {isAnalyzing ? (
                          <div className="flex items-center gap-2 text-[10px] text-[#450920]/60">
                            <Loader2 className="w-3 h-3 animate-spin text-[#A53860]" />
                            Analysing hazard in real-time…
                          </div>
                        ) : analysis ? (
                          <p className="text-[10px] text-[#450920] leading-relaxed font-sans">
                            {analysis}
                          </p>
                        ) : (
                          <p className="text-[10px] text-[#450920]/40 italic font-sans">
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
                  No reports under "{logFilter}".
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-[#f0c39c] flex items-center justify-between text-[9px] font-mono text-[#450920] shrink-0">
              <span className="flex items-center gap-1 font-bold">
                <span className="w-2 h-2 rounded-full bg-[#A53860] animate-pulse inline-block" />
                Community logs sync in real-time
              </span>
              <button
                type="button"
                onClick={startPinMode}
                className="text-[#A53860] font-bold hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" />
                Pin New Hazard
              </button>
            </div>
          </div>
        )}

        {/* Quick-add button */}
        {!isPinMode && !isAddingCustomPin && (
          <button
            onClick={startPinMode}
            className="w-full bg-[#A53860] text-white px-4 py-2.5 rounded-xl text-[10px] uppercase tracking-wider font-bold hover:bg-[#8c2e50] transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Pin Community Hazard Alert
          </button>
        )}
      </div>
    </div>
  );
}
