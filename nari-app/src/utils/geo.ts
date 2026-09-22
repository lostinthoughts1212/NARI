import type { LatLng, ValhallaManeuver } from '../types';

/**
 * Calculates distance between two points in meters using the Haversine formula
 */
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates perpendicular distance in meters from a point (px, py)
 * to a line segment between (x1, y1) and (x2, y2).
 */
export function pointToSegmentDistanceMeters(
  p: LatLng,
  a: LatLng,
  b: LatLng
): number {
  const R = 6371e3;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  // Convert to flat approximation around the segment in meters
  const midLat = toRad((a.latitude + b.latitude) / 2);
  const kx = Math.cos(midLat) * ((Math.PI * R) / 180);
  const ky = (Math.PI * R) / 180;

  const px = p.longitude * kx;
  const py = p.latitude * ky;
  const ax = a.longitude * kx;
  const ay = a.latitude * ky;
  const bx = b.longitude * kx;
  const by = b.latitude * ky;

  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;

  if (l2 === 0) {
    return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
  }

  let t = ((px - ax) * dx + (py - ay) * dy) / l2;
  t = Math.max(0, Math.min(1, t));

  const projX = ax + t * dx;
  const projY = ay + t * dy;

  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

/**
 * Calculates the shortest distance in meters from the user's location
 * to any segment of the route polyline.
 */
export function distanceToPolylineMeters(
  userPos: LatLng,
  routeCoords: LatLng[]
): number {
  if (routeCoords.length === 0) return 0;
  if (routeCoords.length === 1) {
    return haversineDistanceMeters(
      userPos.latitude,
      userPos.longitude,
      routeCoords[0].latitude,
      routeCoords[0].longitude
    );
  }

  let minDistance = Infinity;
  for (let i = 0; i < routeCoords.length - 1; i++) {
    const d = pointToSegmentDistanceMeters(
      userPos,
      routeCoords[i],
      routeCoords[i + 1]
    );
    if (d < minDistance) {
      minDistance = d;
    }
  }

  return minDistance;
}

/**
 * Finds the current active maneuver from Valhalla maneuvers list
 * based on user's current coordinate and route coordinates.
 */
export function getActiveManeuver(
  userPos: LatLng,
  maneuvers: ValhallaManeuver[] | undefined,
  routeCoords: LatLng[]
): {
  activeManeuver: ValhallaManeuver | null;
  maneuverIndex: number;
  distanceToTurnMeters: number;
} {
  if (!maneuvers || maneuvers.length === 0) {
    return { activeManeuver: null, maneuverIndex: -1, distanceToTurnMeters: 0 };
  }

  // Find the closest point along the route
  let closestIndex = 0;
  let minDistance = Infinity;
  for (let i = 0; i < routeCoords.length; i++) {
    const dist = haversineDistanceMeters(
      userPos.latitude,
      userPos.longitude,
      routeCoords[i].latitude,
      routeCoords[i].longitude
    );
    if (dist < minDistance) {
      minDistance = dist;
      closestIndex = i;
    }
  }

  // Find the next maneuver whose begin_shape_index is >= or near closestIndex
  let currentManeuverIdx = 0;
  for (let m = 0; m < maneuvers.length; m++) {
    if (closestIndex <= maneuvers[m].end_shape_index) {
      currentManeuverIdx = m;
      break;
    }
  }

  const maneuver = maneuvers[currentManeuverIdx];
  const turnPoint = routeCoords[maneuver.begin_shape_index] || routeCoords[closestIndex];
  const distanceToTurn = turnPoint
    ? haversineDistanceMeters(
        userPos.latitude,
        userPos.longitude,
        turnPoint.latitude,
        turnPoint.longitude
      )
    : 0;

  return {
    activeManeuver: maneuver,
    maneuverIndex: currentManeuverIdx,
    distanceToTurnMeters: Math.round(distanceToTurn),
  };
}
