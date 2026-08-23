import { useState } from 'react';
import { Platform } from 'react-native';
import type { LatLng } from '../types';

// Conditionally import expo-location only on native platforms.
// On web, expo-location may throw or not work, so we use browser geolocation.
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

  /**
   * Requests permission and returns the current position.
   * Uses expo-location on native, browser Geolocation API on web.
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

  return { location, loading, error, requestLocation };
}
