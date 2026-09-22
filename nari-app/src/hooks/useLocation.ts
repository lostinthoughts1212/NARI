import { useState, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import type { LatLng, LiveLocationData } from '../types';

let ExpoLocation: typeof import('expo-location') | null = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ExpoLocation = require('expo-location');
  } catch {
    ExpoLocation = null;
  }
}

export function useLocation() {
  const [location, setLocation] = useState<LatLng | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWatching, setIsWatching] = useState(false);

  // Store watcher subscription or watchId
  const nativeSubRef = useRef<{ remove: () => void } | null>(null);
  const webWatchIdRef = useRef<number | null>(null);

  /**
   * Requests permission and returns the current single position snapshot.
   */
  const requestLocation = async (): Promise<LatLng | null> => {
    setLoading(true);
    setError(null);

    // ── Web path ────────────────────────────────────────────────────────────
    if (Platform.OS === 'web') {
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          setError('Geolocation is not supported by this browser.');
          setLoading(false);
          resolve(null);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords: LatLng = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            };
            setLocation(coords);
            setLoading(false);
            resolve(coords);
          },
          () => {
            setError('Could not get device location.');
            setLoading(false);
            resolve(null);
          },
          { enableHighAccuracy: true }
        );
      });
    }

    // ── Native path ─────────────────────────────────────────────────────────
    try {
      if (!ExpoLocation) {
        setError('Location module unavailable.');
        return null;
      }
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        return null;
      }
      const pos = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.High,
      });
      const coords: LatLng = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      setLocation(coords);
      return coords;
    } catch {
      setError('Could not get device location');
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Starts continuous GPS tracking.
   * Updates state and invokes callback on each fix.
   */
  const startWatchingLocation = useCallback(
    async (
      onUpdate: (data: LiveLocationData) => void,
      onError?: (err: string) => void
    ): Promise<(() => void) | null> => {
      setError(null);

      // Stop previous watcher if active
      if (nativeSubRef.current) {
        nativeSubRef.current.remove();
        nativeSubRef.current = null;
      }
      if (webWatchIdRef.current !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(webWatchIdRef.current);
        webWatchIdRef.current = null;
      }

      // ── Web path ────────────────────────────────────────────────────────────
      if (Platform.OS === 'web') {
        if (!navigator.geolocation) {
          const msg = 'Geolocation not supported';
          setError(msg);
          onError?.(msg);
          return null;
        }

        setIsWatching(true);
        const id = navigator.geolocation.watchPosition(
          (pos) => {
            const data: LiveLocationData = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              heading: pos.coords.heading ?? null,
              speed: pos.coords.speed ? Math.max(0, pos.coords.speed * 3.6) : 0, // Convert m/s to km/h
              accuracy: pos.coords.accuracy ?? null,
              timestamp: pos.timestamp || Date.now(),
            };
            setLocation({ latitude: data.latitude, longitude: data.longitude });
            onUpdate(data);
          },
          (err) => {
            setError(err.message);
            onError?.(err.message);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 1000,
            timeout: 10000,
          }
        );
        webWatchIdRef.current = id;

        return () => {
          if (webWatchIdRef.current !== null) {
            navigator.geolocation.clearWatch(webWatchIdRef.current);
            webWatchIdRef.current = null;
          }
          setIsWatching(false);
        };
      }

      // ── Native path ─────────────────────────────────────────────────────────
      try {
        if (!ExpoLocation) {
          const msg = 'Location module unavailable.';
          setError(msg);
          onError?.(msg);
          return null;
        }

        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          const msg = 'Foreground location permission denied';
          setError(msg);
          onError?.(msg);
          return null;
        }

        setIsWatching(true);
        const sub = await ExpoLocation.watchPositionAsync(
          {
            accuracy: ExpoLocation.Accuracy.High,
            timeInterval: 2500, // Every 2.5 seconds
            distanceInterval: 3, // Or every 3 meters
          },
          (pos) => {
            const data: LiveLocationData = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              heading: pos.coords.heading ?? null,
              speed: pos.coords.speed ? Math.max(0, pos.coords.speed * 3.6) : 0, // km/h
              accuracy: pos.coords.accuracy ?? null,
              timestamp: pos.timestamp || Date.now(),
            };
            setLocation({ latitude: data.latitude, longitude: data.longitude });
            onUpdate(data);
          }
        );

        nativeSubRef.current = sub;

        return () => {
          if (nativeSubRef.current) {
            nativeSubRef.current.remove();
            nativeSubRef.current = null;
          }
          setIsWatching(false);
        };
      } catch (e: any) {
        const msg = e?.message || 'Error watching position';
        setError(msg);
        onError?.(msg);
        setIsWatching(false);
        return null;
      }
    },
    []
  );

  const stopWatchingLocation = useCallback(() => {
    if (nativeSubRef.current) {
      nativeSubRef.current.remove();
      nativeSubRef.current = null;
    }
    if (webWatchIdRef.current !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(webWatchIdRef.current);
      webWatchIdRef.current = null;
    }
    setIsWatching(false);
  }, []);

  return {
    location,
    loading,
    error,
    isWatching,
    requestLocation,
    startWatchingLocation,
    stopWatchingLocation,
  };
}
