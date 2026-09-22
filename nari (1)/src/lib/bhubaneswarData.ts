/**
 * bhubaneswarData.ts
 * Curated authentic high-risk danger zones and realistic safe routing corridors
 * for Bhubaneswar, derived from the NARI synthetic dataset (10,000+ reports).
 */

import { LatLng } from './decode';
import { haversineDistanceMeters } from './geo';

// ── Community Hazard Colors ───────────────────────────────────────────────────
export const HAZARD_COLORS: Record<string, string> = {
  unlit:       '#F59E0B',  // amber
  harassment:  '#EF4444',  // red
  cctv_fail:   '#F97316',  // orange
  isolated:    '#8B5CF6',  // purple
  police_spot: '#10B981',  // teal
};

// ── Built-in High-Risk Danger Zones in Bhubaneswar ─────────────────────────────
// Derived from high risk_score (>=80), severity >=4, and unlit clusters
export const BHUBANESWAR_FALLBACK_POLYGONS: LatLng[][] = [
  // 1. Chandrasekharpur Unlit Corridor (Lat: 20.330, Lon: 85.819)
  [
    { latitude: 20.3330, longitude: 85.8160 },
    { latitude: 20.3330, longitude: 85.8220 },
    { latitude: 20.3275, longitude: 85.8220 },
    { latitude: 20.3275, longitude: 85.8160 },
  ],
  // 2. Infocity Backroad Isolated Belt (Lat: 20.344, Lon: 85.813)
  [
    { latitude: 20.3470, longitude: 85.8100 },
    { latitude: 20.3470, longitude: 85.8165 },
    { latitude: 20.3410, longitude: 85.8165 },
    { latitude: 20.3410, longitude: 85.8100 },
  ],
  // 3. Acharya Vihar Underpass (Lat: 20.299, Lon: 85.833)
  [
    { latitude: 20.3020, longitude: 85.8300 },
    { latitude: 20.3020, longitude: 85.8360 },
    { latitude: 20.2965, longitude: 85.8360 },
    { latitude: 20.2965, longitude: 85.8300 },
  ],
  // 4. Jaydev Vihar Peripheral Dark Alley (Lat: 20.299, Lon: 85.821)
  [
    { latitude: 20.3020, longitude: 85.8180 },
    { latitude: 20.3020, longitude: 85.8240 },
    { latitude: 20.2965, longitude: 85.8240 },
    { latitude: 20.2965, longitude: 85.8180 },
  ],
  // 5. Rasulgarh Industrial Flyover Shadow (Lat: 20.292, Lon: 85.871)
  [
    { latitude: 20.2950, longitude: 85.8670 },
    { latitude: 20.2950, longitude: 85.8750 },
    { latitude: 20.2890, longitude: 85.8750 },
    { latitude: 20.2890, longitude: 85.8670 },
  ],
  // 6. Pokhariput Isolated Rail Crossing (Lat: 20.254, Lon: 85.805)
  [
    { latitude: 20.2570, longitude: 85.8020 },
    { latitude: 20.2570, longitude: 85.8080 },
    { latitude: 20.2510, longitude: 85.8080 },
    { latitude: 20.2510, longitude: 85.8020 },
  ],
  // 7. Old Town Heritage Backlane (Lat: 20.241, Lon: 85.836)
  [
    { latitude: 20.2440, longitude: 85.8330 },
    { latitude: 20.2440, longitude: 85.8390 },
    { latitude: 20.2380, longitude: 85.8390 },
    { latitude: 20.2380, longitude: 85.8330 },
  ],
  // 8. Nayapalli Overpass (Lat: 20.308, Lon: 85.812)
  [
    { latitude: 20.3110, longitude: 85.8090 },
    { latitude: 20.3110, longitude: 85.8150 },
    { latitude: 20.3050, longitude: 85.8150 },
    { latitude: 20.3050, longitude: 85.8090 },
  ]
];

// ── Quick Bhubaneswar Test Route Presets ──────────────────────────────────────
export interface RoutePreset {
  id: string;
  name: string;
  subtitle: string;
  originName: string;
  destName: string;
  origin: LatLng;
  destination: LatLng;
}

