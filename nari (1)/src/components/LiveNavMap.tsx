/**
 * LiveNavMap.tsx
 * Real Leaflet-based navigation map for the NARI safety ecosystem.
 *
 * Features:
 *  - Real safe-route calculation via Valhalla / FastAPI backend with intelligent client-side fallback
 *  - High-risk danger zone polygon overlays (Bhubaneswar dataset authentic coordinates)
 *  - 1-Tap quick route presets for Bhubaneswar test corridors
 *  - Community hazard markers linked to Crowdsourced Logs
 *  - Live turn-by-turn navigation with Google Maps style street-level flyTo follow
 *  - Real-time GPS streaming to Firebase Realtime Database
 *  - Instant 1-tap live route sharing to emergency contacts
 *  - Off-route deviation watchdog (> 65m triggers warning prompt)
 *  - Collision-free, mobile-first responsive overlays with slide-over drawers
 *  - Automatic ResizeObserver on Leaflet container to prevent grey voids
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
  type JourneyStatus,
} from '../lib/firebase';
import {
  distanceToPolylineMeters,
  getActiveManeuver,
  haversineDistanceMeters,
  calculateBearing,
} from '../lib/geo';
import {
  BHUBANESWAR_FALLBACK_POLYGONS,
  BHUBANESWAR_ROUTE_PRESETS,
  generateFallbackSafeRoute,
  HAZARD_COLORS,
} from '../lib/bhubaneswarData';

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
      width:18px;height:18px;border-radius:50%;
      background:${color};border:3px solid rgba(255,255,255,0.95);
      box-shadow:0 3px 12px rgba(69,9,32,0.45);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

const originIcon = makeIcon('#10B981');  // emerald green
const destIcon   = makeIcon('#E91E8C');  // bright pink
const myLocIcon  = makeIcon('#A53860');  // maroon rose

const createLiveMovingIcon = (heading: number | null | undefined, isSos: boolean, isOffRoute: boolean) => {
  const color = isSos ? '#EF4444' : isOffRoute ? '#F59E0B' : '#10B981';
  const rotation = heading || 0;
  return L.divIcon({
    className: '',
    html: `
      <div style="position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 42px; height: 42px; border-radius: 50%; background: ${color}44; animation: ping 1.5s infinite;"></div>
        <div style="width: 28px; height: 28px; border-radius: 50%; background: ${color}; border: 3px solid #fff; box-shadow: 0 4px 14px rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; transform: rotate(${rotation}deg);">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
            <polygon points="12,2 22,22 12,17 2,22" />
          </svg>
        </div>
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
};

// ── Community hazard type icons ───────────────────────────────────────────────

const makeHazardIcon = (type: string, highlighted: boolean) =>
  L.divIcon({
    className: '',
    html: `<div style="
      width:${highlighted ? 24 : 14}px;
      height:${highlighted ? 24 : 14}px;
      border-radius:50%;
      background:${HAZARD_COLORS[type] ?? '#888'};
      border:${highlighted ? '3px' : '2px'} solid rgba(255,255,255,0.95);
      box-shadow:0 0 ${highlighted ? '18px 8px' : '6px 2px'} ${HAZARD_COLORS[type] ?? '#888'};
      transition: all 0.25s ease;
    "></div>`,
    iconSize:   [highlighted ? 24 : 14, highlighted ? 24 : 14],
    iconAnchor: [highlighted ? 12 : 7,  highlighted ? 12 : 7],
  });

const makePendingPinIcon = () =>
  L.divIcon({
    className: '',
    html: `<div style="
      width:24px;height:24px;border-radius:50%;
      background:#A53860;
      border:3px solid rgba(255,255,255,0.95);
      box-shadow:0 0 20px 8px rgba(165,56,96,0.6);
      animation:ping 1s cubic-bezier(0,0,0.2,1) infinite;
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

type TapMode = 'origin' | 'destination' | 'idle';

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
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
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

// Automatically recalculate Leaflet map dimensions on mobile devices, orientations & tab switches
function MapResizer({ isMaximized }: { isMaximized?: boolean }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 500);

    let resizeObserver: ResizeObserver | null = null;
    const container = map.getContainer();
    if (container && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      resizeObserver.observe(container);
    }

    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [map, isMaximized]);
  return null;
}

function MapRefSetter({ onMap }: { onMap: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onMap(map);
  }, [map, onMap]);
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
  // Initialize with Bhubaneswar authentic danger zones so map is NEVER empty
  const [dangerZones, setDangerZones] = useState<LatLng[][]>(BHUBANESWAR_FALLBACK_POLYGONS);

  const [loading,       setLoading]       = useState(false);
  const [loadingZones,  setLoadingZones]  = useState(false);
  const [locLoading,    setLocLoading]    = useState(false);
  const [routeInfo,     setRouteInfo]     = useState<RouteInfo | null>(null);
  const [avoidDanger,   setAvoidDanger]   = useState(true);
  const [backendOnline, setBackendOnline] = useState(false);
  const [fallbackMode,  setFallbackMode]  = useState(false);
  const [errorMsg,      setErrorMsg]      = useState<string | null>(null);
  const [fitCoords,     setFitCoords]     = useState<LatLng[]>([]);

  // ── Maximize & Options UI State ───────────────────────────────────────────
  const [isMaximized,   setIsMaximized]   = useState(false);
  const [showOptions,   setShowOptions]   = useState(false);
  const [showPresets,   setShowPresets]   = useState(false);

  // Exit fullscreen on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMaximized) {
        setIsMaximized(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMaximized]);

  // ── Live Navigation & Firebase State ───────────────────────────────────────
  const [isNavigating,      setIsNavigating]      = useState(false);
  const [journeyId,         setJourneyId]         = useState<string | null>(null);
  const [liveLocation,      setLiveLocation]      = useState<LiveLocationData | null>(null);
  const [activeManeuver,    setActiveManeuver]    = useState<any | null>(null);
  const [distToManeuver,    setDistToManeuver]    = useState<number>(0);
  const [offRouteDistance,  setOffRouteDistance]  = useState<number>(0);
  const [isSosActive,       setIsSosActive]       = useState(false);
  const [copiedLink,        setCopiedLink]        = useState(false);
  const [mapInstance,       setMapInstance]       = useState<L.Map | null>(null);

  // ── Sandbox Simulator State ───────────────────────────────────────────────
  const [isSandboxOpen,     setIsSandboxOpen]     = useState(false);
  const [isSimRunning,      setIsSimRunning]      = useState(false);
  const [simProgressIndex,  setSimProgressIndex]  = useState(0);
  const [simSpeed,          setSimSpeed]          = useState<number>(2); // 1x, 2x, 5x
  const [isSimDeviated,     setIsSimDeviated]     = useState(false);
  const [destinationAlert,  setDestinationAlert]  = useState<string | null>(null);
  const simTimerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (simTimerRef.current) {
        clearInterval(simTimerRef.current);
      }
    };
  }, []);

  const watchIdRef = useRef<number | null>(null);

  // ── Compute focus target from highlighted hazard ────────────────────────────
  const focusTarget = useMemo<LatLng | null>(() => {
    if (!highlightedHazardId) return null;
    const h = hazards.find((x) => x.id === highlightedHazardId);
    return h?.realLat !== undefined && h?.realLng !== undefined
      ? { latitude: h.realLat, longitude: h.realLng }
      : null;
  }, [highlightedHazardId, hazards]);

  // ── Load danger zones on mount (merges with authentic Bhubaneswar polygons) ──
  useEffect(() => {
    fetchPolygons()
      .then((data) => {
        if (data.polygons && data.polygons.length > 0) {
          const zones = data.polygons.map((poly) =>
            poly.map(([lon, lat]: [number, number]) => ({ latitude: lat, longitude: lon }))
          );
          setDangerZones(zones);
        }
        setBackendOnline(true);
      })
      .catch(() => {
        setBackendOnline(false);
        // Fallback polygons are already initialized
      });
  }, []);

  // Cleanup geolocation watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // ── Protected Map click handler (fixes accidental route wipes) ─────────────
  const handleMapPress = useCallback(
    (latlng: { lat: number; lng: number }) => {
      if (isNavigating) return;

      const coord: LatLng = { latitude: latlng.lat, longitude: latlng.lng };

      // If a route already exists and tapMode is idle, prompt or do not wipe without intent
      if (routeCoords.length > 0 && tapMode === 'idle') {
        // Switch to destination mode if clicked near existing route
        return;
      }

      setErrorMsg(null);

      if (tapMode === 'origin') {
        setOrigin(coord);
        setRouteCoords([]);
        setAltRoutes([]);
        setRouteInfo(null);
        setFitCoords([coord]);
        setTapMode('destination');
      } else if (tapMode === 'destination') {
        setDestination(coord);
        setFitCoords((prev) => (prev.length > 0 ? [...prev, coord] : [coord]));
        setTapMode('idle');
      } else {
        // When in idle, reset to origin
        setOrigin(coord);
        setDestination(null);
        setRouteCoords([]);
        setAltRoutes([]);
        setRouteInfo(null);
        setFitCoords([coord]);
        setTapMode('destination');
      }
    },
    [tapMode, isNavigating, routeCoords.length]
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
        // If GPS permission denied, default to Bhubaneswar center
        const defaultCoord: LatLng = { latitude: 20.2961, longitude: 85.8245 };
        setMyLocation(defaultCoord);
        setOrigin(defaultCoord);
        setTapMode('destination');
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, []);

  // ── Route Calculation (With Automatic Offline / Fallback Resiliency) ────────
  const calculateRoute = useCallback(async (
    start: LatLng,
    end: LatLng,
    avoid: boolean
  ) => {
    setLoading(true);
    setErrorMsg(null);

    try {
      // Attempt backend safe routing first
      const resp = await fetchSafeRoute({
        start_lat: start.latitude,
        start_lon: start.longitude,
        end_lat:   end.latitude,
        end_lon:   end.longitude,
        costing: 'pedestrian',
        avoid_danger_zones: avoid,
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
        setFallbackMode(false);
        setBackendOnline(true);
      }
      if (resp.alternates) {
        const alts = (resp.alternates as RouteInfo[])
          .filter((a: any) => a.trip?.legs?.[0]?.shape)
          .map((a: any) => decodePolyline(a.trip.legs[0].shape));
        setAltRoutes(alts);
      }
    } catch (err) {
      console.warn('[LiveNavMap] Routing failed, falling back to local corridor:', err);
      // Graceful client-side safe routing fallback
      const fallback = generateFallbackSafeRoute(start, end, avoid);
      setRouteCoords(fallback.routeCoords);
      setAltRoutes(fallback.altRoutes);
      setFitCoords(fallback.routeCoords);
      setRouteInfo(fallback.routeInfo);
      setFallbackMode(true);
    } finally {
      setLoading(false);
      setTapMode('idle');
    }
  }, []);

  const handleGetRoute = useCallback(() => {
    if (!origin || !destination) {
      setErrorMsg('Click the map or select a preset to set a start point and destination.');
      return;
    }
    calculateRoute(origin, destination, avoidDanger);
  }, [origin, destination, avoidDanger, calculateRoute]);

  // Recalculate route when toggling avoidDanger
  const handleToggleAvoidDanger = useCallback(() => {
    const nextAvoid = !avoidDanger;
    setAvoidDanger(nextAvoid);
    if (origin && destination) {
      calculateRoute(origin, destination, nextAvoid);
    }
  }, [avoidDanger, origin, destination, calculateRoute]);

  // Load a quick Bhubaneswar Preset
  const handleSelectPreset = useCallback((preset: typeof BHUBANESWAR_ROUTE_PRESETS[0]) => {
    setOrigin(preset.origin);
    setDestination(preset.destination);
    setShowPresets(false);
    calculateRoute(preset.origin, preset.destination, avoidDanger);
  }, [avoidDanger, calculateRoute]);

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

  // ── Recenter Camera on User / Route ──────────────────────────────────────
  const handleRecenter = useCallback(() => {
    if (!mapInstance) return;
    if (isNavigating && liveLocation) {
      mapInstance.flyTo([liveLocation.latitude, liveLocation.longitude], 17, {
        animate: true,
        duration: 0.8,
      });
    } else if (origin && destination) {
      const bounds = L.latLngBounds([
        [origin.latitude, origin.longitude],
        [destination.latitude, destination.longitude],
      ]);
      mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    } else if (myLocation) {
      mapInstance.flyTo([myLocation.latitude, myLocation.longitude], 16, {
        animate: true,
        duration: 0.8,
      });
    } else if (origin) {
      mapInstance.flyTo([origin.latitude, origin.longitude], 16, {
        animate: true,
        duration: 0.8,
      });
    } else {
      handleUseMyLocation();
    }
  }, [mapInstance, isNavigating, liveLocation, origin, destination, myLocation, handleUseMyLocation]);

  // ── Central Location Update Processor (Real GPS + Simulator) ───────────────
  const processNavUpdate = useCallback(
    async (
      locData: LiveLocationData,
      currentJourneyId: string,
      currentCoords: LatLng[],
      maneuversList?: any[]
    ) => {
      setLiveLocation(locData);

      // 1. Off-route check (> 65m)
      const offDist = distanceToPolylineMeters(
        { latitude: locData.latitude, longitude: locData.longitude },
        currentCoords
      );
      setOffRouteDistance(offDist);

      // 2. Maneuver match
      const { activeManeuver: nextMan, distanceToTurnMeters, maneuverIndex } =
        getActiveManeuver(
          { latitude: locData.latitude, longitude: locData.longitude },
          maneuversList,
          currentCoords
        );
      setActiveManeuver(nextMan);
      setDistToManeuver(distanceToTurnMeters);

      // 3. Destination arrival detection (< 25m)
      if (destination) {
        const distToDest = haversineDistanceMeters(
          locData.latitude,
          locData.longitude,
          destination.latitude,
          destination.longitude
        );
        if (distToDest < 25) {
          setDestinationAlert('🎉 Destination Reached! Safe journey completed.');
          if (currentJourneyId) {
            await updateJourneyStatus(currentJourneyId, 'completed', { completedAt: Date.now() }).catch(() => {});
          }
        }
      }

      // 4. Update status & stream to Firebase
      const currentStatus: JourneyStatus = isSosActive
        ? 'sos'
        : offDist > 65
        ? 'off_route'
        : 'active';

      await updateLiveLocation(currentJourneyId, locData, {
        offRouteDistance: Math.round(offDist),
        currentManeuverIndex: maneuverIndex,
        status: currentStatus,
      }).catch(() => {});
    },
    [destination, isSosActive]
  );

  // ── Simulation Engine ──────────────────────────────────────────────────────
  const stopSimulation = useCallback(() => {
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
    setIsSimRunning(false);
  }, []);

  const stepSimulation = useCallback(
    async (targetIdx: number, forceDeviate?: boolean) => {
      if (routeCoords.length === 0) return;
      const idx = Math.min(Math.max(0, targetIdx), routeCoords.length - 1);
      const curr = routeCoords[idx];
      const next = routeCoords[Math.min(idx + 1, routeCoords.length - 1)];

      const heading = calculateBearing(curr, next);
      const isDev = forceDeviate !== undefined ? forceDeviate : isSimDeviated;
      const deviationLat = isDev ? 0.0011 : 0;
      const deviationLng = isDev ? 0.0009 : 0;

      const simLoc: LiveLocationData = {
        latitude: curr.latitude + deviationLat,
        longitude: curr.longitude + deviationLng,
        heading,
        speed: Math.round(25 * simSpeed),
        accuracy: 4,
        timestamp: Date.now(),
      };

      const jId = journeyId || 'nari-sim';
      await processNavUpdate(simLoc, jId, routeCoords, routeInfo?.maneuvers);
      setSimProgressIndex(idx);

      if (idx >= routeCoords.length - 1) {
        stopSimulation();
        setDestinationAlert('🎉 Destination Reached! Safe journey completed.');
        if (journeyId) {
          await updateJourneyStatus(journeyId, 'completed', { completedAt: Date.now() }).catch(() => {});
        }
      }
    },
    [
      routeCoords,
      isSimDeviated,
      simSpeed,
      journeyId,
      routeInfo,
      processNavUpdate,
      stopSimulation,
    ]
  );

  const handleToggleRunSim = useCallback(async () => {
    if (isSimRunning) {
      stopSimulation();
      return;
    }

    if (routeCoords.length === 0) {
      handleSelectPreset(BHUBANESWAR_ROUTE_PRESETS[0]);
      return;
    }

    let activeJId = journeyId;
    if (!isNavigating || !activeJId) {
      const newJId = `nari-${Math.random().toString(36).substring(2, 8)}`;
      activeJId = newJId;
      const initialLocation: LiveLocationData = {
        latitude: routeCoords[0].latitude,
        longitude: routeCoords[0].longitude,
        heading: 0,
        speed: 0,
        timestamp: Date.now(),
      };

      const newSession: LiveJourneySession = {
        id: newJId,
        userName: 'NARI Sandbox User',
        origin: origin || routeCoords[0],
        destination: destination || routeCoords[routeCoords.length - 1],
        routeCoords,
        currentLocation: initialLocation,
        status: 'active',
        remainingDistanceKm: routeInfo?.distance,
        remainingTimeMin: routeInfo?.time,
        startedAt: Date.now(),
        updatedAt: Date.now(),
      };

      await createJourneySession(newSession).catch(() => {});
      setJourneyId(newJId);
      setIsNavigating(true);
      setLiveLocation(initialLocation);
    }

    setIsSimRunning(true);
    let currentIdx = simProgressIndex >= routeCoords.length - 1 ? 0 : simProgressIndex;

    simTimerRef.current = setInterval(() => {
      currentIdx += 1;
      if (currentIdx >= routeCoords.length) {
        stopSimulation();
      } else {
        stepSimulation(currentIdx);
      }
    }, Math.max(300, Math.round(1400 / simSpeed)));
  }, [
    isSimRunning,
    routeCoords,
    journeyId,
    isNavigating,
    origin,
    destination,
    routeInfo,
    simProgressIndex,
    simSpeed,
    stepSimulation,
    stopSimulation,
    handleSelectPreset,
  ]);

  const handleJumpToEnd = useCallback(() => {
    if (routeCoords.length === 0) return;
    stepSimulation(routeCoords.length - 1);
  }, [routeCoords, stepSimulation]);

  const handleToggleDeviate = useCallback(() => {
    const nextDev = !isSimDeviated;
    setIsSimDeviated(nextDev);
    stepSimulation(simProgressIndex, nextDev);
  }, [isSimDeviated, simProgressIndex, stepSimulation]);

  // ── Start Active Navigation & Firebase Live Stream ─────────────────────────
  const handleStartJourney = useCallback(async () => {
    if (!origin || !destination || routeCoords.length === 0) return;

    // Auto-enter fullscreen console on mobile/phone viewports
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768 || 'ontouchstart' in window;
      if (isMobile) {
        setIsMaximized(true);
      }
    }

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
      userName: 'NARI Verified User',
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
            processNavUpdate(locData, newJourneyId, routeCoords, routeInfo?.maneuvers);
          },
          (err) => console.warn('Geolocation watch warning:', err),
          { enableHighAccuracy: true, maximumAge: 1500, timeout: 10000 }
        );
        watchIdRef.current = watchId;
      }

      handleShareJourney(newJourneyId);
    } catch (e: any) {
      setErrorMsg(`Could not start live journey: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [
    origin,
    destination,
    routeCoords,
    routeInfo,
    processNavUpdate,
    handleShareJourney,
  ]);

  // ── End Journey ────────────────────────────────────────────────────────────
  const handleEndJourney = useCallback(async () => {
    stopSimulation();
    setDestinationAlert(null);
    setIsSimDeviated(false);
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (journeyId) {
      await updateJourneyStatus(journeyId, 'completed', { completedAt: Date.now() }).catch(() => {});
    }
    setIsNavigating(false);
    setJourneyId(null);
    setIsSosActive(false);
    setLiveLocation(null);
    setActiveManeuver(null);
  }, [journeyId, stopSimulation]);

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
    setShowPresets(false);
  }, [isNavigating]);

  const formatDist = (km: number) =>
    km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(2)} km`;

  return (
    <div
      className={`transition-all duration-300 ${
        isMaximized
          ? 'fixed inset-0 z-[9999] w-screen h-screen bg-[#F5EBE0] flex flex-col'
          : `relative flex flex-col rounded-2xl overflow-hidden border-2 border-[#f0c39c] shadow-md bg-[#F5EBE0] h-[65vh] sm:h-[72vh] md:h-[clamp(580px,80vh,840px)] min-h-[460px] ${
              isSosActive ? 'ring-4 ring-red-500' : ''
            }`
      }`}
    >
      {/* Leaflet cursor + animation overrides */}
      <style>{`
        .leaflet-container { 
          cursor: ${isPinMode ? 'cell' : tapMode !== 'idle' ? 'crosshair' : 'grab'} !important; 
          width: 100% !important;
          height: 100% !important;
        }
        .leaflet-control-attribution { font-size: 9px !important; opacity: 0.6; }
        @keyframes ping {
          0%   { transform: scale(1);   opacity: 1; }
          75%  { transform: scale(1.8); opacity: 0; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>

      {/* ── TOP HEADER / BRAND & QUICK ACTIONS ── */}
      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-[#F9DBBD]/95 border-b border-[#f0c39c] shrink-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-[#A53860] border border-[#f0c39c] flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-white font-black text-xs">N</span>
          </div>
          <div className="flex items-baseline gap-1.5 truncate">
            <span className="text-[#450920] font-bold text-xs font-serif italic tracking-wide">NARI Nav</span>
            <span className="text-[#A53860] text-[10px] font-semibold hidden sm:inline">· Safe Routes Bhubaneswar</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Active Navigation Badge */}
          {isNavigating && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/15 text-emerald-700 font-bold text-[9px] sm:text-[10px] rounded-full border border-emerald-500/40 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Live Active
            </span>
          )}

          {/* Engine status indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/90 border border-[#f0c39c] text-[10px] font-mono text-[#450920] shadow-sm">
            <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-[#10B981] animate-pulse' : 'bg-amber-500'}`} />
            <span className="font-bold">{backendOnline ? 'Valhalla Online' : 'Offline Mode'}</span>
          </div>

          {/* Quick Presets Toggle */}
          {!isNavigating && (
            <button
              type="button"
              onClick={() => setShowPresets((v) => !v)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border shadow-sm ${
                showPresets
                  ? 'bg-[#A53860] text-white border-[#A53860]'
                  : 'bg-white hover:bg-[#FFA5AB]/30 text-[#450920] border-[#f0c39c]'
              }`}
              title="Select a preconfigured safe corridor"
            >
              <span>⚡</span>
              <span className="hidden sm:inline">Presets</span>
            </button>
          )}

          {/* Sandbox Toggle */}
          <button
            type="button"
            onClick={() => setIsSandboxOpen((v) => !v)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border shadow-sm ${
              isSandboxOpen
                ? 'bg-[#A53860] text-white border-[#A53860]'
                : 'bg-white hover:bg-[#FFA5AB]/30 text-[#450920] border-[#f0c39c]'
            }`}
            title="Open Navigation Scenario Sandbox"
          >
            <span>🧪</span>
            <span className="hidden sm:inline">Sandbox</span>
          </button>

          {/* Options Drawer Toggle */}
          <button
            type="button"
            onClick={() => setShowOptions((v) => !v)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border shadow-sm ${
              showOptions
                ? 'bg-[#A53860] text-white border-[#A53860]'
                : 'bg-white hover:bg-[#FFA5AB]/30 text-[#450920] border-[#f0c39c]'
            }`}
            title="Map Options & Danger Zones"
          >
            <span>⚙️</span>
            <span className="hidden sm:inline">Options</span>
          </button>

          {/* Maximize / Minimize Button */}
          <button
            type="button"
            onClick={() => setIsMaximized((v) => !v)}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg bg-white hover:bg-[#FFA5AB]/30 border border-[#f0c39c] text-[#450920] text-xs font-bold transition cursor-pointer shadow-sm"
            title={isMaximized ? 'Exit Fullscreen (Esc)' : 'Maximize Map'}
          >
            <span>{isMaximized ? '🗗' : '⛶'}</span>
            <span className="hidden md:inline">{isMaximized ? 'Exit' : 'Maximize'}</span>
          </button>
        </div>
      </div>

      {/* ── MAP CANVAS (100% Full Bleed) ── */}
      <div className="flex-1 relative w-full h-full min-h-0 overflow-hidden">
        <MapContainer
          center={BBSR_CENTER}
          zoom={13}
          className="w-full h-full"
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
        >
          <MapResizer isMaximized={isMaximized} />
          <MapRefSetter onMap={setMapInstance} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
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

          {/* Danger zones (Bhubaneswar authentic polygons) */}
          {dangerZones.map((zone, i) => (
            <Polygon
              key={`z${i}`}
              positions={zone.map((c) => [c.latitude, c.longitude])}
              pathOptions={{
                fillColor:   '#EF4444',
                fillOpacity: 0.22,
                color:       '#EF4444',
                weight:      1.5,
                opacity:     0.75,
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
                  opacity: 0.28,
                }}
              />
              <Polyline
                positions={routeCoords.map((c) => [c.latitude, c.longitude])}
                pathOptions={{
                  color: isSosActive ? '#EF4444' : offRouteDistance > 65 ? '#F59E0B' : '#10B981',
                  weight: 5,
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

        {/* ── FLOATING RECENTER BUTTON (Always accessible, non-colliding) ── */}
        <button
          type="button"
          onClick={handleRecenter}
          title="Recenter map on my location"
          className="absolute right-3.5 bottom-20 sm:right-4 sm:bottom-24 z-[1000] w-11 h-11 rounded-full bg-white/95 hover:bg-[#F9DBBD] border-2 border-[#f0c39c] hover:border-[#A53860] shadow-xl flex items-center justify-center text-[#450920] hover:text-[#A53860] active:scale-95 transition-all cursor-pointer group"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="group-hover:rotate-45 transition-transform duration-300"
          >
            <circle cx="12" cy="12" r="7" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
            <line x1="12" y1="1" x2="12" y2="4" />
            <line x1="12" y1="20" x2="12" y2="23" />
            <line x1="1" y1="12" x2="4" y2="12" />
            <line x1="20" y1="12" x2="23" y2="12" />
          </svg>
        </button>

        {/* ── PRESETS SELECTION SHEET ── */}
        {showPresets && !isNavigating && (
          <div className="absolute top-14 inset-x-2.5 sm:inset-x-auto sm:left-3 sm:w-80 z-[1002] bg-[#F5EBE0]/98 backdrop-blur-xl border-2 border-[#f0c39c] rounded-2xl p-3.5 shadow-2xl space-y-2 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-[#f0c39c] pb-1.5">
              <span className="text-xs font-bold font-mono text-[#450920] uppercase flex items-center gap-1.5">
                <span>⚡</span> Bhubaneswar Route Presets
              </span>
              <button
                type="button"
                onClick={() => setShowPresets(false)}
                className="text-xs text-[#450920] hover:text-[#A53860] font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1.5">
              {BHUBANESWAR_ROUTE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="w-full text-left p-2.5 rounded-xl border border-[#f0c39c] bg-white hover:bg-[#FFA5AB]/25 transition cursor-pointer space-y-0.5 group"
                >
                  <div className="text-xs font-bold text-[#450920] group-hover:text-[#A53860] flex items-center justify-between">
                    <span>{preset.name}</span>
                    <span className="text-[10px] text-[#A53860]">Load →</span>
                  </div>
                  <p className="text-[10px] text-[#450920]/70 leading-snug">
                    {preset.subtitle}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── FLOATING ROUTE SETUP ISLAND (Responsive, non-overlapping) ── */}
        {!isNavigating && (
          <div className="absolute top-2 inset-x-2 sm:top-3 sm:left-3 sm:right-auto sm:max-w-xl z-[1000] flex flex-col gap-1.5 pointer-events-none">
            <div className="pointer-events-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 p-2 rounded-2xl bg-[#F5EBE0]/95 backdrop-blur-md border-2 border-[#f0c39c] shadow-xl w-full">
              
              {/* Coordinate Selection Row */}
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                {/* Start Point Button */}
                <button
                  type="button"
                  onClick={() => setTapMode('origin')}
                  className={`flex-1 min-w-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs transition cursor-pointer border ${
                    tapMode === 'origin'
                      ? 'bg-[#10B981]/25 border-[#10B981] text-[#450920] font-black ring-2 ring-[#10B981]/40'
                      : 'bg-white border-[#f0c39c]/70 text-[#450920] hover:bg-[#FFA5AB]/20'
                  }`}
                  title="Tap map to set start point"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shrink-0" />
                  <span className="truncate text-[11px] font-bold">
                    {origin ? `${origin.latitude.toFixed(4)}, ${origin.longitude.toFixed(4)}` : 'Tap Start'}
                  </span>
                </button>

                <span className="text-[#A53860] font-black text-xs shrink-0">→</span>

                {/* Destination Point Button */}
                <button
                  type="button"
                  onClick={() => setTapMode('destination')}
                  className={`flex-1 min-w-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs transition cursor-pointer border ${
                    tapMode === 'destination'
                      ? 'bg-[#E91E8C]/25 border-[#E91E8C] text-[#450920] font-black ring-2 ring-[#E91E8C]/40'
                      : 'bg-white border-[#f0c39c]/70 text-[#450920] hover:bg-[#FFA5AB]/20'
                  }`}
                  title="Tap map to set destination point"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E91E8C] shrink-0" />
                  <span className="truncate text-[11px] font-bold">
                    {destination ? `${destination.latitude.toFixed(4)}, ${destination.longitude.toFixed(4)}` : 'Tap Dest'}
                  </span>
                </button>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center gap-1.5 shrink-0 justify-between sm:justify-start pt-1 sm:pt-0 border-t sm:border-t-0 border-[#f0c39c]/40">
                {/* My Location */}
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  disabled={locLoading}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#FFA5AB]/40 hover:bg-[#FFA5AB]/60 border border-[#f0c39c] text-[#450920] text-xs font-bold transition cursor-pointer disabled:opacity-50 shadow-sm"
                  title="Use current GPS location"
                >
                  {locLoading ? (
                    <span className="w-3 h-3 border-2 border-[#A53860] border-t-transparent rounded-full animate-spin inline-block" />
                  ) : (
                    <span>📍</span>
                  )}
                  <span className="text-[11px]">My Loc</span>
                </button>

                {/* Clear Selected Points */}
                {(origin || destination || routeCoords.length > 0) && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-2.5 py-1.5 rounded-xl text-[#A53860] hover:text-red-700 hover:bg-red-50 text-[11px] font-bold cursor-pointer transition border border-[#f0c39c]/60"
                    title="Clear route"
                  >
                    Clear
                  </button>
                )}

                {/* Find Route Button */}
                {origin && destination && routeCoords.length === 0 && (
                  <button
                    type="button"
                    onClick={handleGetRoute}
                    disabled={loading}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#A53860] hover:bg-[#8c2e50] text-white text-xs font-bold shadow-md cursor-pointer transition animate-bounce"
                  >
                    {loading ? (
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                    ) : (
                      <span>🧭</span>
                    )}
                    <span>Find Safe Route</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── FLOATING TRIP SUMMARY & START JOURNEY CARD ── */}
        {!isNavigating && routeCoords.length > 0 && routeInfo && (
          <div className="absolute bottom-2 inset-x-2 sm:bottom-3 sm:left-3 sm:right-auto sm:max-w-md z-[1000] flex justify-center pointer-events-none">
            <div className="pointer-events-auto w-full bg-[#F5EBE0]/98 backdrop-blur-md border-2 border-[#f0c39c] rounded-2xl p-3 sm:p-3.5 shadow-2xl space-y-2">
              <div className="flex items-center justify-between gap-2 border-b border-[#f0c39c] pb-1.5">
                <div className="flex items-center gap-2 text-xs flex-wrap font-bold text-[#450920]">
                  <span className="flex items-center gap-1">
                    <span>🚶</span> {formatDist(routeInfo.distance)}
                  </span>
                  <span className="text-[#f0c39c]">·</span>
                  <span className="flex items-center gap-1">
                    <span>⏱</span> {routeInfo.time} min walk
                  </span>
                  <span className="text-[#f0c39c]">·</span>
                  <span className={`flex items-center gap-1 ${routeInfo.warning ? 'text-amber-800' : 'text-emerald-700 font-extrabold'}`}>
                    <span>{routeInfo.warning ? '⚠️' : '🛡️'}</span>
                    <span>{routeInfo.warning ? 'Caution' : 'Safe Corridor'}</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[#A53860] hover:text-red-600 text-xs px-1 cursor-pointer font-bold"
                  title="Clear route"
                >
                  ✕
                </button>
              </div>

              {fallbackMode ? (
                <div className="text-[10px] text-amber-800 bg-amber-50 border border-amber-300 rounded-lg px-2 py-1 font-semibold flex items-center justify-between">
                  <span>✨ Offline Safety Corridor Active</span>
                  <span className="text-[9px] text-amber-600 font-mono">Local Corridors</span>
                </div>
              ) : (
                <div className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg px-2 py-1 font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                    Valhalla Street Engine Active
                  </span>
                  <span className="text-[9px] text-emerald-700 font-mono">Avoiding Danger Zones</span>
                </div>
              )}

              {routeInfo.warning && (
                <p className="text-amber-800 text-[11px] bg-amber-50 border border-amber-300 rounded-xl px-2.5 py-1 font-medium leading-tight">
                  ⚠ {routeInfo.warning}
                </p>
              )}

              {/* Start Safe Journey Button */}
              <button
                type="button"
                onClick={handleStartJourney}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-400 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-700/25 transition-all cursor-pointer touch-target"
              >
                <span>🛡️</span>
                <span>START SAFE JOURNEY</span>
              </button>
            </div>
          </div>
        )}

        {/* ── TURN-BY-TURN HUD (When Navigating) ── */}
        {isNavigating && (
          <div className="absolute top-2 inset-x-2 sm:top-3 sm:inset-x-3 z-[1000] flex justify-center pointer-events-none">
            <div className={`pointer-events-auto px-3.5 py-2 rounded-2xl backdrop-blur-md shadow-2xl border flex items-center gap-3 max-w-md w-full ${
              isSosActive
                ? 'bg-red-950/95 border-red-500 text-white'
                : offRouteDistance > 65
                ? 'bg-amber-950/95 border-amber-500 text-amber-200'
                : 'bg-[#F5EBE0]/98 border-2 border-[#A53860] text-[#450920]'
            }`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                isSosActive || offRouteDistance > 65 ? 'bg-white/10' : 'bg-[#A53860] text-white'
              }`}>
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
                <p className="text-[11px] truncate mt-0.5 opacity-90">
                  {isSosActive
                    ? 'Distress telemetry streaming to emergency contacts'
                    : offRouteDistance > 65
                    ? 'Please return to illuminated safe route'
                    : activeManeuver?.instruction || 'Proceed towards your destination'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleTriggerSos}
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs transition cursor-pointer shrink-0 shadow touch-target"
              >
                SOS
              </button>
            </div>
          </div>
        )}

        {/* ── ACTIVE NAVIGATION CONTROL DOCK ── */}
        {isNavigating && (
          <div className="absolute bottom-2 inset-x-2 sm:bottom-3 sm:inset-x-3 z-[1000] flex justify-center pointer-events-none">
            <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 p-1.5 sm:p-2 rounded-2xl bg-[#F5EBE0]/95 backdrop-blur-md border-2 border-[#f0c39c] shadow-2xl">
              <button
                type="button"
                onClick={() => handleShareJourney()}
                className="flex items-center gap-1 py-2 px-3 rounded-xl bg-[#A53860] hover:bg-[#8c2e50] text-white text-xs font-bold transition cursor-pointer shadow-sm touch-target"
              >
                <span>🔗</span>
                <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
              </button>

              <button
                type="button"
                onClick={handleTriggerSos}
                className="flex items-center gap-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider shadow transition cursor-pointer touch-target"
              >
                <span>🚨</span>
                <span>SOS</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSandboxOpen((v) => !v)}
                className={`flex items-center gap-1 py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer shadow-sm touch-target ${
                  isSandboxOpen
                    ? 'bg-[#A53860] text-white border-[#A53860]'
                    : 'bg-white hover:bg-[#FFA5AB]/30 border-[#f0c39c] text-[#450920]'
                }`}
              >
                <span>🧪</span>
                <span>Sim</span>
              </button>

              <button
                type="button"
                onClick={handleEndJourney}
                className="flex items-center gap-1 py-2 px-3 rounded-xl bg-white hover:bg-[#FFA5AB]/30 border border-[#f0c39c] text-[#450920] text-xs font-bold transition cursor-pointer shadow-sm touch-target"
              >
                End
              </button>
            </div>
          </div>
        )}

        {/* ── SCENARIO SANDBOX DRAWER / BOTTOM SHEET ── */}
        {isSandboxOpen && (
          <div className="absolute inset-x-2 bottom-2 sm:bottom-auto sm:top-12 sm:left-3 sm:right-auto sm:w-96 z-[1002] bg-[#F9DBBD]/98 backdrop-blur-xl border-2 border-[#f0c39c] rounded-2xl p-3.5 shadow-2xl text-[#450920] space-y-2.5 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#f0c39c] pb-1.5">
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-[#450920] flex items-center gap-1.5">
                <span>🧪</span> Navigation Scenario Sandbox
              </span>
              <button
                type="button"
                onClick={() => setIsSandboxOpen(false)}
                className="text-[#450920] hover:text-[#A53860] text-xs cursor-pointer p-1 font-bold"
              >
                ✕
              </button>
            </div>

            {/* If no route active, quick loader */}
            {routeCoords.length === 0 && (
              <div className="p-2.5 bg-white/80 rounded-xl border border-[#f0c39c] space-y-2">
                <p className="text-[11px] text-[#450920] font-semibold">
                  Test navigation scenarios instantly:
                </p>
                <button
                  type="button"
                  onClick={() => handleSelectPreset(BHUBANESWAR_ROUTE_PRESETS[0])}
                  className="w-full py-2 bg-[#A53860] hover:bg-[#8c2e50] text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>🗺️</span> Load Bhubaneswar Demo Corridor
                </button>
              </div>
            )}

            {/* Simulator Controls */}
            {routeCoords.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-2.5 py-1.5 bg-white/80 rounded-xl border border-[#f0c39c] text-xs">
                  <span className="font-bold flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${isSimRunning ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                    {isSimRunning ? 'Simulation Running' : 'Simulation Paused'}
                  </span>
                  <span className="font-mono text-[11px] text-[#6b1d3d] font-bold">
                    {Math.round((simProgressIndex / (routeCoords.length - 1 || 1)) * 100)}% Complete
                  </span>
                </div>

                {/* Progress Scrubber */}
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[10px] font-mono font-bold text-[#450920]">
                    <span>Start</span>
                    <span>Point {simProgressIndex + 1}/{routeCoords.length}</span>
                    <span>Dest</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(0, routeCoords.length - 1)}
                    value={simProgressIndex}
                    onChange={(e) => stepSimulation(Number(e.target.value))}
                    className="w-full accent-[#A53860] cursor-pointer"
                  />
                </div>

                {/* Play / Pause & Speed Selector */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleToggleRunSim}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm text-white ${
                      isSimRunning ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    <span>{isSimRunning ? '⏸' : '▶'}</span>
                    <span>{isSimRunning ? 'Pause Sim' : 'Run Simulation'}</span>
                  </button>

                  <div className="flex items-center bg-white rounded-xl border border-[#f0c39c] p-0.5">
                    {[1, 2, 5].map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => setSimSpeed(spd)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold font-mono transition cursor-pointer ${
                          simSpeed === spd
                            ? 'bg-[#A53860] text-white'
                            : 'text-[#450920] hover:bg-[#FFA5AB]/20'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scenario Testing Buttons */}
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={handleToggleDeviate}
                    className={`py-1.5 px-2 rounded-xl border text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1 shadow-sm ${
                      isSimDeviated
                        ? 'bg-amber-500 border-amber-600 text-black font-black animate-pulse'
                        : 'bg-white hover:bg-amber-50 border-[#f0c39c] text-[#450920]'
                    }`}
                  >
                    <span>⚠️</span>
                    <span>{isSimDeviated ? 'Snap to Route' : 'Test Off-Route'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleJumpToEnd}
                    className="py-1.5 px-2 rounded-xl bg-white hover:bg-emerald-50 border border-[#f0c39c] text-[#450920] text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                  >
                    <span>🏁</span>
                    <span>Arrival</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => stepSimulation(0)}
                    className="py-1.5 px-2 rounded-xl bg-white hover:bg-gray-100 border border-[#f0c39c] text-[#450920] text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                  >
                    <span>🔄</span>
                    <span>Rewind</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTriggerSos}
                    className="py-1.5 px-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                  >
                    <span>🚨</span>
                    <span>Test SOS</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── OPTIONS SLIDE-OVER DRAWER ── */}
        {showOptions && (
          <div className="absolute top-2 inset-x-2 sm:inset-x-auto sm:top-3 sm:right-3 sm:w-80 z-[1002] bg-[#F9DBBD]/98 backdrop-blur-xl border-2 border-[#f0c39c] rounded-2xl p-3.5 shadow-2xl text-[#450920] space-y-2.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-[#f0c39c] pb-1.5">
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-[#450920] flex items-center gap-1.5">
                <span>⚙️</span> Navigation Settings
              </span>
              <button
                type="button"
                onClick={() => setShowOptions(false)}
                className="text-[#450920] hover:text-[#A53860] text-xs cursor-pointer p-1 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Avoid Danger Zones Toggle */}
            <div className="flex items-center justify-between py-2 px-2.5 bg-white/85 rounded-xl border border-[#f0c39c]">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#450920] flex items-center gap-1">
                  <span>🛡️</span> Avoid Danger Zones
                </span>
                <span className="text-[10px] text-[#6b1d3d]">
                  {avoidDanger ? 'Active detour corridor' : 'Direct unshielded route'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleAvoidDanger}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer shrink-0 ${
                  avoidDanger ? 'bg-[#10B981]' : 'bg-gray-300'
                }`}
                role="switch"
                aria-checked={avoidDanger}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                    avoidDanger ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Danger Zone Polygon Stats */}
            <div className="px-3 py-2 bg-[#FFA5AB]/25 border border-[#A53860]/30 rounded-xl">
              <p className="text-[#450920] text-[10px] font-mono leading-tight font-semibold">
                ⚠ {dangerZones.length} verified risk zones mapped in Bhubaneswar
              </p>
            </div>

            {/* Clear Route */}
            {(origin || destination) && (
              <button
                type="button"
                onClick={() => {
                  handleClear();
                  setShowOptions(false);
                }}
                className="w-full py-2 bg-white hover:bg-red-50 border border-red-300 text-red-600 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
              >
                ✕ Clear Current Coordinates
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
