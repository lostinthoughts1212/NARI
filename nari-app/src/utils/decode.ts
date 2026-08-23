import Polyline from '@mapbox/polyline';
import type { LatLng } from '../types';

/**
 * Decodes a Valhalla-encoded polyline (precision 6) into an array of LatLng objects.
 */
export function decodePolyline(encoded: string, precision = 6): LatLng[] {
  try {
    const pairs = Polyline.decode(encoded, precision);
    return pairs.map(([lat, lng]: [number, number]) => ({
      latitude: lat,
      longitude: lng,
    }));
  } catch {
    return [];
  }
}
