/**
 * decode.ts
 * Utility to decode Valhalla-encoded polylines (precision 6).
 * Adapted from navsys/nari-app/src/utils/decode.ts.
 */

import Polyline from '@mapbox/polyline';

export interface LatLng {
  latitude: number;
  longitude: number;
}

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