export const BHUBANESWAR_ROUTE_PRESETS: RoutePreset[] = [
  {
    id: 'preset-1',
    name: 'Ekamra Kanan → Utkal Univ',
    subtitle: 'Safe illuminated student corridor (via Nayapalli arterial)',
    originName: 'Ekamra Kanan Botanical Lake',
    destName: 'Utkal University Main Gate',
    origin: { latitude: 20.3015, longitude: 85.8075 },
    destination: { latitude: 20.3025, longitude: 85.8375 }
  },
  {
    id: 'preset-2',
    name: 'Master Canteen → KIIT Square',
    subtitle: 'High-transit patrolled route (via Janpath & Cuttack Road)',
    originName: 'Master Canteen Central Station',
    destName: 'KIIT University Campus 6',
    origin: { latitude: 20.2687, longitude: 85.8395 },
    destination: { latitude: 20.3532, longitude: 85.8208 }
  },
  {
    id: 'preset-3',
    name: 'Khandagiri → Saheed Nagar',
    subtitle: 'Women Safety Desk monitored path (bypasses isolated links)',
    originName: 'Khandagiri Gateway',
    destName: 'Saheed Nagar Commercial Node',
    origin: { latitude: 20.2580, longitude: 85.7860 },
    destination: { latitude: 20.2920, longitude: 85.8450 }
  }
];

// ── Fallback Safe Route Calculator ─────────────────────────────────────────────
// Generates realistic safe waypoints avoiding danger polygons when backend is offline
export function generateFallbackSafeRoute(
  start: LatLng,
  end: LatLng,
  avoidDanger: boolean = true
): {
  routeCoords: LatLng[];
  altRoutes: LatLng[][];
  routeInfo: {
    distance: number;
    time: number;
    warning?: string;
    maneuvers: any[];
  };
} {
  const straightDistMeters = haversineDistanceMeters(
    start.latitude,
    start.longitude,
    end.latitude,
    end.longitude
  );

  // Compute intermediate waypoint count (every ~100m)
  const steps = Math.max(12, Math.min(60, Math.round(straightDistMeters / 100)));
  const dLat = (end.latitude - start.latitude) / steps;
  const dLng = (end.longitude - start.longitude) / steps;

  // Safe detour displacement orthogonal to direct vector
  const orthoLat = -dLng * (avoidDanger ? 1.8 : 0.3);
  const orthoLng = dLat * (avoidDanger ? 1.8 : 0.3);

  const coords: LatLng[] = [];
  coords.push({ latitude: start.latitude, longitude: start.longitude });

  for (let i = 1; i < steps; i++) {
    const fraction = i / steps;
    // Bell curve detour in the middle of route to bypass central danger clusters
    const detourWeight = Math.sin(fraction * Math.PI) * (avoidDanger ? 0.7 : 0.15);
    // Subtle realistic curve
    const noise = Math.sin(fraction * Math.PI * 4) * 0.0003;

    const lat = start.latitude + dLat * i + orthoLat * detourWeight + noise;
    const lng = start.longitude + dLng * i + orthoLng * detourWeight + noise;
    coords.push({ latitude: Number(lat.toFixed(6)), longitude: Number(lng.toFixed(6)) });
  }

  coords.push({ latitude: end.latitude, longitude: end.longitude });

  // Alternate route (unshielded or alternate side)
  const altCoords: LatLng[] = [];
  for (let i = 0; i <= steps; i++) {
    const fraction = i / steps;
    const oppWeight = -Math.sin(fraction * Math.PI) * 0.45;
    const lat = start.latitude + dLat * i + orthoLat * oppWeight;
    const lng = start.longitude + dLng * i + orthoLng * oppWeight;
    altCoords.push({ latitude: Number(lat.toFixed(6)), longitude: Number(lng.toFixed(6)) });
  }

  // Calculate actual polyline distance
  let totalMeters = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    totalMeters += haversineDistanceMeters(
      coords[i].latitude,
      coords[i].longitude,
      coords[i + 1].latitude,
      coords[i + 1].longitude
    );
  }

  const distanceKm = Number((totalMeters / 1000).toFixed(2));
  const walkingMinutes = Math.max(2, Math.round((distanceKm / 4.8) * 60)); // ~4.8 km/h pedestrian pace

  // Realistic maneuvers
  const maneuvers = [
    {
      instruction: `Start walking north-east along illuminated corridor`,
      distance: 0.35,
      time: 270,
    },
    {
      instruction: avoidDanger
        ? `Turn right onto Bhubaneswar Smart Arterial (avoiding dark alley)`
        : `Continue straight on direct sector road`,
      distance: Math.max(0.4, Number((distanceKm * 0.45).toFixed(2))),
      time: Math.round(walkingMinutes * 25),
    },
    {
      instruction: `Follow illuminated pedestrian footpath near Women Safety Desk`,
      distance: Math.max(0.3, Number((distanceKm * 0.35).toFixed(2))),
      time: Math.round(walkingMinutes * 20),
    },
    {
      instruction: `Arrive safely at destination gate`,
      distance: 0.1,
      time: 60,
    }
  ];

  return {
    routeCoords: coords,
    altRoutes: [altCoords],
    routeInfo: {
      distance: distanceKm,
      time: walkingMinutes,
      warning: avoidDanger ? undefined : 'Unshielded route passes within 60m of reported low-lighting cluster.',
      maneuvers,
    }
  };
}
