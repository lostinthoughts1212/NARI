/**
 * LiveNavMap.tsx
 * Real Leaflet-based navigation map for the nari (1) frontend.
 *
 * Features:
 *  - Real safe-route calculation via Valhalla / FastAPI backend
 *  - High-risk danger zone polygon overlays (Bhubaneswar dataset)
 *  - Community hazard markers linked to the Crowdsourced Logs panel
 *  - Highlighted hazard auto-pan when selected from the log
 *  - Hazard pin placement mode (click to drop a new hazard)
 *  - GPS "Use My Location" support
 *  - Alternate route display (dashed lines)
 *  - Live backend status badge
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Polygon,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { fetchSafeRoute, fetchPolygons, type RouteInfo } from '../lib/naviApi';
import { decodePolyline, type LatLng } from '../lib/decode';
import type { Hazard } from '../types';

// ── Fix Leaflet default icon URLs in bundled environments ──────────────────────
// @ts-expect-error – private property
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Route marker icons ─────────────────────────────────────────────────────────
const makeIcon = (color: string) =>
  L.divIcon({
    className: '',
    html: `<div style="
      width:16px;height:16px;border-radius:50%;
      background:${color};border:3px solid rgba(255,255,255,0.9);
      box-shadow:0 2px 10px rgba(0,0,0,0.45);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

const originIcon = makeIcon('#10B981');  // green
const destIcon   = makeIcon('#E91E8C');  // pink
const myLocIcon  = makeIcon('#A53860');  // maroon

// ── Community hazard type colors & icons ───────────────────────────────────────
export const HAZARD_COLORS: Record<string, string> = {
  unlit:       '#F59E0B',  // amber
  harassment:  '#EF4444',  // red
  cctv_fail:   '#F97316',  // orange
  isolated:    '#8B5CF6',  // purple
  police_spot: '#10B981',  // teal
};

const makeHazardIcon = (type: string, highlighted: boolean) =>
  L.divIcon({
    className: '',
    html: `<div style="
      width:${highlighted ? 22 : 13}px;
      height:${highlighted ? 22 : 13}px;
      border-radius:50%;
      background:${HAZARD_COLORS[type] ?? '#888'};
      border:${highlighted ? '3px' : '2px'} solid rgba(255,255,255,0.95);
      box-shadow:0 0 ${highlighted ? '16px 8px' : '6px 2px'} ${HAZARD_COLORS[type] ?? '#888'};
      transition: all 0.25s ease;
    "></div>`,
    iconSize:   [highlighted ? 22 : 13, highlighted ? 22 : 13],
    iconAnchor: [highlighted ? 11 : 6,  highlighted ? 11 : 6],
  });

const makePendingPinIcon = () =>
  L.divIcon({
    className: '',
    html: `<div style="
      width:22px;height:22px;border-radius:50%;
      background:#A53860;
      border:3px solid rgba(255,255,255,0.95);
      box-shadow:0 0 20px 8px rgba(165,56,96,0.6);
      animation:ping 1s cubic-bezier(0,0,0.2,1) infinite;
    "></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

type TapMode = 'origin' | 'destination';

// Bhubaneswar map center
const BBSR_CENTER: [number, number] = [20.2961, 85.8245];

// ── Sub-components ─────────────────────────────────────────────────────────────

function MapClickHandler({
  tapMode,
  onMapPress,
  isPinMode,
  onPinCoords,
}: {
  tapMode: TapMode;
  onMapPress: (latlng: { lat: number; lng: number }) => void;
  isPinMode?: boolean;
  onPinCoords?: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (e) => {
      if (isPinMode) {
        onPinCoords?.(e.latlng.lat, e.latlng.lng);
      } else {
        onMapPress(e.latlng);
      }
    },
  });
  return null;
}

function MapFitter({ coords }: { coords: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length > 1) {
      const bounds = L.latLngBounds(coords.map((c) => [c.latitude, c.longitude]));
      map.fitBounds(bounds, { padding: [60, 60] });
    }
  }, [coords, map]);
  return null;
}

// Smoothly pans the map to a highlighted hazard
function HazardFocuser({ target }: { target: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.setView([target.latitude, target.longitude], 16, { animate: true });
  }, [target, map]);
  return null;
}

// ── Props interface ────────────────────────────────────────────────────────────
export interface LiveNavMapProps {
  hazards?: Hazard[];
  highlightedHazardId?: string | null;
  onHazardMarkerClick?: (id: string) => void;
  isPinMode?: boolean;
  onPinCoords?: (lat: number, lng: number) => void;
  pendingPinCoords?: { lat: number; lng: number } | null;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function LiveNavMap({
  hazards = [],
  highlightedHazardId = null,
  onHazardMarkerClick,
  isPinMode = false,
  onPinCoords,
  pendingPinCoords = null,
}: LiveNavMapProps) {
  const [origin,      setOrigin]      = useState<LatLng | null>(null);
  const [destination, setDestination] = useState<LatLng | null>(null);
  const [tapMode,     setTapMode]     = useState<TapMode>('origin');
  const [myLocation,  setMyLocation]  = useState<LatLng | null>(null);

  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [altRoutes,   setAltRoutes]   = useState<LatLng[][]>([]);
  const [dangerZones, setDangerZones] = useState<LatLng[][]>([]);

  const [loading,       setLoading]       = useState(false);
  const [loadingZones,  setLoadingZones]  = useState(true);
  const [locLoading,    setLocLoading]    = useState(false);
  const [routeInfo,     setRouteInfo]     = useState<RouteInfo | null>(null);
  const [avoidDanger,   setAvoidDanger]   = useState(true);
  const [backendOnline, setBackendOnline] = useState(false);
  const [errorMsg,      setErrorMsg]      = useState<string | null>(null);
  const [fitCoords,     setFitCoords]     = useState<LatLng[]>([]);

  // ── Compute focus target from highlighted hazard ────────────────────────────
  const focusTarget = useMemo<LatLng | null>(() => {
    if (!highlightedHazardId) return null;
    const h = hazards.find((x) => x.id === highlightedHazardId);
    return h?.realLat !== undefined && h?.realLng !== undefined
      ? { latitude: h.realLat, longitude: h.realLng }
      : null;
  }, [highlightedHazardId, hazards]);

  // ── Load danger zones on mount ─────────────────────────────────────────────
  useEffect(() => {
    fetchPolygons()
      .then((data) => {
        const zones = data.polygons.map((poly) =>
          poly.map(([lon, lat]: [number, number]) => ({ latitude: lat, longitude: lon }))
        );
        setDangerZones(zones);
        setBackendOnline(true);
      })
      .catch(() => setBackendOnline(false))
      .finally(() => setLoadingZones(false));
  }, []);

  // ── Map click handler ──────────────────────────────────────────────────────
  const handleMapPress = useCallback(
    (latlng: { lat: number; lng: number }) => {
      const coord: LatLng = { latitude: latlng.lat, longitude: latlng.lng };
      setRouteCoords([]);
      setAltRoutes([]);
      setRouteInfo(null);
      setFitCoords([]);
      setErrorMsg(null);
      if (tapMode === 'origin') {
        setOrigin(coord);
        setTapMode('destination');
      } else {
        setDestination(coord);
        setTapMode('origin');
      }
    },
    [tapMode]
  );

  // ── GPS location ───────────────────────────────────────────────────────────
  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by this browser.');
      return;
    }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coord: LatLng = {
          latitude:  pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        setMyLocation(coord);
        setOrigin(coord);
        setTapMode('destination');
        setRouteCoords([]);
        setAltRoutes([]);
        setRouteInfo(null);
        setFitCoords([coord]);
        setLocLoading(false);
      },
      () => {
        setErrorMsg('Could not get your location. Please allow location access.');
        setLocLoading(false);
      },
      { enableHighAccuracy: true }
    );
  }, []);

  // ── Fetch safe route ───────────────────────────────────────────────────────
  const handleGetRoute = useCallback(async () => {
    if (!origin || !destination) {
      setErrorMsg('Click the map to set a start point and destination.');
      return;
    }
    setLoading(true);
    setRouteCoords([]);
    setAltRoutes([]);
    setRouteInfo(null);
    setErrorMsg(null);
    try {
      const resp = await fetchSafeRoute({
        start_lat: origin.latitude,
        start_lon: origin.longitude,
        end_lat:   destination.latitude,
        end_lon:   destination.longitude,
        costing: 'pedestrian',
        avoid_danger_zones: avoidDanger,
      });

      if (resp.trip?.legs?.[0]?.shape) {
        const coords = decodePolyline(resp.trip.legs[0].shape);
        setRouteCoords(coords);
        setFitCoords(coords);
        setRouteInfo({
          distance: resp.trip.summary.length,
          time:     Math.round(resp.trip.summary.time / 60),
          warning:  resp.warning,
        });
      }
      if (resp.alternates) {
        const alts = (resp.alternates as RouteInfo[])
          .filter((a: any) => a.trip?.legs?.[0]?.shape)
          .map((a: any) => decodePolyline(a.trip.legs[0].shape));
        setAltRoutes(alts);
      }
    } catch (e: any) {
      setErrorMsg(
        backendOnline
          ? `Could not calculate route. ${e.message}`
          : 'Backend is offline. Run: docker-compose up in the navsys/ directory.'
      );
    } finally {
      setLoading(false);
    }
  }, [origin, destination, avoidDanger, backendOnline]);

  // ── Clear all ──────────────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    setOrigin(null);
    setDestination(null);
    setMyLocation(null);
    setRouteCoords([]);
    setAltRoutes([]);
    setRouteInfo(null);
    setTapMode('origin');
    setErrorMsg(null);
    setFitCoords([]);
  }, []);

  const formatDist = (km: number) =>
    km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(2)} km`;

  return (
    <div className="flex flex-col h-full min-h-[520px] rounded-2xl overflow-hidden border border-[#f0c39c] shadow-sm bg-[#0f0814]">

      {/* Leaflet cursor + animation overrides */}
      <style>{`
        .leaflet-container { cursor: ${isPinMode ? 'cell' : 'crosshair'} !important; }
        .leaflet-control-attribution { font-size: 9px !important; opacity: 0.5; }
        @keyframes ping {
          0%   { transform: scale(1);   opacity: 1; }
          75%  { transform: scale(1.8); opacity: 0; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>

      {/* ── TOP STATUS BAR ── */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-[#1e0a14]/95 border-b border-[#A53860]/30 shrink-0 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-[#A53860] border-2 border-[#FFA5AB] flex items-center justify-center shrink-0">
            <span className="text-white font-black text-xs">N</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">NARI Nav</p>
            <p className="text-[#c4a0b0] text-[10px]">Safe Routes · Bhubaneswar</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode hint */}
          <div className="flex items-center gap-1.5 bg-[#0f0814]/80 border border-[#A53860]/30 rounded-full px-3 py-1">
            <span
              className="text-[9px]"
              style={{ color: isPinMode ? '#F59E0B' : tapMode === 'origin' ? '#10B981' : '#E91E8C' }}
            >●</span>
            <span className="text-[#c4a0b0] text-[10px] font-mono">
              {isPinMode
                ? 'Click map → drop hazard pin'
                : tapMode === 'origin'
                ? 'Click map → set start'
                : 'Click map → set destination'}
            </span>
          </div>

          {/* Backend status */}
          {loadingZones ? (
            <span className="text-[10px] font-mono text-[#c4a0b0] animate-pulse">Loading…</span>
          ) : backendOnline ? (
            <div className="flex items-center gap-1.5 bg-[#10B981]/10 border border-[#10B981]/30 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse inline-block" />
              <span className="text-[#10B981] text-[10px] font-bold font-mono">Live</span>
            </div>
          ) : (
            <div className="bg-red-500/10 border border-red-500/30 rounded-full px-2.5 py-1">
              <span className="text-red-400 text-[10px] font-bold font-mono">⚡ Offline</span>
            </div>
          )}
        </div>
      </div>

      {/* ── MAP + SIDE PANEL ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* MAP CANVAS */}
        <div className="relative flex-1 min-w-0">
          <MapContainer
            center={BBSR_CENTER}
            zoom={13}
            style={{ width: '100%', height: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapClickHandler
              tapMode={tapMode}
              onMapPress={handleMapPress}
              isPinMode={isPinMode}
              onPinCoords={onPinCoords}
            />
            {fitCoords.length > 1 && <MapFitter coords={fitCoords} />}
            {focusTarget && <HazardFocuser target={focusTarget} />}

            {/* Danger zones (backend polygons) */}
            {dangerZones.map((zone, i) => (
              <Polygon
                key={`z${i}`}
                positions={zone.map((c) => [c.latitude, c.longitude])}
                pathOptions={{
                  fillColor:   '#EF4444',
                  fillOpacity: 0.18,
                  color:       '#EF4444',
                  weight:      1.5,
                  opacity:     0.7,
                }}
              />
            ))}

            {/* Alternate routes */}
            {altRoutes.map((alt, i) => (
              <Polyline
                key={`alt${i}`}
                positions={alt.map((c) => [c.latitude, c.longitude])}
                pathOptions={{ color: '#888', weight: 4, opacity: 0.35, dashArray: '8 5' }}
              />
            ))}

            {/* Safe route — glow layer + solid line */}
            {routeCoords.length > 0 && (
              <>
                <Polyline
                  positions={routeCoords.map((c) => [c.latitude, c.longitude])}
                  pathOptions={{ color: '#10B981', weight: 14, opacity: 0.18 }}
                />
                <Polyline
                  positions={routeCoords.map((c) => [c.latitude, c.longitude])}
                  pathOptions={{ color: '#10B981', weight: 4, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }}
                />
              </>
            )}

            {/* ── Community hazard markers (linked to the log panel) ── */}
            {hazards
              .filter((h) => h.realLat !== undefined && h.realLng !== undefined)
              .map((h) => {
                const isHL = highlightedHazardId === h.id;
                return (
                  <Marker
                    key={h.id}
                    position={[h.realLat!, h.realLng!]}
                    icon={makeHazardIcon(h.type, isHL)}
                    eventHandlers={{ click: () => onHazardMarkerClick?.(h.id) }}
                    zIndexOffset={isHL ? 1000 : 0}
                  />
                );
              })}

            {/* Pending new-pin preview (before form is submitted) */}
            {pendingPinCoords && (
              <Marker
                position={[pendingPinCoords.lat, pendingPinCoords.lng]}
                icon={makePendingPinIcon()}
              />
            )}

            {myLocation  && <Marker position={[myLocation.latitude,  myLocation.longitude]}  icon={myLocIcon}  />}
            {origin      && <Marker position={[origin.latitude,      origin.longitude]}      icon={originIcon} />}
            {destination && <Marker position={[destination.latitude, destination.longitude]} icon={destIcon}   />}
          </MapContainer>

          {/* Pin mode instruction overlay */}
          {isPinMode && (
            <div className="absolute inset-x-0 top-3 z-[1000] flex justify-center pointer-events-none">
              <div className="px-4 py-2 bg-[#A53860] text-white text-xs font-bold font-mono rounded-full shadow-xl animate-pulse">
                📍 Click anywhere on the map to drop your hazard pin
              </div>
            </div>
          )}

          {/* Loading overlay while zones fetch */}
          {loadingZones && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0f0814]/70 z-[999]">
              <div className="w-8 h-8 border-2 border-[#A53860] border-t-transparent rounded-full animate-spin" />
              <span className="text-[#c4a0b0] text-sm font-mono">Loading safety data…</span>
            </div>
          )}
        </div>

        {/* ── RIGHT CONTROL PANEL ── */}
        <div className="w-[240px] shrink-0 bg-[#1e0a14] border-l border-[#A53860]/20 overflow-y-auto flex flex-col gap-3 p-3.5">

          {/* Legend */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 pb-2 border-b border-[#A53860]/20">
            {[
              { color: '#10B981', label: 'Start' },
              { color: '#E91E8C', label: 'End' },
              { color: '#EF4444', label: 'Danger Zone', opacity: '70' },
              { color: '#F59E0B', label: 'Hazard Pin' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
                <span className="text-[#c4a0b0] text-[10px] font-mono">{label}</span>
              </div>
            ))}
          </div>

          {/* Origin → Destination pills */}
          <div className="flex items-center gap-2 bg-[#2a1020] border border-[#A53860]/30 rounded-xl px-3 py-2.5">
            <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0 inline-block" />
            <span className="text-[11px] font-mono text-white flex-1 truncate">
              {origin ? `${origin.latitude.toFixed(5)}, ${origin.longitude.toFixed(5)}` : 'Click map to set start'}
            </span>
          </div>
          <div className="w-0.5 h-2 bg-[#A53860]/30 mx-[15px]" />
          <div className="flex items-center gap-2 bg-[#2a1020] border border-[#A53860]/30 rounded-xl px-3 py-2.5">
            <span className="w-2 h-2 rounded-full bg-[#E91E8C] shrink-0 inline-block" />
            <span className="text-[11px] font-mono text-white flex-1 truncate">
              {destination ? `${destination.latitude.toFixed(5)}, ${destination.longitude.toFixed(5)}` : 'Click map to set destination'}
            </span>
          </div>

          {/* Avoid danger toggle */}
          <div className="flex items-center justify-between py-1">
            <span className="text-white text-xs font-semibold">🛡 Avoid danger zones</span>
            <button
              onClick={() => setAvoidDanger((v) => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer shrink-0 ${avoidDanger ? 'bg-[#10B981]' : 'bg-[#4a2535]'}`}
              role="switch"
              aria-checked={avoidDanger}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${avoidDanger ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Zone count */}
          {backendOnline && dangerZones.length > 0 && (
            <div className="px-3 py-2 bg-red-500/8 border border-red-500/20 rounded-lg">
              <p className="text-red-400/85 text-[10px] font-mono">
                ⚠ {dangerZones.length} high-risk zones · Bhubaneswar
              </p>
            </div>
          )}

          {/* Error */}
          {errorMsg && (
            <div className="px-3 py-2.5 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-[11px]">{errorMsg}</p>
            </div>
          )}

          {/* Route stats */}
          {routeInfo && (
            <div className="grid grid-cols-3 gap-1 bg-[#2a1020] border border-[#A53860]/30 rounded-xl p-3">
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-sm">🚶</span>
                <span className="text-white text-[12px] font-bold">{formatDist(routeInfo.distance)}</span>
                <span className="text-[#c4a0b0] text-[8px] uppercase tracking-wider font-mono">dist</span>
              </div>
              <div className="flex flex-col items-center gap-0.5 border-x border-[#A53860]/20">
                <span className="text-sm">⏱</span>
                <span className="text-white text-[12px] font-bold">{routeInfo.time} min</span>
                <span className="text-[#c4a0b0] text-[8px] uppercase tracking-wider font-mono">walk</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-sm">{routeInfo.warning ? '⚠' : '✅'}</span>
                <span className="text-[12px] font-bold" style={{ color: routeInfo.warning ? '#F59E0B' : '#10B981' }}>
                  {routeInfo.warning ? 'Alt' : 'Safe'}
                </span>
                <span className="text-[#c4a0b0] text-[8px] uppercase tracking-wider font-mono">route</span>
              </div>
            </div>
          )}

          {routeInfo?.warning && (
            <div className="px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-amber-400 text-[10px]">⚠ {routeInfo.warning}</p>
            </div>
          )}

          {/* Use My Location */}
          <button
            onClick={handleUseMyLocation}
            disabled={locLoading}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#A53860]/40 bg-[#A53860]/10 text-[#FFA5AB] text-[12px] font-semibold hover:bg-[#A53860]/20 transition-all cursor-pointer disabled:opacity-60"
          >
            {locLoading
              ? <span className="w-4 h-4 border-2 border-[#FFA5AB] border-t-transparent rounded-full animate-spin inline-block" />
              : '📍'}
            Use My Location
          </button>

          {/* Find Safe Route */}
          <button
            onClick={handleGetRoute}
            disabled={loading || !origin || !destination}
            className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold tracking-wide transition-all cursor-pointer ${
              origin && destination
                ? 'bg-[#A53860] border border-[#FFA5AB]/60 text-white hover:bg-[#8c2e50]'
                : 'bg-[#4a2535] border border-transparent text-[#c4a0b0] cursor-not-allowed'
            }`}
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
              : '🧭'}
            Find Safe Route
          </button>

          {/* Clear */}
          {(origin || destination) && (
            <button
              onClick={handleClear}
              className="flex items-center justify-center py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-[12px] font-semibold hover:bg-red-500/20 transition-all cursor-pointer"
            >
              ✕ Clear All
            </button>
          )}

          {/* Backend offline help */}
          {!backendOnline && !loadingZones && (
            <div className="bg-[#2a1020] rounded-xl p-3 border border-[#A53860]/30 mt-1">
              <p className="text-red-400 font-bold text-[12px] mb-1.5">Backend Offline</p>
              <p className="text-[#c4a0b0] text-[10px] font-mono leading-5">
                Run in navsys/{'\n'}directory:{'\n'}$ docker-compose up
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
