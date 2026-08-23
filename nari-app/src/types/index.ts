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

export interface RouteLeg {
  shape: string; // Valhalla encoded polyline (precision 6)
  summary: {
    length: number; // km
    time: number;   // seconds
  };
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
}
