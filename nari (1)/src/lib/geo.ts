export interface LatLng {
  latitude: number;
  longitude: number;
}

export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
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

export function pointToSegmentDistanceMeters(
  p: LatLng,
  a: LatLng,
  b: LatLng
): number {
  const R = 6371e3;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

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

export function getActiveManeuver(
  userPos: LatLng,
  maneuvers: any[] | undefined,
  routeCoords: LatLng[]
): {
  activeManeuver: any | null;
  maneuverIndex: number;
  distanceToTurnMeters: number;
} {
  if (!maneuvers || maneuvers.length === 0) {
    return { activeManeuver: null, maneuverIndex: -1, distanceToTurnMeters: 0 };
  }

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
