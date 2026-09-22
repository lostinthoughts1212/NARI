/**
 * LiveNavMap.tsx
 * Real Leaflet-based navigation map for the nari (1) frontend.
 *
 * Features:
 *  - Real safe-route calculation via Valhalla / FastAPI backend
 *  - High-risk danger zone polygon overlays (Bhubaneswar dataset)
 *  - Community hazard markers linked to the Crowdsourced Logs panel
 *  - Live turn-by-turn navigation with Google Maps style street-level flyTo zoom
 *  - Real-time GPS streaming to Firebase Realtime Database
 *  - Instant 1-tap live route sharing to emergency contacts (WhatsApp/SMS link)
 *  - Off-route deviation watchdog (> 65m triggers warning prompt)
 *  - 1-tap Emergency SOS panic button
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import {
  createJourneySession,
  updateLiveLocation,
  updateJourneyStatus,
  type LiveLocationData,
  type LiveJourneySession,
} from '../lib/firebase';
import { distanceToPolylineMeters, getActiveManeuver } from '../lib/geo';

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

const createLiveMovingIcon = (heading: number | null | undefined, isSos: boolean, isOffRoute: boolean) => {
  const color = isSos ? '#EF4444' : isOffRoute ? '#F59E0B' : '#10B981';
  const rotation = heading || 0;
  return L.divIcon({
    className: '',
    html: `
      <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background: ${color}44; animation: ping 1.5s infinite;"></div>
        <div style="width: 26px; height: 26px; border-radius: 50%; background: ${color}; border: 3px solid #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; transform: rotate(${rotation}deg);">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
            <polygon points="12,2 22,22 12,17 2,22" />
          </svg>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

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
  disabled,
}: {
  tapMode: TapMode;
  onMapPress: (latlng: { lat: number; lng: number }) => void;
  isPinMode?: boolean;
  onPinCoords?: (lat: number, lng: number) => void;
  disabled?: boolean;
}) {
  useMapEvents({
    click: (e) => {
      if (disabled) return;
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

// Smooth Google Maps style street-level flyTo zoom & follow
function NavigationFocuser({ center }: { center: [number, number] | null }) {
  const map = useMap();
  const hasZoomedIn = useRef(false);
  useEffect(() => {
    if (center) {
      if (!hasZoomedIn.current) {
        map.flyTo(center, 18, { animate: true, duration: 1.2 });
        hasZoomedIn.current = true;
      } else {
        map.panTo(center, { animate: true, duration: 0.6 });
      }
    } else {
      hasZoomedIn.current = false;
    }
  }, [center, map]);
  return null;
}

function HazardFocuser({ target }: { target: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.setView([target.latitude, target.longitude], 16, { animate: true });
  }, [target, map]);
  return null;
}

// Automatically recalculate Leaflet map dimensions on mobile devices & viewport shifts
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 250);
    const t2 = setTimeout(() => map.invalidateSize(), 800);
    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', onResize);
    };
  }, [map]);
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

  // ── Live Navigation & Firebase State ───────────────────────────────────────
  const [isNavigating,      setIsNavigating]      = useState(false);
  const [journeyId,         setJourneyId]         = useState<string | null>(null);
  const [liveLocation,      setLiveLocation]      = useState<LiveLocationData | null>(null);
  const [activeManeuver,    setActiveManeuver]    = useState<any | null>(null);
  const [distToManeuver,    setDistToManeuver]    = useState<number>(0);
  const [offRouteDistance,  setOffRouteDistance]  = useState<number>(0);
  const [isSosActive,       setIsSosActive]       = useState(false);
  const [copiedLink,        setCopiedLink]        = useState(false);

  const watchIdRef = useRef<number | null>(null);

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

  // Cleanup geolocation watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // ── Map click handler ──────────────────────────────────────────────────────
  const handleMapPress = useCallback(
    (latlng: { lat: number; lng: number }) => {
      if (isNavigating) return;
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
    [tapMode, isNavigating]
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
          maneuvers: resp.trip.legs[0].maneuvers,
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
          : 'Backend is offline. Ensure Valhalla container and Cloudflare tunnel are running.'
      );
    } finally {
      setLoading(false);
    }
  }, [origin, destination, avoidDanger, backendOnline]);

  // ── Share Live Tracking Link ───────────────────────────────────────────────
  const handleShareJourney = useCallback((targetId?: string) => {
    const jId = targetId || journeyId;
    if (!jId) return;
    const trackingUrl = `${window.location.origin}/?track=${jId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(trackingUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
    if (navigator.share) {
      navigator.share({
        title: 'NARI Safe Route Live Tracking',
        text: `🛡️ Track my live location & safe path on NARI: ${trackingUrl}`,
        url: trackingUrl,
      }).catch(() => {});
    }
  }, [journeyId]);

  // ── Start Active Navigation & Firebase Live Stream ─────────────────────────
  const handleStartJourney = useCallback(async () => {
    if (!origin || !destination || routeCoords.length === 0) return;

    const newJourneyId = `nari-${Math.random().toString(36).substring(2, 8)}`;
    const initialLocation: LiveLocationData = {
      latitude: origin.latitude,
      longitude: origin.longitude,
      heading: 0,
      speed: 0,
      timestamp: Date.now(),
    };

    const newSession: LiveJourneySession = {
      id: newJourneyId,
      userName: 'NARI Web User',
      origin,
      destination,
      routeCoords,
      currentLocation: initialLocation,
      status: 'active',
      remainingDistanceKm: routeInfo?.distance,
      remainingTimeMin: routeInfo?.time,
      startedAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      setLoading(true);
      await createJourneySession(newSession);
      setJourneyId(newJourneyId);
      setIsNavigating(true);
      setLiveLocation(initialLocation);

      // Start watching real position via browser Geolocation API
      if (navigator.geolocation) {
        const watchId = navigator.geolocation.watchPosition(
          async (pos) => {
            const locData: LiveLocationData = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              heading: pos.coords.heading ?? null,
              speed: pos.coords.speed ? Math.max(0, pos.coords.speed * 3.6) : 0,
              accuracy: pos.coords.accuracy ?? null,
              timestamp: pos.timestamp || Date.now(),
            };
            setLiveLocation(locData);

            // Off-route check (> 65m)
            const offDist = distanceToPolylineMeters(
              { latitude: locData.latitude, longitude: locData.longitude },
              routeCoords
            );
            setOffRouteDistance(offDist);

            // Maneuver match
            const { activeManeuver: nextMan, distanceToTurnMeters, maneuverIndex } =
              getActiveManeuver(
                { latitude: locData.latitude, longitude: locData.longitude },
                routeInfo?.maneuvers,
                routeCoords
              );
            setActiveManeuver(nextMan);
            setDistToManeuver(distanceToTurnMeters);

            const currentStatus = isSosActive ? 'sos' : offDist > 65 ? 'off_route' : 'active';

            await updateLiveLocation(newJourneyId, locData, {
              offRouteDistance: Math.round(offDist),
              currentManeuverIndex: maneuverIndex,
              status: currentStatus,
            }).catch(() => {});
          },
          (err) => console.warn('Geolocation watch error:', err),
          { enableHighAccuracy: true, maximumAge: 1500, timeout: 10000 }
        );
        watchIdRef.current = watchId;
      }

      // Auto-copy tracking link & share
      handleShareJourney(newJourneyId);
    } catch (e: any) {
      setErrorMsg(`Could not start live journey: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [origin, destination, routeCoords, routeInfo, isSosActive, handleShareJourney]);

  // ── End Journey ────────────────────────────────────────────────────────────
  const handleEndJourney = useCallback(async () => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (journeyId) {
      await updateJourneyStatus(journeyId, 'completed').catch(() => {});
    }
    setIsNavigating(false);
    setJourneyId(null);
    setIsSosActive(false);
    setLiveLocation(null);
    setActiveManeuver(null);
  }, [journeyId]);

  // ── Trigger SOS ────────────────────────────────────────────────────────────
  const handleTriggerSos = useCallback(async () => {
    setIsSosActive(true);
    if (journeyId) {
      await updateJourneyStatus(journeyId, 'sos').catch(() => {});
    }
  }, [journeyId]);

  // ── Clear all ──────────────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    if (isNavigating) return;
    setOrigin(null);
    setDestination(null);
    setMyLocation(null);
    setRouteCoords([]);
    setAltRoutes([]);
    setRouteInfo(null);
    setTapMode('origin');
    setErrorMsg(null);
    setFitCoords([]);
  }, [isNavigating]);

  const formatDist = (km: number) =>
    km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(2)} km`;

  return (
    <div className={`flex flex-col rounded-2xl overflow-hidden border shadow-sm bg-[#0f0814] h-[640px] sm:h-[680px] md:h-[clamp(540px,75vh,780px)] min-h-[560px] ${
      isSosActive ? 'border-red-500 ring-4 ring-red-500/50' : 'border-[#f0c39c]'
    }`}>

      {/* Leaflet cursor + animation overrides */}
      <style>{`
        .leaflet-container { 
          cursor: ${isPinMode ? 'cell' : 'crosshair'} !important; 
          width: 100% !important;
          height: 100% !important;
          min-height: 320px !important;
        }
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
          {isNavigating ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 font-bold text-xs rounded-full border border-emerald-500/40 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Live Navigation Active
              </span>
              <button
                onClick={() => handleShareJourney()}
                className="flex items-center gap-1 px-3 py-1 bg-[#2a1020] hover:bg-[#3d1830] border border-[#A53860]/50 text-white rounded-full text-xs font-semibold transition cursor-pointer"
              >
                <span>🔗</span> {copiedLink ? 'Link Copied!' : 'Share Live Link'}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-[#0f0814]/80 border border-[#A53860]/30 rounded-full px-3 py-1">
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: tapMode === 'origin' ? '#10B981' : '#E91E8C' }}
              />
              <span className="text-[#c4a0b0] text-[11px] font-mono">
                {tapMode === 'origin' ? 'Click: Set Start' : 'Click: Set Destination'}
              </span>
            </div>
          )}

          {/* Backend indicator */}
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full inline-block ${
                backendOnline ? 'bg-[#10B981] animate-pulse' : 'bg-[#EF4444]'
              }`}
            />
            <span className="text-[#c4a0b0] text-[10px] font-mono">
              {backendOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* ── MAP CONTAINER ── */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 relative">
        <div className="flex-1 relative h-[360px] sm:h-[420px] md:h-full min-h-[320px]">
          <MapContainer
            center={BBSR_CENTER}
            zoom={13}
            className="w-full h-full"
            style={{ width: '100%', height: '100%', minHeight: '320px' }}
            zoomControl={false}
          >
            <MapResizer />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />

            <MapClickHandler
              tapMode={tapMode}
              onMapPress={handleMapPress}
              isPinMode={isPinMode}
              onPinCoords={onPinCoords}
              disabled={isNavigating}
            />
            {!isNavigating && fitCoords.length > 1 && <MapFitter coords={fitCoords} />}
            {focusTarget && <HazardFocuser target={focusTarget} />}
            {isNavigating && liveLocation && (
              <NavigationFocuser center={[liveLocation.latitude, liveLocation.longitude]} />
            )}

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
            {!isNavigating &&
              altRoutes.map((alt, i) => (
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
                  pathOptions={{
                    color: isSosActive ? '#EF4444' : offRouteDistance > 65 ? '#F59E0B' : '#10B981',
                    weight: 14,
                    opacity: 0.2,
                  }}
                />
                <Polyline
                  positions={routeCoords.map((c) => [c.latitude, c.longitude])}
                  pathOptions={{
                    color: isSosActive ? '#EF4444' : offRouteDistance > 65 ? '#F59E0B' : '#10B981',
                    weight: 4.5,
                    opacity: 0.95,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
              </>
            )}

            {/* Community hazard markers */}
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

            {pendingPinCoords && (
              <Marker
                position={[pendingPinCoords.lat, pendingPinCoords.lng]}
                icon={makePendingPinIcon()}
              />
            )}

            {myLocation  && <Marker position={[myLocation.latitude,  myLocation.longitude]}  icon={myLocIcon}  />}
            {origin      && <Marker position={[origin.latitude,      origin.longitude]}      icon={originIcon} />}
            {destination && <Marker position={[destination.latitude, destination.longitude]} icon={destIcon}   />}

            {/* Active Moving GPS User Marker */}
            {isNavigating && liveLocation && (
              <Marker
                position={[liveLocation.latitude, liveLocation.longitude]}
                icon={createLiveMovingIcon(liveLocation.heading, isSosActive, offRouteDistance > 65)}
              />
            )}
          </MapContainer>

          {/* ── TURN-BY-TURN HUD (When Navigating) ── */}
          {isNavigating && (
            <div className="absolute top-3 inset-x-3 z-[1000] flex justify-center pointer-events-none">
              <div className={`pointer-events-auto px-4 py-2.5 rounded-2xl backdrop-blur-md shadow-2xl border flex items-center gap-3 max-w-md w-full ${
                isSosActive
                  ? 'bg-red-950/90 border-red-500 text-white'
                  : offRouteDistance > 65
                  ? 'bg-amber-950/90 border-amber-500 text-amber-200'
                  : 'bg-[#1e0a14]/95 border-emerald-500/50 text-white'
              }`}>
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl shrink-0">
                  {isSosActive ? '🚨' : offRouteDistance > 65 ? '⚠️' : '➡️'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black uppercase tracking-wide">
                    {isSosActive
                      ? 'DISTRESS SOS ACTIVE'
                      : offRouteDistance > 65
                      ? `OFF SAFE CORRIDOR (~${Math.round(offRouteDistance)} m)`
                      : distToManeuver > 0
                      ? `In ${distToManeuver} m`
                      : 'Follow Safe Corridor'}
                  </p>
                  <p className="text-[11px] text-[#c4a0b0] truncate mt-0.5">
                    {isSosActive
                      ? 'Distress telemetry streaming to emergency contacts'
                      : offRouteDistance > 65
                      ? 'Please return to illuminated safe route'
                      : activeManeuver?.instruction || 'Proceed towards your destination'}
                  </p>
                </div>
                <button
                  onClick={handleTriggerSos}
                  className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs transition cursor-pointer shrink-0 shadow"
                >
                  SOS
                </button>
              </div>
            </div>
          )}

          {/* Quick Floating Action: Use My Location (top-right on mobile) */}
          {!isNavigating && (
            <button
              onClick={handleUseMyLocation}
              disabled={locLoading}
              className="md:hidden absolute top-3 right-3 z-[1000] flex items-center gap-1.5 px-3 py-1.5 bg-[#1e0a14]/90 hover:bg-[#A53860] border border-[#FFA5AB]/50 text-white rounded-full text-[11px] font-bold shadow-lg backdrop-blur-sm transition-all cursor-pointer disabled:opacity-60"
              title="Use My Location"
            >
              {locLoading ? (
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
              ) : (
                <span>📍</span>
              )}
              <span>My Loc</span>
            </button>
          )}

          {/* Floating Action Button: Mobile View */}
          {origin && destination && (
            <div className="md:hidden absolute bottom-4 inset-x-0 z-[1000] flex justify-center px-4 pointer-events-none">
              {isNavigating ? (
                <div className="pointer-events-auto flex items-center gap-2">
                  <button
                    onClick={() => handleShareJourney()}
                    className="px-4 py-2.5 bg-[#2a1020] border border-[#A53860]/50 text-white rounded-full text-xs font-bold shadow-xl cursor-pointer"
                  >
                    🔗 Share Route
                  </button>
                  <button
                    onClick={handleEndJourney}
                    className="px-5 py-2.5 bg-red-600 text-white rounded-full text-xs font-bold shadow-xl cursor-pointer"
                  >
                    End Journey
                  </button>
                </div>
              ) : routeCoords.length > 0 ? (
                <button
                  onClick={handleStartJourney}
                  disabled={loading}
                  className="pointer-events-auto flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 border-2 border-emerald-400 text-white rounded-full text-xs font-bold shadow-2xl transition-all cursor-pointer animate-pulse"
                >
                  <span>🛡️</span> Start Safe Journey
                </button>
              ) : (
                <button
                  onClick={handleGetRoute}
                  disabled={loading}
                  className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 bg-[#A53860] hover:bg-[#8c2e50] border-2 border-[#FFA5AB] text-white rounded-full text-xs font-bold shadow-2xl transition-all cursor-pointer animate-bounce"
                >
                  {loading ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                  ) : (
                    <span>🧭</span>
                  )}
                  <span>Find Safe Route</span>
                </button>
              )}
            </div>
          )}

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

        {/* ── CONTROL PANEL ── */}
        <div className="w-full md:w-[280px] shrink-0 bg-[#1e0a14] border-t md:border-t-0 md:border-l border-[#A53860]/20 flex flex-col gap-3 p-3.5 md:overflow-y-auto">

          {/* Panel Header */}
          <div className="flex items-center justify-between pb-1 border-b border-[#A53860]/20">
            <span className="text-white text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5">
              <span>⚙️</span> {isNavigating ? 'Live Navigation' : 'Map Options'}
            </span>
            <span className="text-[#FFA5AB] text-[10px] font-mono">
              {isNavigating
                ? '🟢 Active Stream'
                : origin && destination
                ? 'Ready to route'
                : tapMode === 'origin'
                ? '1. Tap start'
                : '2. Tap end'}
            </span>
          </div>

          {/* Origin → Destination pills */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 bg-[#2a1020] border border-[#A53860]/30 rounded-xl px-3 py-2">
              <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0 inline-block" />
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-mono text-[#c4a0b0] uppercase tracking-wider">Start Point</p>
                <p className="text-[11px] font-mono text-white truncate">
                  {origin ? `${origin.latitude.toFixed(5)}, ${origin.longitude.toFixed(5)}` : 'Click map or use "My Loc"'}
                </p>
              </div>
              {origin && !isNavigating && (
                <button
                  type="button"
                  onClick={() => { setOrigin(null); setRouteCoords([]); setRouteInfo(null); setTapMode('origin'); }}
                  className="text-[#c4a0b0] hover:text-white text-xs px-1 cursor-pointer"
                  title="Clear start"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 bg-[#2a1020] border border-[#A53860]/30 rounded-xl px-3 py-2">
              <span className="w-2 h-2 rounded-full bg-[#E91E8C] shrink-0 inline-block" />
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-mono text-[#c4a0b0] uppercase tracking-wider">Destination</p>
                <p className="text-[11px] font-mono text-white truncate">
                  {destination ? `${destination.latitude.toFixed(5)}, ${destination.longitude.toFixed(5)}` : 'Click map to set destination'}
                </p>
              </div>
              {destination && !isNavigating && (
                <button
                  type="button"
                  onClick={() => { setDestination(null); setRouteCoords([]); setRouteInfo(null); setTapMode('destination'); }}
                  className="text-[#c4a0b0] hover:text-white text-xs px-1 cursor-pointer"
                  title="Clear destination"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Avoid danger toggle (disabled while navigating) */}
          {!isNavigating && (
            <div className="flex items-center justify-between py-1.5 px-2 bg-[#2a1020]/60 rounded-xl border border-[#A53860]/20">
              <span className="text-white text-xs font-semibold flex items-center gap-1.5">
                <span>🛡</span> Avoid danger zones
              </span>
              <button
                onClick={() => setAvoidDanger((v) => !v)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer shrink-0 ${avoidDanger ? 'bg-[#10B981]' : 'bg-[#4a2535]'}`}
                role="switch"
                aria-checked={avoidDanger}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${avoidDanger ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          )}

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

          {/* Route stats / Nav metrics */}
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
                <span className="text-sm">{isNavigating ? '📍' : routeInfo.warning ? '⚠' : '✅'}</span>
                <span className="text-[12px] font-bold" style={{ color: isNavigating ? '#10B981' : routeInfo.warning ? '#F59E0B' : '#10B981' }}>
                  {isNavigating ? 'Live' : routeInfo.warning ? 'Alt' : 'Safe'}
                </span>
                <span className="text-[#c4a0b0] text-[8px] uppercase tracking-wider font-mono">status</span>
              </div>
            </div>
          )}

          {/* ── NAVIGATION ACTION CONTROLS ── */}
          {isNavigating ? (
            /* Active Navigation Panel */
            <div className="flex flex-col gap-2 pt-1 border-t border-[#A53860]/20">
              <button
                onClick={() => handleShareJourney()}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#2a1020] hover:bg-[#3d1830] border border-[#A53860]/50 text-white text-xs font-bold transition cursor-pointer"
              >
                <span>🔗</span> {copiedLink ? 'Tracking Link Copied!' : 'Share Live Tracking Link'}
              </button>

              <button
                onClick={handleTriggerSos}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-700/40 transition cursor-pointer"
              >
                <span>🚨</span> Panic Emergency SOS
              </button>

              <button
                onClick={handleEndJourney}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-[#FFA5AB] text-xs font-bold transition cursor-pointer"
              >
                End Safe Journey
              </button>
            </div>
          ) : (
            /* Pre-Navigation Actions */
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleUseMyLocation}
                  disabled={locLoading}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border border-[#A53860]/40 bg-[#A53860]/10 text-[#FFA5AB] text-[11px] font-semibold hover:bg-[#A53860]/20 transition-all cursor-pointer disabled:opacity-60"
                >
                  {locLoading ? (
                    <span className="w-3.5 h-3.5 border-2 border-[#FFA5AB] border-t-transparent rounded-full animate-spin inline-block" />
                  ) : (
                    '📍'
                  )}
                  <span className="truncate">My Location</span>
                </button>

                {(origin || destination) ? (
                  <button
                    onClick={handleClear}
                    className="flex items-center justify-center gap-1 py-2.5 px-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] font-semibold hover:bg-red-500/20 transition-all cursor-pointer"
                  >
                    ✕ Clear All
                  </button>
                ) : (
                  <div className="flex items-center justify-center text-[10px] font-mono text-[#c4a0b0]/60 text-center py-2.5">
                    Tap map to start
                  </div>
                )}
              </div>

              {/* Find Safe Route button */}
              <button
                onClick={handleGetRoute}
                disabled={loading || !origin || !destination}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
                  origin && destination
                    ? 'bg-[#A53860] border border-[#FFA5AB]/60 text-white hover:bg-[#8c2e50] shadow-lg shadow-[#A53860]/30'
                    : 'bg-[#4a2535] border border-transparent text-[#c4a0b0] cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                ) : (
                  '🧭'
                )}
                Find Safe Route
              </button>

              {/* START SAFE JOURNEY (Appears as soon as route is calculated!) */}
              {routeCoords.length > 0 && (
                <button
                  onClick={handleStartJourney}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-400 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-700/40 transition-all cursor-pointer animate-pulse"
                >
                  <span>🛡️</span> Start Safe Journey
                </button>
              )}
            </div>
          )}

          {/* Backend offline help */}
          {!backendOnline && !loadingZones && (
            <div className="bg-[#2a1020] rounded-xl p-3 border border-[#A53860]/30 mt-1">
              <p className="text-red-400 font-bold text-[12px] mb-1.5">Backend Offline</p>
              <p className="text-[#c4a0b0] text-[10px] font-mono leading-5">
                Ensure Docker is running:{'\n'}$ docker-compose up
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
