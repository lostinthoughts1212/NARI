import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  Switch,
  Animated,
  SafeAreaView,
  Platform,
} from 'react-native';
import MapView, {
  Marker,
  Polyline,
  Polygon,
  type MapPressEvent,
} from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { BHUBANESWAR_CENTER, COLORS } from '../constants/Config';
import { fetchSafeRoute, fetchPolygons } from '../api/naviApi';
import { decodePolyline } from '../utils/decode';
import { useLocation } from '../hooks/useLocation';
import type { LatLng, RouteInfo } from '../types';

const { height } = Dimensions.get('window');
const PANEL_HEIGHT = 340;

type TapMode = 'origin' | 'destination';

export default function NativeMapScreen() {
  const mapRef = useRef<MapView>(null);
  const panelAnim = useRef(new Animated.Value(1)).current;
  const [panelOpen, setPanelOpen] = useState(true);

  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [destination, setDestination] = useState<LatLng | null>(null);
  const [tapMode, setTapMode] = useState<TapMode>('origin');

  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [altRoutes, setAltRoutes] = useState<LatLng[][]>([]);
  const [dangerZones, setDangerZones] = useState<LatLng[][]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingZones, setLoadingZones] = useState(true);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [avoidDanger, setAvoidDanger] = useState(true);
  const [backendOnline, setBackendOnline] = useState(false);

  const { loading: locationLoading, requestLocation } = useLocation();

  // ── Load danger zones on mount ──────────────────────────────────────────
  useEffect(() => {
    fetchPolygons()
      .then((data) => {
        // Valhalla / GeoJSON uses [lon, lat] — swap to { latitude, longitude }
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

  // ── Panel slide animation ────────────────────────────────────────────────
  const togglePanel = useCallback(() => {
    const toValue = panelOpen ? 0 : 1;
    Animated.spring(panelAnim, {
      toValue,
      useNativeDriver: true,
      friction: 8,
      tension: 60,
    }).start();
    setPanelOpen((prev) => !prev);
  }, [panelOpen, panelAnim]);

  // ── Map tap: place origin then destination ──────────────────────────────
  const handleMapPress = useCallback(
    (e: MapPressEvent) => {
      const coord = e.nativeEvent.coordinate;
      setRouteCoords([]);
      setAltRoutes([]);
      setRouteInfo(null);
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

  // ── Use device GPS as origin ────────────────────────────────────────────
  const handleUseMyLocation = useCallback(async () => {
    const loc = await requestLocation();
    if (loc) {
      setOrigin(loc);
      setTapMode('destination');
      setRouteCoords([]);
      setAltRoutes([]);
      setRouteInfo(null);
      mapRef.current?.animateToRegion(
        { ...loc, latitudeDelta: 0.02, longitudeDelta: 0.02 },
        800
      );
    }
  }, [requestLocation]);

  // ── Fetch safe route ────────────────────────────────────────────────────
  const handleGetRoute = useCallback(async () => {
    if (!origin || !destination) {
      Alert.alert('Missing Points', 'Tap the map to set a start and destination.');
      return;
    }
    setLoading(true);
    setRouteCoords([]);
    setAltRoutes([]);
    setRouteInfo(null);

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
        setRouteInfo({
          distance: resp.trip.summary.length,
          time: Math.round(resp.trip.summary.time / 60),
          warning: resp.warning,
        });
        if (coords.length > 0) {
          mapRef.current?.fitToCoordinates(coords, {
            edgePadding: { top: 120, right: 40, bottom: PANEL_HEIGHT + 40, left: 40 },
            animated: true,
          });
        }
      }

      if (resp.alternates) {
        const alts = (resp.alternates as any[])
          .filter((a) => a.trip?.legs?.[0]?.shape)
          .map((a) => decodePolyline(a.trip.legs[0].shape));
        setAltRoutes(alts);
      }
    } catch (e: any) {
      Alert.alert(
        'Route Unavailable',
        backendOnline
          ? `Could not calculate route.\n\n${e.message}`
          : 'Backend is offline.\n\nRun: docker-compose up\nin the navsys/ directory first.'
      );
    } finally {
      setLoading(false);
    }
  }, [origin, destination, avoidDanger, backendOnline]);

  // ── Clear all ───────────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    setOrigin(null);
    setDestination(null);
    setRouteCoords([]);
    setAltRoutes([]);
    setRouteInfo(null);
    setTapMode('origin');
  }, []);

  const formatDist = (km: number) =>
    km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(2)} km`;

  const panelTranslateY = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [PANEL_HEIGHT, 0],
  });

  return (
    <View style={styles.container}>
      {/* ── MAP ── */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={BHUBANESWAR_CENTER}
        onPress={handleMapPress}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
      >
        {/* Danger zones */}
        {dangerZones.map((zone, i) => (
          <Polygon
            key={`z${i}`}
            coordinates={zone}
            fillColor={COLORS.dangerFill}
            strokeColor={COLORS.dangerStroke}
            strokeWidth={1}
          />
        ))}

        {/* Alternate routes */}
        {altRoutes.map((alt, i) => (
          <Polyline
            key={`alt${i}`}
            coordinates={alt}
            strokeColor="rgba(130,130,130,0.45)"
            strokeWidth={4}
            lineDashPattern={[8, 5]}
          />
        ))}

        {/* Main route — glow + solid */}
        {routeCoords.length > 0 && (
          <>
            <Polyline
              coordinates={routeCoords}
              strokeColor="rgba(16,185,129,0.22)"
              strokeWidth={12}
            />
            <Polyline
              coordinates={routeCoords}
              strokeColor={COLORS.safe}
              strokeWidth={4}
              lineCap="round"
              lineJoin="round"
            />
          </>
        )}

        {origin && (
          <Marker coordinate={origin} title="Start" pinColor={COLORS.safe} />
        )}
        {destination && (
          <Marker coordinate={destination} title="Destination" pinColor={COLORS.secondary} />
        )}
      </MapView>

      {/* ── HEADER ── */}
      <SafeAreaView style={styles.headerWrap} pointerEvents="box-none">
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
          {backendOnline ? (
            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Live</Text>
            </View>
          ) : (
            <View style={styles.offlineBadge}>
              <Ionicons name="cloud-offline-outline" size={12} color={COLORS.danger} />
              <Text style={styles.offlineText}>Offline</Text>
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* ── TAP HINT ── */}
      <View style={styles.tapHint} pointerEvents="none">
        <Ionicons
          name={tapMode === 'origin' ? 'radio-button-on' : 'location'}
          size={13}
          color={tapMode === 'origin' ? COLORS.safe : COLORS.secondary}
        />
        <Text style={styles.tapHintText}>
          {tapMode === 'origin' ? 'Tap map to set start' : 'Tap map to set destination'}
        </Text>
        {(origin || destination) && (
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── FLOATING BUTTONS ── */}
      <View style={[styles.floatBtns, { bottom: panelOpen ? PANEL_HEIGHT + 12 : 24 }]}>
        <TouchableOpacity style={styles.fab} onPress={togglePanel}>
          <Ionicons
            name={panelOpen ? 'chevron-down' : 'chevron-up'}
            size={20}
            color={COLORS.subtext}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.fab} onPress={handleUseMyLocation}>
          {locationLoading ? (
            <ActivityIndicator size="small" color={COLORS.primaryLight} />
          ) : (
            <Ionicons name="locate" size={22} color={COLORS.primaryLight} />
          )}
        </TouchableOpacity>
      </View>

      {/* ── BOTTOM PANEL ── */}
      <Animated.View style={[styles.panel, { transform: [{ translateY: panelTranslateY }] }]}>
        <View style={styles.panelHandle} />

        {/* Route point pills */}
        <View style={styles.pointsRow}>
          <View style={styles.pointPill}>
            <View style={[styles.pointDot, { backgroundColor: COLORS.safe }]} />
            <Text style={styles.pointText} numberOfLines={1}>
              {origin
                ? `${origin.latitude.toFixed(5)}, ${origin.longitude.toFixed(5)}`
                : 'Tap map to set start'}
            </Text>
          </View>
          <View style={styles.pointConnector} />
          <View style={styles.pointPill}>
            <View style={[styles.pointDot, { backgroundColor: COLORS.secondary }]} />
            <Text style={styles.pointText} numberOfLines={1}>
              {destination
                ? `${destination.latitude.toFixed(5)}, ${destination.longitude.toFixed(5)}`
                : 'Tap map to set destination'}
            </Text>
          </View>
        </View>

        {/* Avoid danger toggle */}
        <View style={styles.toggleRow}>
          <Ionicons name="shield-checkmark" size={16} color={COLORS.safe} />
          <Text style={styles.toggleLabel}>Avoid danger zones</Text>
          <Switch
            value={avoidDanger}
            onValueChange={setAvoidDanger}
            trackColor={{ false: COLORS.muted, true: COLORS.safe }}
            thumbColor={COLORS.white}
          />
        </View>

        {/* Zone count */}
        {backendOnline && dangerZones.length > 0 && (
          <View style={styles.zoneBanner}>
            <Ionicons name="warning-outline" size={12} color={COLORS.danger} />
            <Text style={styles.zoneBannerText}>
              {dangerZones.length} high-risk zones identified in Bhubaneswar
            </Text>
          </View>
        )}

        {/* Route stats */}
        {routeInfo && (
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="walk-outline" size={16} color={COLORS.safe} />
              <Text style={styles.statVal}>{formatDist(routeInfo.distance)}</Text>
              <Text style={styles.statLbl}>distance</Text>
            </View>
            <View style={styles.statDiv} />
            <View style={styles.stat}>
              <Ionicons name="time-outline" size={16} color={COLORS.accent} />
              <Text style={styles.statVal}>{routeInfo.time} min</Text>
              <Text style={styles.statLbl}>walking</Text>
            </View>
            <View style={styles.statDiv} />
            <View style={styles.stat}>
              <Ionicons
                name="shield-outline"
                size={16}
                color={routeInfo.warning ? COLORS.warning : COLORS.safe}
              />
              <Text
                style={[
                  styles.statVal,
                  { color: routeInfo.warning ? COLORS.warning : COLORS.safe },
                ]}
              >
                {routeInfo.warning ? 'Limited' : 'Safe'}
              </Text>
              <Text style={styles.statLbl}>route</Text>
            </View>
          </View>
        )}

        {routeInfo?.warning && (
          <View style={styles.warnBanner}>
            <Ionicons name="warning" size={13} color={COLORS.warning} />
            <Text style={styles.warnText} numberOfLines={2}>
              {routeInfo.warning}
            </Text>
          </View>
        )}

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
            <>
              <Ionicons name="navigate" size={18} color={COLORS.white} />
              <Text style={styles.routeBtnText}>Find Safe Route</Text>
            </>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Loading overlay while zones fetch */}
      {loadingZones && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={COLORS.primaryLight} size="large" />
          <Text style={styles.loadingText}>Loading safety data…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  map: { flex: 1 },

  // Header
  headerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 14,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(13,5,33,0.90)',
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
  headerTitle: { color: COLORS.text, fontWeight: '700', fontSize: 15, letterSpacing: 0.5 },
  headerSub: { color: COLORS.subtext, fontSize: 11 },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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
    gap: 5,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
  },
  offlineText: { color: COLORS.danger, fontSize: 11, fontWeight: '600' },

  // Tap hint
  tapHint: {
    position: 'absolute',
    top: 96,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(13,5,33,0.82)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    zIndex: 5,
  },
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

  // Floating action buttons
  floatBtns: {
    position: 'absolute',
    right: 14,
    flexDirection: 'column',
    gap: 10,
    zIndex: 5,
  },
  fab: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(13,5,33,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },

  // Bottom panel
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 18,
    paddingBottom: 34,
    paddingTop: 10,
    zIndex: 10,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    minHeight: PANEL_HEIGHT,
  },
  panelHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.muted,
    alignSelf: 'center',
    marginBottom: 14,
  },

  // Point pills
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
  pointText: {
    color: COLORS.text,
    fontSize: 12,
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  pointConnector: {
    width: 2,
    height: 8,
    backgroundColor: COLORS.muted,
    marginLeft: 15,
    marginVertical: 2,
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    paddingVertical: 2,
  },
  toggleLabel: { color: COLORS.text, fontSize: 14, flex: 1, fontWeight: '500' },

  // Zone banner
  zoneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  zoneBannerText: { color: 'rgba(239,68,68,0.85)', fontSize: 11 },

  // Stats
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
  statLbl: {
    color: COLORS.muted,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statDiv: { width: 1, height: 34, backgroundColor: COLORS.cardBorder },

  // Warning
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
    marginBottom: 8,
  },
  warnText: { color: COLORS.warning, fontSize: 11, flex: 1 },

  // Route button
  routeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    borderWidth: 1.5,
    borderColor: COLORS.secondary,
    marginTop: 6,
    elevation: 6,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  routeBtnOff: {
    backgroundColor: COLORS.muted,
    borderColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
  },
  routeBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.4 },

  // Loading overlay
  loadingOverlay: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13,5,33,0.55)',
    gap: 12,
    zIndex: 20,
  },
  loadingText: { color: COLORS.subtext, fontSize: 14 },
});
