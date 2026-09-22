import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Switch, ScrollView } from 'react-native';
import { MapContainer, TileLayer, Marker, Polyline, Polygon, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BHUBANESWAR_CENTER, COLORS, WEB_TRACKER_BASE_URL } from '../constants/Config';
import { fetchSafeRoute, fetchPolygons } from '../api/naviApi';
import { decodePolyline } from '../utils/decode';
import { useLocation } from '../hooks/useLocation';
import { distanceToPolylineMeters, getActiveManeuver } from '../utils/geo';
import {
  createJourneySession,
  updateLiveLocation,
  updateJourneyStatus,
} from '../lib/firebase';
import type {
  LatLng,
  RouteInfo,
  ValhallaManeuver,
  LiveJourneySession,
  LiveLocationData,
} from '../types';

// ── Fix Leaflet default icons in bundled environments ────────────────────────
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom colored markers
const makeIcon = (color: string) =>
  L.divIcon({
    className: '',
    html: `<div style="
      width:18px;height:18px;border-radius:50%;
      background:${color};border:3px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,0.5);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

const originIcon = makeIcon(COLORS.safe);
const destIcon   = makeIcon(COLORS.secondary);

const createLiveMarkerIcon = (heading: number | null | undefined, isSos: boolean, isOffRoute: boolean) => {
  const color = isSos ? '#EF4444' : isOffRoute ? '#F59E0B' : '#10B981';
  return L.divIcon({
    className: '',
    html: `
      <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: ${color}44; animation: ping 1.5s infinite;"></div>
        <div style="width: 22px; height: 22px; border-radius: 50%; background: ${color}; border: 2.5px solid #fff; display: flex; align-items: center; justify-content: center; transform: rotate(${heading || 0}deg);">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
            <polygon points="12,2 22,22 12,17 2,22" />
          </svg>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

type TapMode = 'origin' | 'destination';

// ── Inner component that listens to map click events ──────────────────────────
function MapClickHandler({
  tapMode,
  onMapPress,
  disabled,
}: {
  tapMode: TapMode;
  onMapPress: (latlng: { lat: number; lng: number }) => void;
  disabled: boolean;
}) {
  useMapEvents({
    click: (e) => {
      if (!disabled) onMapPress(e.latlng);
    },
  });
  return null;
}

// ── Pan/zoom the map to a region ──────────────────────────────────────────────
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

function MapPanner({ center }: { center: [number, number] | null }) {
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

export default function NativeMapWeb() {
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [destination, setDestination] = useState<LatLng | null>(null);
  const [myLocation, setMyLocation] = useState<LatLng | null>(null);
  const [tapMode, setTapMode] = useState<TapMode>('origin');

  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [altRoutes, setAltRoutes] = useState<LatLng[][]>([]);
  const [dangerZones, setDangerZones] = useState<LatLng[][]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingZones, setLoadingZones] = useState(true);
  const [locLoading, setLocLoading] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [avoidDanger, setAvoidDanger] = useState(true);
  const [backendOnline, setBackendOnline] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fitCoords, setFitCoords] = useState<LatLng[]>([]);

  // ── Navigation & Firebase Live State ─────────────────────────────────────
  const [isNavigating, setIsNavigating] = useState(false);
  const [journeyId, setJourneyId] = useState<string | null>(null);
  const [liveLocation, setLiveLocation] = useState<LiveLocationData | null>(null);
  const [activeManeuver, setActiveManeuver] = useState<ValhallaManeuver | null>(null);
  const [distToManeuver, setDistToManeuver] = useState<number>(0);
  const [offRouteDistance, setOffRouteDistance] = useState<number>(0);
  const [isSosActive, setIsSosActive] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const stopWatchRef = useRef<(() => void) | null>(null);
  const { startWatchingLocation, stopWatchingLocation } = useLocation();

  // ── Load danger zones on mount ──────────────────────────────────────────
  useEffect(() => {
    fetchPolygons()
      .then((data) => {
        const zones = data.polygons.map((poly) =>
          poly.map((coord: number[]) => ({
            latitude: coord[1],
            longitude: coord[0],
          }))
        );
        setDangerZones(zones);
        setBackendOnline(true);
      })
      .catch(() => setBackendOnline(false))
      .finally(() => setLoadingZones(false));
  }, []);

  // Cleanup location watcher on unmount
  useEffect(() => {
    return () => {
      if (stopWatchRef.current) stopWatchRef.current();
      stopWatchingLocation();
    };
  }, [stopWatchingLocation]);

  // ── Map click handler ───────────────────────────────────────────────────
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

  // ── Use browser geolocation ──────────────────────────────────────────────
  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by this browser.');
      return;
    }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coord: LatLng = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
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

  // ── Fetch safe route ─────────────────────────────────────────────────────
  const handleGetRoute = useCallback(async () => {
    if (!origin || !destination) {
      setErrorMsg('Tap the map to set a start and destination.');
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
        end_lat: destination.latitude,
        end_lon: destination.longitude,
        costing: 'pedestrian',
        avoid_danger_zones: avoidDanger,
      });

      if (resp.trip?.legs?.[0]?.shape) {
        const coords = decodePolyline(resp.trip.legs[0].shape);
        setRouteCoords(coords);
        setFitCoords(coords);
        setRouteInfo({
          distance: resp.trip.summary.length,
          time: Math.round(resp.trip.summary.time / 60),
          warning: resp.warning,
          maneuvers: resp.trip.legs[0].maneuvers,
        });
      }
      if (resp.alternates) {
        const alts = (resp.alternates as any[])
          .filter((a) => a.trip?.legs?.[0]?.shape)
          .map((a) => decodePolyline(a.trip.legs[0].shape));
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

  // ── Share Journey Link ───────────────────────────────────────────────────
  const handleShareJourney = useCallback((targetId?: string) => {
    const jId = targetId || journeyId;
    if (!jId) return;
    const trackingUrl = `${WEB_TRACKER_BASE_URL}/?track=${jId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(trackingUrl);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 3000);
    }
    if (navigator.share) {
      navigator.share({
        title: 'NARI Safe Journey Tracking',
        text: `🛡️ Track my live location & route on NARI: ${trackingUrl}`,
        url: trackingUrl,
      }).catch(() => {});
    }
  }, [journeyId]);

  // ── Start Journey Live ───────────────────────────────────────────────────
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

      // Start continuous location updates
      const cleanup = await startWatchingLocation(async (locData) => {
        setLiveLocation(locData);

        const offDist = distanceToPolylineMeters(
          { latitude: locData.latitude, longitude: locData.longitude },
          routeCoords
        );
        setOffRouteDistance(offDist);

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
        });
      });

      stopWatchRef.current = cleanup;
      handleShareJourney(newJourneyId);
    } catch (e: any) {
      setErrorMsg(`Could not start live journey: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [origin, destination, routeCoords, routeInfo, isSosActive, startWatchingLocation, handleShareJourney]);

  // ── End Journey ──────────────────────────────────────────────────────────
  const handleEndJourney = useCallback(async () => {
    if (stopWatchRef.current) {
      stopWatchRef.current();
      stopWatchRef.current = null;
    }
    stopWatchingLocation();
    if (journeyId) {
      await updateJourneyStatus(journeyId, 'completed').catch(() => {});
    }
    setIsNavigating(false);
    setJourneyId(null);
    setIsSosActive(false);
    setLiveLocation(null);
    setActiveManeuver(null);
  }, [journeyId, stopWatchingLocation]);

  // ── Trigger SOS ──────────────────────────────────────────────────────────
  const handleTriggerSos = useCallback(async () => {
    setIsSosActive(true);
    if (journeyId) {
      await updateJourneyStatus(journeyId, 'sos').catch(() => {});
    }
  }, [journeyId]);

  // ── Clear all ────────────────────────────────────────────────────────────
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
    <View style={[styles.container, isSosActive && styles.containerSos]}>
      {/* ── MAP ── */}
      <View style={styles.mapWrapper}>
        <MapContainer
          center={[BHUBANESWAR_CENTER.latitude, BHUBANESWAR_CENTER.longitude]}
          zoom={13}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapClickHandler tapMode={tapMode} onMapPress={handleMapPress} disabled={isNavigating} />
          {!isNavigating && fitCoords.length > 1 && <MapFitter coords={fitCoords} />}
          {isNavigating && liveLocation && (
            <MapPanner center={[liveLocation.latitude, liveLocation.longitude]} />
          )}

          {/* Danger zones */}
          {dangerZones.map((zone, i) => (
            <Polygon
              key={`z${i}`}
              positions={zone.map((c) => [c.latitude, c.longitude])}
              pathOptions={{
                fillColor: COLORS.danger,
                fillOpacity: 0.18,
                color: COLORS.danger,
                weight: 1.5,
                opacity: 0.7,
              }}
            />
          ))}

          {/* Safe Route Polyline */}
          {routeCoords.length > 0 && (
            <>
              <Polyline
                positions={routeCoords.map((c) => [c.latitude, c.longitude])}
                pathOptions={{
                  color: isSosActive ? COLORS.danger : offRouteDistance > 65 ? COLORS.warning : COLORS.safe,
                  weight: 12,
                  opacity: 0.25,
                }}
              />
              <Polyline
                positions={routeCoords.map((c) => [c.latitude, c.longitude])}
                pathOptions={{
                  color: isSosActive ? COLORS.danger : offRouteDistance > 65 ? COLORS.warning : COLORS.safe,
                  weight: 4.5,
                  opacity: 0.9,
                }}
              />
            </>
          )}

          {origin && (
            <Marker position={[origin.latitude, origin.longitude]} icon={originIcon} />
          )}
          {destination && (
            <Marker position={[destination.latitude, destination.longitude]} icon={destIcon} />
          )}

          {/* Moving Live User GPS Marker */}
          {isNavigating && liveLocation && (
            <Marker
              position={[liveLocation.latitude, liveLocation.longitude]}
              icon={createLiveMarkerIcon(liveLocation.heading, isSosActive, offRouteDistance > 65)}
            />
          )}
        </MapContainer>
      </View>

      {/* ── ACTIVE TURN-BY-TURN HUD (When Navigating) ── */}
      {isNavigating ? (
        <View
          style={[
            styles.navHud,
            isSosActive && styles.navHudSos,
            offRouteDistance > 65 && !isSosActive && styles.navHudWarn,
          ]}
        >
          <View style={styles.navHudIconCircle}>
            <Text style={{ fontSize: 20 }}>
              {isSosActive ? '🚨' : offRouteDistance > 65 ? '⚠️' : '➡️'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            {isSosActive ? (
              <>
                <Text style={styles.navHudDist}>DISTRESS SOS TRANSMITTING</Text>
                <Text style={styles.navHudText}>Emergency coordinates streaming to cloud & contacts</Text>
              </>
            ) : offRouteDistance > 65 ? (
              <>
                <Text style={[styles.navHudDist, { color: COLORS.warning }]}>
                  OFF SAFE ROUTE ({Math.round(offRouteDistance)} m)
                </Text>
                <Text style={styles.navHudText}>Return to designated safe path</Text>
              </>
            ) : (
              <>
                <Text style={styles.navHudDist}>
                  {distToManeuver > 0 ? `In ${distToManeuver} m` : 'Follow safe route'}
                </Text>
                <Text style={styles.navHudText}>
                  {activeManeuver?.instruction || 'Proceed along designated safe corridor'}
                </Text>
              </>
            )}
          </View>
          <TouchableOpacity style={styles.sosButton} onPress={handleTriggerSos}>
            <Text style={styles.sosButtonText}>SOS</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Normal Header */
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>N</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>NARI Nav</Text>
              <Text style={styles.headerSub}>Safe Routes · Bhubaneswar</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={backendOnline ? styles.onlineBadge : styles.offlineBadge}>
              <View style={backendOnline ? styles.onlineDot : styles.offlineDot} />
              <Text style={backendOnline ? styles.onlineText : styles.offlineText}>
                {backendOnline ? 'Backend Online' : 'Backend Offline'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* ── TAP HINT ── */}
      {!isNavigating && (
        <View style={styles.tapHint}>
          <Text style={styles.tapHintIcon}>{tapMode === 'origin' ? '🟢' : '🔴'}</Text>
          <Text style={styles.tapHintText}>
            {tapMode === 'origin' ? 'Click map to set Start Point' : 'Click map to set Destination'}
          </Text>
          {(origin || destination) && (
            <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Floating GPS button */}
      {!isNavigating && (
        <View style={styles.floatBtns}>
          <TouchableOpacity
            style={styles.fab}
            onPress={handleUseMyLocation}
            disabled={locLoading}
          >
            {locLoading ? (
              <ActivityIndicator size="small" color={COLORS.primaryLight} />
            ) : (
              <Text style={{ fontSize: 18 }}>📍</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ── BOTTOM PANEL / NAVIGATION HUD ── */}
      {isNavigating ? (
        <View style={styles.navBottomBar}>
          <View style={styles.navMetricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricVal}>
                {(liveLocation?.speed || 0).toFixed(1)}
              </Text>
              <Text style={styles.metricLbl}>km/h speed</Text>
            </View>
            <View style={styles.metricDiv} />
            <View style={styles.metricCard}>
              <Text style={styles.metricVal}>{routeInfo?.time || '--'} min</Text>
              <Text style={styles.metricLbl}>est arrival</Text>
            </View>
            <View style={styles.metricDiv} />
            <View style={styles.metricCard}>
              <Text style={styles.metricVal}>
                {routeInfo?.distance ? formatDist(routeInfo.distance) : '--'}
              </Text>
              <Text style={styles.metricLbl}>distance</Text>
            </View>
          </View>

          <View style={styles.navActionsRow}>
            <TouchableOpacity
              style={styles.shareLiveBtn}
              onPress={() => handleShareJourney()}
            >
              <Text style={styles.shareLiveBtnText}>
                {shareSuccess ? '✓ Link Copied!' : '🔗 Share Route'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.endBtn} onPress={handleEndJourney}>
              <Text style={styles.endBtnText}>End Safe Journey</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Normal Route Config Panel */
        <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent}>
          <View style={styles.pointsRow}>
            <View style={styles.pointPill}>
              <View style={[styles.pointDot, { backgroundColor: COLORS.safe }]} />
              <Text style={styles.pointText} numberOfLines={1}>
                {origin ? `${origin.latitude.toFixed(5)}, ${origin.longitude.toFixed(5)}` : 'Click map to set Start'}
              </Text>
            </View>
            <View style={styles.pointConnector} />
            <View style={styles.pointPill}>
              <View style={[styles.pointDot, { backgroundColor: COLORS.secondary }]} />
              <Text style={styles.pointText} numberOfLines={1}>
                {destination ? `${destination.latitude.toFixed(5)}, ${destination.longitude.toFixed(5)}` : 'Click map to set Destination'}
              </Text>
            </View>
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleIcon}>🛡️</Text>
            <Text style={styles.toggleLabel}>Avoid high-risk danger zones</Text>
            <Switch
              value={avoidDanger}
              onValueChange={setAvoidDanger}
              trackColor={{ false: COLORS.muted, true: COLORS.safe }}
              thumbColor={COLORS.white}
            />
          </View>

          {backendOnline && dangerZones.length > 0 && (
            <View style={styles.zoneBanner}>
              <Text style={styles.zoneBannerText}>
                ⚠️ {dangerZones.length} high-risk zones active in Bhubaneswar
              </Text>
            </View>
          )}

          {routeInfo && (
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statVal}>{formatDist(routeInfo.distance)}</Text>
                <Text style={styles.statLbl}>distance</Text>
              </View>
              <View style={styles.statDiv} />
              <View style={styles.stat}>
                <Text style={styles.statVal}>{routeInfo.time} min</Text>
                <Text style={styles.statLbl}>walking</Text>
              </View>
              <View style={styles.statDiv} />
              <View style={styles.stat}>
                <Text style={[styles.statVal, { color: routeInfo.warning ? COLORS.warning : COLORS.safe }]}>
                  {routeInfo.warning ? 'Limited' : 'Safe'}
                </Text>
                <Text style={styles.statLbl}>route</Text>
              </View>
            </View>
          )}

          {errorMsg && (
            <View style={styles.warnBanner}>
              <Text style={styles.warnText}>{errorMsg}</Text>
            </View>
          )}

          {routeCoords.length > 0 ? (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                style={[styles.routeBtn, { flex: 0.35, backgroundColor: COLORS.inputBg }]}
                onPress={handleGetRoute}
                disabled={loading}
              >
                <Text style={[styles.routeBtnText, { fontSize: 13 }]}>Recalculate</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.routeBtn, { flex: 0.65, backgroundColor: '#059669', borderColor: '#34D399' }]}
                onPress={handleStartJourney}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.routeBtnText}>🛡️ Start Safe Journey</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.routeBtn, (!origin || !destination) && styles.routeBtnOff]}
              onPress={handleGetRoute}
              disabled={loading || !origin || !destination}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.routeBtnText}>Find Safe Route</Text>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark, height: '100vh' as any },
  containerSos: { borderWidth: 4, borderColor: COLORS.danger },
  mapWrapper: { flex: 1, position: 'relative' },

  header: {
    position: 'absolute',
    top: 10,
    left: 14,
    right: 14,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(13,5,33,0.92)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.secondary,
  },
  logoText: { color: COLORS.white, fontWeight: '900', fontSize: 18 },
  headerTitle: { color: COLORS.text, fontWeight: '700', fontSize: 15 },
  headerSub: { color: COLORS.subtext, fontSize: 11 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.4)',
  },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.safe },
  onlineText: { color: COLORS.safe, fontSize: 11, fontWeight: '600' },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
  },
  offlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.danger },
  offlineText: { color: COLORS.danger, fontSize: 11, fontWeight: '600' },

  navHud: {
    position: 'absolute',
    top: 10,
    left: 14,
    right: 14,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(20,8,39,0.96)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.safe,
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)' as any,
  },
  navHudWarn: { borderColor: COLORS.warning, backgroundColor: 'rgba(35,20,5,0.96)' },
  navHudSos: { borderColor: COLORS.danger, backgroundColor: 'rgba(45,5,15,0.96)' },
  navHudIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navHudDist: { color: COLORS.white, fontSize: 15, fontWeight: '800' },
  navHudText: { color: COLORS.subtext, fontSize: 12, marginTop: 2 },
  sosButton: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  sosButtonText: { color: COLORS.white, fontWeight: '900', fontSize: 13 },

  tapHint: {
    position: 'absolute',
    top: 72,
    left: 14,
    right: 14,
    zIndex: 900,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(13,5,33,0.85)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  tapHintIcon: { fontSize: 12 },
  tapHintText: { color: COLORS.subtext, fontSize: 12, flex: 1 },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
  },
  clearText: { color: COLORS.danger, fontSize: 11, fontWeight: '600' },

  floatBtns: {
    position: 'absolute',
    right: 14,
    bottom: 340,
    zIndex: 900,
  },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(13,5,33,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    cursor: 'pointer' as any,
  },

  navBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(20,8,39,0.96)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
  },
  navMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: COLORS.inputBg,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  metricCard: { alignItems: 'center', flex: 1 },
  metricVal: { color: COLORS.white, fontSize: 18, fontWeight: '800' },
  metricLbl: { color: COLORS.subtext, fontSize: 10, textTransform: 'uppercase', marginTop: 2 },
  metricDiv: { width: 1, height: 32, backgroundColor: COLORS.cardBorder },
  navActionsRow: { flexDirection: 'row', gap: 12 },
  shareLiveBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    backgroundColor: COLORS.inputBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    cursor: 'pointer' as any,
  },
  shareLiveBtnText: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
  endBtn: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    backgroundColor: COLORS.danger,
    borderRadius: 14,
    cursor: 'pointer' as any,
  },
  endBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 14 },

  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: 330,
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: COLORS.cardBorder,
    zIndex: 1000,
  },
  panelContent: { paddingHorizontal: 18, paddingBottom: 24, paddingTop: 14 },
  pointsRow: { marginBottom: 10 },
  pointPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  pointDot: { width: 9, height: 9, borderRadius: 5 },
  pointText: { color: COLORS.text, fontSize: 12, flex: 1, fontFamily: 'monospace' },
  pointConnector: {
    width: 2,
    height: 8,
    backgroundColor: COLORS.muted,
    marginLeft: 15,
    marginVertical: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    paddingVertical: 2,
  },
  toggleIcon: { fontSize: 14 },
  toggleLabel: { color: COLORS.text, fontSize: 14, flex: 1, fontWeight: '500' },
  zoneBanner: {
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  zoneBannerText: { color: 'rgba(239,68,68,0.85)', fontSize: 11 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  stat: { alignItems: 'center', gap: 3, flex: 1 },
  statVal: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  statLbl: { color: COLORS.muted, fontSize: 10, textTransform: 'uppercase' },
  statDiv: { width: 1, height: 34, backgroundColor: COLORS.cardBorder },
  warnBanner: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
    marginBottom: 8,
  },
  warnText: { color: COLORS.warning, fontSize: 11 },
  routeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    borderWidth: 1.5,
    borderColor: COLORS.secondary,
    marginTop: 4,
    cursor: 'pointer' as any,
  },
  routeBtnOff: {
    backgroundColor: COLORS.muted,
    borderColor: 'transparent',
  },
  routeBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
});
