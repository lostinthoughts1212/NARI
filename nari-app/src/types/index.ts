export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface RouteRequest {
  start_lat: number;
  start_lon: number;
  end_lat: number;
  end_lon: number;
  costing?: string;
  avoid_danger_zones?: boolean;
}

export interface ValhallaManeuver {
  type: number;
  instruction: string;
  verbal_transition_alert_instruction?: string;
  verbal_pre_transition_instruction?: string;
  verbal_post_transition_instruction?: string;
  street_names?: string[];
  time: number; // seconds
  length: number; // km
  begin_shape_index: number;
  end_shape_index: number;
}

export interface RouteLeg {
  shape: string; // Valhalla encoded polyline (precision 6)
  summary: {
    length: number; // km
    time: number;   // seconds
  };
  maneuvers?: ValhallaManeuver[];
}

export interface RouteTrip {
  legs: RouteLeg[];
  summary: {
    length: number;
    time: number;
  };
}

export interface RouteResponse {
  trip?: RouteTrip;
  alternates?: RouteResponse[];
  warning?: string;
}

export interface PolygonsResponse {
  polygons: number[][][]; // [polygon: [point: [lon, lat]]]
}

export interface RouteInfo {
  distance: number; // km
  time: number;     // minutes
  warning?: string;
  maneuvers?: ValhallaManeuver[];
}

export type JourneyStatus = 'active' | 'completed' | 'off_route' | 'sos';

export interface LiveLocationData {
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
  timestamp: number;
}

export interface LiveJourneySession {
  id: string;
  userName: string;
  userPhone?: string;
  origin: LatLng;
  destination: LatLng;
  routeCoords: LatLng[];
  currentLocation: LiveLocationData;
  status: JourneyStatus;
  offRouteDistance?: number;
  currentManeuverIndex?: number;
  remainingDistanceKm?: number;
  remainingTimeMin?: number;
  startedAt: number;
  updatedAt: number;
}
