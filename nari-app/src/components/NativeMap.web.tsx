import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Switch, ScrollView } from 'react-native';
import { MapContainer, TileLayer, Marker, Polyline, Polygon, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BHUBANESWAR_CENTER, COLORS } from '../constants/Config';
import { fetchSafeRoute, fetchPolygons } from '../api/naviApi';
import { decodePolyline } from '../utils/decode';
import type { LatLng, RouteInfo } from '../types';

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
const myLocIcon  = makeIcon(COLORS.accent);

type TapMode = 'origin' | 'destination';

// ── Inner component that listens to map click events ──────────────────────────
function MapClickHandler({
  tapMode,
  onMapPress,
}: {
  tapMode: TapMode;
  onMapPress: (latlng: { lat: number; lng: number }) => void;
}) {
  useMapEvents({ click: (e) => onMapPress(e.latlng) });
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

// ── Main Web Map Screen ────────────────────────────────────────────────────────
export default function NativeMapScreen() {
  const [origin, setOrigin]           = useState<LatLng | null>(null);
  const [destination, setDestination] = useState<LatLng | null>(null);
  const [tapMode, setTapMode]         = useState<TapMode>('origin');
  const [myLocation, setMyLocation]   = useState<LatLng | null>(null);

  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [altRoutes, setAltRoutes]     = useState<LatLng[][]>([]);
  const [dangerZones, setDangerZones] = useState<LatLng[][]>([]);

  const [loading, setLoading]         = useState(false);
  const [loadingZones, setLoadingZones] = useState(true);
  const [locLoading, setLocLoading]   = useState(false);
  const [routeInfo, setRouteInfo]     = useState<RouteInfo | null>(null);
  const [avoidDanger, setAvoidDanger] = useState(true);
  const [backendOnline, setBackendOnline] = useState(false);
  const [errorMsg, setErrorMsg]       = useState<string | null>(null);
  const [fitCoords, setFitCoords]     = useState<LatLng[]>([]);

  // ── Load danger zones on mount ───────────────────────────────────────────
  useEffect(() => {
    fetchPolygons()
      .then((data) => {
        const zones = data.polygons.map((poly) =>
          poly.map((coord: number[]) => ({ latitude: coord[1], longitude: coord[0] }))
        );
        setDangerZones(zones);
        setBackendOnline(true);
      })
      .catch(() => setBackendOnline(false))
      .finally(() => setLoadingZones(false));
  }, []);

  // ── Handle map tap ───────────────────────────────────────────────────────
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

  // ── Clear all ────────────────────────────────────────────────────────────
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
    <View style={styles.container}>
      {/* Inject Leaflet CSS cursor fix globally */}
      <style>{`
        .leaflet-container { cursor: crosshair !important; font-family: inherit; }
        .leaflet-control-attribution { font-size: 9px !important; opacity: 0.6; }
      `}</style>

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

          <MapClickHandler tapMode={tapMode} onMapPress={handleMapPress} />
          {fitCoords.length > 1 && <MapFitter coords={fitCoords} />}

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

          {/* Alternate routes */}
          {altRoutes.map((alt, i) => (
            <Polyline
              key={`alt${i}`}
              positions={alt.map((c) => [c.latitude, c.longitude])}
              pathOptions={{ color: '#888', weight: 4, opacity: 0.4, dashArray: '8 5' }}
            />
          ))}

          {/* Route glow */}
          {routeCoords.length > 0 && (
            <>
              <Polyline
                positions={routeCoords.map((c) => [c.latitude, c.longitude])}
                pathOptions={{ color: COLORS.safe, weight: 14, opacity: 0.18 }}
              />
              <Polyline
                positions={routeCoords.map((c) => [c.latitude, c.longitude])}
                pathOptions={{ color: COLORS.safe, weight: 4, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }}
              />
            </>
          )}

          {myLocation && (
            <Marker
              position={[myLocation.latitude, myLocation.longitude]}
              icon={myLocIcon}
            />
          )}
          {origin && <Marker position={[origin.latitude, origin.longitude]} icon={originIcon} />}
          {destination && <Marker position={[destination.latitude, destination.longitude]} icon={destIcon} />}
        </MapContainer>

        {/* Loading overlay while zones fetch */}
        {loadingZones && (
          <View style={styles.mapOverlay}>
            <ActivityIndicator color={COLORS.primaryLight} size="large" />
            <Text style={styles.loadingText}>Loading safety data…</Text>
          </View>
        )}
      </View>

      {/* ── HEADER OVERLAY ── */}
      <View style={styles.header} pointerEvents="box-none">
        <View style={styles.headerInner}>
          <View style={styles.headerLeft}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>N</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>NARI Nav</Text>
              <Text style={styles.headerSub}>Safe Routes · Bhubaneswar</Text>
            </View>
          </View>
          {backendOnline ? (
            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Live</Text>
            </View>
          ) : (
            <View style={styles.offlineBadge}>
              <Text style={styles.offlineText}>⚡ Offline</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── TAP HINT ── */}
      <View style={styles.tapHint} pointerEvents="none">
        <Text style={[styles.tapDot, { color: tapMode === 'origin' ? COLORS.safe : COLORS.secondary }]}>●</Text>
        <Text style={styles.tapHintText}>
          {tapMode === 'origin' ? 'Click map to set start' : 'Click map to set destination'}
        </Text>
      </View>

      {/* ── SIDE PANEL ── */}
      <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent} showsVerticalScrollIndicator={false}>
        <View style={styles.panelHandle} />

        {/* Legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.safe }]} />
            <Text style={styles.legendText}>Start</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.secondary }]} />
            <Text style={styles.legendText}>End</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.danger, opacity: 0.7 }]} />
            <Text style={styles.legendText}>Danger Zone</Text>
          </View>
        </View>

        {/* Point pills */}
        <View style={styles.pointPill}>
          <View style={[styles.pointDot, { backgroundColor: COLORS.safe }]} />
          <Text style={styles.pointText} numberOfLines={1}>
            {origin
              ? `${origin.latitude.toFixed(5)}, ${origin.longitude.toFixed(5)}`
              : 'Click map to set start'}
          </Text>
        </View>
        <View style={styles.pointConnector} />
        <View style={styles.pointPill}>
          <View style={[styles.pointDot, { backgroundColor: COLORS.secondary }]} />
          <Text style={styles.pointText} numberOfLines={1}>
            {destination
              ? `${destination.latitude.toFixed(5)}, ${destination.longitude.toFixed(5)}`
              : 'Click map to set destination'}
          </Text>
        </View>

        {/* Avoid danger toggle */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>🛡 Avoid danger zones</Text>
          <Switch
            value={avoidDanger}
            onValueChange={setAvoidDanger}
            trackColor={{ false: COLORS.muted, true: COLORS.safe }}
            thumbColor={COLORS.white}
          />
        </View>

        {/* Zone count banner */}
        {backendOnline && dangerZones.length > 0 && (
          <View style={styles.zoneBanner}>
            <Text style={styles.zoneBannerText}>
              ⚠ {dangerZones.length} high-risk zones identified in Bhubaneswar
            </Text>
          </View>
        )}

        {/* Error message */}
        {errorMsg && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Route stats */}
        {routeInfo && (
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statIcon}>🚶</Text>
              <Text style={styles.statVal}>{formatDist(routeInfo.distance)}</Text>
              <Text style={styles.statLbl}>distance</Text>
            </View>
            <View style={styles.statDiv} />
            <View style={styles.stat}>
              <Text style={styles.statIcon}>⏱</Text>
              <Text style={styles.statVal}>{routeInfo.time} min</Text>
              <Text style={styles.statLbl}>walking</Text>
            </View>
            <View style={styles.statDiv} />
            <View style={styles.stat}>
              <Text style={styles.statIcon}>{routeInfo.warning ? '⚠' : '✅'}</Text>
              <Text style={[styles.statVal, { color: routeInfo.warning ? COLORS.warning : COLORS.safe }]}>
                {routeInfo.warning ? 'Limited' : 'Safe'}
              </Text>
              <Text style={styles.statLbl}>route</Text>
            </View>
          </View>
        )}

        {routeInfo?.warning && (
          <View style={styles.warnBanner}>
            <Text style={styles.warnText}>⚠ {routeInfo.warning}</Text>
          </View>
        )}

        {/* Use My Location button */}
        <TouchableOpacity style={styles.locBtn} onPress={handleUseMyLocation} activeOpacity={0.8}>
          {locLoading ? (
            <ActivityIndicator size="small" color={COLORS.accent} />
          ) : (
            <Text style={styles.locBtnText}>📍 Use My Location</Text>
          )}
        </TouchableOpacity>

        {/* Get Route button */}
        <TouchableOpacity
          style={[styles.routeBtn, (!origin || !destination) && styles.routeBtnOff]}
          onPress={handleGetRoute}
          disabled={loading || !origin || !destination}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.routeBtnText}>🧭 Find Safe Route</Text>
          )}
        </TouchableOpacity>

        {/* Clear button */}
        {(origin || destination) && (
          <TouchableOpacity style={styles.clearBtn} onPress={handleClear} activeOpacity={0.8}>
            <Text style={styles.clearBtnText}>✕ Clear All</Text>
          </TouchableOpacity>
        )}

        {/* Backend offline help */}
        {!backendOnline && !loadingZones && (
          <View style={styles.offlineCard}>
            <Text style={styles.offlineCardTitle}>Backend Offline</Text>
            <Text style={styles.offlineCardText}>
              Start the backend to enable danger zones and routing:{'\n'}
              {'  '}$ docker-compose up{'\n'}
              {'  '}(in the navsys/ directory)
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: COLORS.dark },

  // Map
  mapWrapper: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  mapOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13,5,33,0.6)',
    zIndex: 999,
    gap: 12,
  },
  loadingText: { color: COLORS.subtext, fontSize: 14 },

  // Header overlay
  header: {
    position: 'absolute',
    top: 14,
    left: 14,
    zIndex: 50,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(13,5,33,0.92)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.secondary,
  },
  logoText: { color: COLORS.white, fontWeight: '900', fontSize: 18 },
  headerTitle: { color: COLORS.text, fontWeight: '700', fontSize: 15, letterSpacing: 0.5 },
  headerSub: { color: COLORS.subtext, fontSize: 11 },
  onlineBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.4)',
  },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.safe },
  onlineText: { color: COLORS.safe, fontSize: 11, fontWeight: '600' },
  offlineBadge: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)',
  },
  offlineText: { color: COLORS.danger, fontSize: 11, fontWeight: '600' },

  // Tap hint
  tapHint: {
    position: 'absolute',
    top: 80,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(13,5,33,0.85)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    zIndex: 50,
  },
  tapDot: { fontSize: 10 },
  tapHintText: { color: COLORS.subtext, fontSize: 12 },

  // Side panel
  panel: {
    width: 300,
    backgroundColor: COLORS.card,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.cardBorder,
  },
  panelContent: {
    padding: 18,
    paddingBottom: 40,
    gap: 10,
  },
  panelHandle: {
    width: 38, height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.muted,
    alignSelf: 'center',
    marginBottom: 6,
  },

  // Legend
  legendRow: { flexDirection: 'row', gap: 12, marginBottom: 4, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: COLORS.subtext, fontSize: 11 },

  // Point pills
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
    width: 2, height: 8,
    backgroundColor: COLORS.muted,
    marginLeft: 15,
    marginVertical: 2,
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  toggleLabel: { color: COLORS.text, fontSize: 13, fontWeight: '500', flex: 1 },

  // Zone banner
  zoneBanner: {
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  zoneBannerText: { color: 'rgba(239,68,68,0.85)', fontSize: 11 },

  // Error
  errorBanner: {
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  errorText: { color: COLORS.danger, fontSize: 12 },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  stat: { alignItems: 'center', gap: 3, flex: 1 },
  statIcon: { fontSize: 15 },
  statVal: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  statLbl: { color: COLORS.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
  statDiv: { width: 1, height: 34, backgroundColor: COLORS.cardBorder },

  // Warning banner
  warnBanner: {
    paddingHorizontal: 10, paddingVertical: 7,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  warnText: { color: COLORS.warning, fontSize: 11 },

  // Location button
  locBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: 'rgba(0,188,212,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,188,212,0.4)',
    marginTop: 4,
  },
  locBtnText: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },

  // Route button
  routeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    borderWidth: 1.5,
    borderColor: COLORS.secondary,
    marginTop: 2,
  },
  routeBtnOff: {
    backgroundColor: COLORS.muted,
    borderColor: 'transparent',
  },
  routeBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700', letterSpacing: 0.4 },

  // Clear button
  clearBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  clearBtnText: { color: COLORS.danger, fontSize: 13, fontWeight: '600' },

  // Offline card
  offlineCard: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginTop: 6,
  },
  offlineCardTitle: { color: COLORS.danger, fontWeight: '700', fontSize: 13, marginBottom: 6 },
  offlineCardText: { color: COLORS.subtext, fontSize: 11, lineHeight: 19, fontFamily: 'monospace' },
});
