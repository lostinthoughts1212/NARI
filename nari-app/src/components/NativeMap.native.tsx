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
  Share,
} from 'react-native';
import MapView, {
  Marker,
  Polyline,
  Polygon,
  type MapPressEvent,
} from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
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

const { height } = Dimensions.get('window');
const PANEL_HEIGHT = 360;

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

  // ── Live Navigation & Firebase State ─────────────────────────────────────
  const [isNavigating, setIsNavigating] = useState(false);
  const [journeyId, setJourneyId] = useState<string | null>(null);
  const [liveLocation, setLiveLocation] = useState<LiveLocationData | null>(null);
  const [activeManeuver, setActiveManeuver] = useState<ValhallaManeuver | null>(null);
  const [distToManeuver, setDistToManeuver] = useState<number>(0);
  const [offRouteDistance, setOffRouteDistance] = useState<number>(0);
  const [isSosActive, setIsSosActive] = useState(false);

  const stopWatchRef = useRef<(() => void) | null>(null);
  const { loading: locationLoading, requestLocation, startWatchingLocation, stopWatchingLocation } =
    useLocation();

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

  // ── Cleanup location watch on unmount ───────────────────────────────────
  useEffect(() => {
    return () => {
      if (stopWatchRef.current) stopWatchRef.current();
      stopWatchingLocation();
    };
  }, [stopWatchingLocation]);

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
      if (isNavigating) return; // Ignore accidental taps while navigating
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
    [tapMode, isNavigating]
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
          maneuvers: resp.trip.legs[0].maneuvers,
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

  // ── Share Journey Link with Emergency Contacts ───────────────────────────
  const handleShareJourney = useCallback(
    async (targetJourneyId?: string) => {
      const jId = targetJourneyId || journeyId;
      if (!jId) return;
      const trackingUrl = `${WEB_TRACKER_BASE_URL}/?track=${jId}`;
      try {
        await Share.share({
          title: 'NARI Safe Journey Live Link',
          message: `🛡️ I have started my safe route on NARI. Track my live location & route here in real time: ${trackingUrl}`,
        });
      } catch (err) {
        console.warn('Share error:', err);
      }
    },
    [journeyId]
  );

  // ── Start Active Navigation & Firebase Live Stream ────────────────────────
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
      userName: 'NARI User',
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

      // Google Maps style close street-level zoom-in with 3D tilt
      mapRef.current?.animateCamera(
        {
          center: { latitude: origin.latitude, longitude: origin.longitude },
          pitch: 45,
          heading: 0,
          zoom: 18,
          altitude: 140,
        },
        { duration: 1000 }
      );

      // Start continuous GPS tracking
      const cleanup = await startWatchingLocation(async (locData) => {
        setLiveLocation(locData);

        // 1. Off-route deviation check
        const offDist = distanceToPolylineMeters(
          { latitude: locData.latitude, longitude: locData.longitude },
          routeCoords
        );
        setOffRouteDistance(offDist);

        // 2. Active turn maneuver calculation
        const { activeManeuver: nextMan, distanceToTurnMeters, maneuverIndex } =
          getActiveManeuver(
            { latitude: locData.latitude, longitude: locData.longitude },
            routeInfo?.maneuvers,
            routeCoords
          );
        setActiveManeuver(nextMan);
        setDistToManeuver(distanceToTurnMeters);

        // 3. Status determination
        const currentStatus = isSosActive ? 'sos' : offDist > 65 ? 'off_route' : 'active';

        // 4. Stream to Firebase
        await updateLiveLocation(newJourneyId, locData, {
          offRouteDistance: Math.round(offDist),
          currentManeuverIndex: maneuverIndex,
          status: currentStatus,
        });

        // 5. Follow camera with Google Maps 3D tilt & rotation
        mapRef.current?.animateCamera(
          {
            center: { latitude: locData.latitude, longitude: locData.longitude },
            pitch: 45,
            heading: locData.heading || 0,
            zoom: 18,
            altitude: 140,
          },
          { duration: 500 }
        );
      });

      stopWatchRef.current = cleanup;

      // Prompt to share tracking link immediately
      Alert.alert(
        'Safe Journey Active 🛡️',
        'Live location streaming is now active. Share your live tracking link with emergency contacts so they can watch your progress.',
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Share Link',
            onPress: () => handleShareJourney(newJourneyId),
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', `Could not initiate live journey: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [
    origin,
    destination,
    routeCoords,
    routeInfo,
    isSosActive,
    startWatchingLocation,
    handleShareJourney,
  ]);

  // ── End Safe Journey ──────────────────────────────────────────────────────
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
    Alert.alert('Journey Ended', 'You have arrived safely. Live sharing concluded.');
  }, [journeyId, stopWatchingLocation]);

  // ── Emergency SOS Panic Trigger ──────────────────────────────────────────
  const handleTriggerSos = useCallback(async () => {
    setIsSosActive(true);
    if (journeyId) {
      await updateJourneyStatus(journeyId, 'sos').catch(() => {});
    }
    Alert.alert(
      '🚨 EMERGENCY SOS ACTIVE',
      'Distress signal transmitted to emergency contacts and cloud safety monitor! Stay calm.',
      [
        {
          text: 'Cancel SOS',
          onPress: async () => {
            setIsSosActive(false);
            if (journeyId) {
              await updateJourneyStatus(journeyId, 'active').catch(() => {});
            }
          },
          style: 'destructive',
        },
        { text: 'OK' },
      ]
    );
  }, [journeyId]);

  // ── Clear all ────────────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    if (isNavigating) return;
    setOrigin(null);
    setDestination(null);
    setRouteCoords([]);
    setAltRoutes([]);
    setRouteInfo(null);
    setTapMode('origin');
  }, [isNavigating]);

  const formatDist = (km: number) =>
    km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(2)} km`;

  const panelTranslateY = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [PANEL_HEIGHT, 0],
  });

  return (
    <View style={[styles.container, isSosActive && styles.containerSos]}>
      {/* ── MAP ── */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={BHUBANESWAR_CENTER}
        onPress={handleMapPress}
        showsUserLocation={!isNavigating}
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
        {!isNavigating &&
          altRoutes.map((alt, i) => (
            <Polyline
              key={`alt${i}`}
              coordinates={alt}
              strokeColor="rgba(130,130,130,0.45)"
              strokeWidth={4}
              lineDashPattern={[8, 5]}
            />
          ))}

        {/* Main safe route — glow + solid */}
        {routeCoords.length > 0 && (
          <>
            <Polyline
              coordinates={routeCoords}
              strokeColor={
                isSosActive
                  ? 'rgba(239,68,68,0.3)'
                  : offRouteDistance > 65
                  ? 'rgba(245,158,11,0.3)'
                  : 'rgba(16,185,129,0.25)'
              }
              strokeWidth={14}
            />
            <Polyline
              coordinates={routeCoords}
              strokeColor={
                isSosActive
                  ? COLORS.danger
                  : offRouteDistance > 65
                  ? COLORS.warning
                  : COLORS.safe
              }
              strokeWidth={4}
              lineCap="round"
              lineJoin="round"
            />
          </>
        )}

        {origin && <Marker coordinate={origin} title="Start" pinColor={COLORS.safe} />}
        {destination && (
          <Marker coordinate={destination} title="Destination" pinColor={COLORS.secondary} />
        )}

        {/* Active Moving GPS User Marker */}
        {isNavigating && liveLocation && (
          <Marker
            coordinate={{
              latitude: liveLocation.latitude,
              longitude: liveLocation.longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            rotation={liveLocation.heading || 0}
            flat
          >
            <View style={styles.liveUserMarker}>
              <View
                style={[
                  styles.liveUserInner,
                  isSosActive && { backgroundColor: COLORS.danger },
                  offRouteDistance > 65 && !isSosActive && { backgroundColor: COLORS.warning },
                ]}
              >
                <Ionicons name="navigate" size={14} color={COLORS.white} />
              </View>
            </View>
          </Marker>
        )}
      </MapView>

      {/* ── ACTIVE TURN-BY-TURN HUD (When Navigating) ── */}
      {isNavigating ? (
        <SafeAreaView style={styles.navHudWrap} pointerEvents="box-none">
          <View
            style={[
              styles.navHud,
              isSosActive && styles.navHudSos,
              offRouteDistance > 65 && !isSosActive && styles.navHudWarn,
            ]}
          >
            <View style={styles.navHudIconCircle}>
              <Ionicons
                name={
                  isSosActive
                    ? 'alert-circle'
                    : offRouteDistance > 65
                    ? 'warning'
                    : 'arrow-forward'
                }
                size={24}
                color={COLORS.white}
              />
            </View>
            <View style={{ flex: 1 }}>
              {isSosActive ? (
                <>
                  <Text style={styles.navHudDist}>SOS ACTIVE</Text>
                  <Text style={styles.navHudText}>Live distress signal transmitting to cloud</Text>
                </>
              ) : offRouteDistance > 65 ? (
                <>
                  <Text style={[styles.navHudDist, { color: COLORS.warning }]}>
                    OFF ROUTE ({Math.round(offRouteDistance)} m)
                  </Text>
                  <Text style={styles.navHudText}>
                    You strayed from the safe corridor. Return to illuminated path.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.navHudDist}>
                    {distToManeuver > 0 ? `In ${distToManeuver} m` : 'Follow safe route'}
                  </Text>
                  <Text style={styles.navHudText} numberOfLines={2}>
                    {activeManeuver?.instruction || 'Proceed along the designated safe corridor'}
                  </Text>
                </>
              )}
            </View>
          </View>
        </SafeAreaView>
      ) : (
        /* ── NORMAL HEADER ── */
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
      )}

      {/* ── TAP HINT (Only when not navigating) ── */}
      {!isNavigating && (
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
      )}

      {/* ── FLOATING ACTION BUTTONS ── */}
      <View
        style={[
          styles.floatBtns,
          { bottom: isNavigating ? 180 : panelOpen ? PANEL_HEIGHT + 12 : 24 },
        ]}
      >
        {isNavigating && (
          <>
            {/* SOS Panic Button */}
            <TouchableOpacity
              style={[styles.fab, styles.fabSos]}
              onPress={handleTriggerSos}
              activeOpacity={0.8}
            >
              <Ionicons name="alert" size={24} color={COLORS.white} />
            </TouchableOpacity>

            {/* Share Live Link */}
            <TouchableOpacity
              style={[styles.fab, styles.fabShare]}
              onPress={() => handleShareJourney()}
              activeOpacity={0.8}
            >
              <Ionicons name="share-social" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </>
        )}

        {!isNavigating && (
          <TouchableOpacity style={styles.fab} onPress={togglePanel}>
            <Ionicons
              name={panelOpen ? 'chevron-down' : 'chevron-up'}
              size={20}
              color={COLORS.subtext}
            />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.fab} onPress={handleUseMyLocation}>
          {locationLoading ? (
            <ActivityIndicator size="small" color={COLORS.primaryLight} />
          ) : (
            <Ionicons name="locate" size={22} color={COLORS.primaryLight} />
          )}
        </TouchableOpacity>
      </View>

      {/* ── BOTTOM PANEL / DRAWER ── */}
      {isNavigating ? (
        /* Active Navigation Live Drawer */
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
              <Text style={styles.metricLbl}>remaining</Text>
            </View>
          </View>

          <View style={styles.navActionsRow}>
            <TouchableOpacity
              style={styles.shareLiveBtn}
              onPress={() => handleShareJourney()}
            >
              <Ionicons name="share-outline" size={16} color={COLORS.text} />
              <Text style={styles.shareLiveBtnText}>Share Route</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.endBtn} onPress={handleEndJourney}>
              <Ionicons name="stop-circle" size={18} color={COLORS.white} />
              <Text style={styles.endBtnText}>End Journey</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Normal Route Planning Panel */
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

          {/* Buttons: Find Safe Route vs Start Live Journey */}
          {routeCoords.length > 0 ? (
            <View style={styles.actionBtnRow}>
              <TouchableOpacity
                style={styles.recalcBtn}
                onPress={handleGetRoute}
                disabled={loading}
              >
                <Ionicons name="refresh" size={16} color={COLORS.subtext} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.startNavBtn}
                onPress={handleStartJourney}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="navigate-circle" size={22} color={COLORS.white} />
                    <Text style={styles.startNavBtnText}>Start Safe Journey</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
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
          )}
        </Animated.View>
      )}

      {/* Loading overlay */}
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
  containerSos: { borderWidth: 4, borderColor: COLORS.danger },
  map: { flex: 1 },

  // Live user pin
  liveUserMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16,185,129,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveUserInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.safe,
    borderWidth: 2.5,
    borderColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Turn-by-Turn HUD
  navHudWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 15,
  },
  navHud: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 14,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(20,8,39,0.95)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.safe,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  navHudWarn: {
    borderColor: COLORS.warning,
    backgroundColor: 'rgba(35,20,5,0.96)',
  },
  navHudSos: {
    borderColor: COLORS.danger,
    backgroundColor: 'rgba(45,5,15,0.96)',
  },
  navHudIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navHudDist: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  navHudText: {
    color: COLORS.subtext,
    fontSize: 12,
    marginTop: 2,
  },

  // Normal Header
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

  // Floating buttons
  floatBtns: {
    position: 'absolute',
    right: 14,
    flexDirection: 'column',
    gap: 10,
    zIndex: 10,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(13,5,33,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  fabSos: {
    backgroundColor: COLORS.danger,
    borderColor: '#FFF',
    transform: [{ scale: 1.05 }],
  },
  fabShare: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.secondary,
  },

  // Bottom drawer while navigating
  navBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(20,8,39,0.96)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
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
  navActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  shareLiveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    backgroundColor: COLORS.inputBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  shareLiveBtnText: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
  endBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    backgroundColor: COLORS.danger,
    borderRadius: 14,
    elevation: 4,
  },
  endBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 14 },

  // Normal bottom panel
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    paddingVertical: 2,
  },
  toggleLabel: { color: COLORS.text, fontSize: 14, flex: 1, fontWeight: '500' },
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

  actionBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  recalcBtn: {
    width: 48,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#059669',
    borderWidth: 1.5,
    borderColor: '#34D399',
    elevation: 6,
  },
  startNavBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '800', letterSpacing: 0.4 },

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
  },
  routeBtnOff: {
    backgroundColor: COLORS.muted,
    borderColor: 'transparent',
    elevation: 0,
  },
  routeBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.4 },

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
