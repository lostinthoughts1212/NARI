/**
 * naviApi.ts
 * API client for the NARI navsys backend (FastAPI, port 8000).
 * Provides safe route calculation and danger zone polygon fetching.
 *
 * In dev: Vite proxies /nav-api → http://localhost:8000 (see vite.config.ts).
 * In production: set VITE_NAV_API_URL to your deployed backend URL.
 */

// Use the Vite proxy path during dev so there are zero CORS issues.
// For production builds VITE_NAV_API_URL must point to the real backend.
const NAV_API_BASE = import.meta.env.VITE_NAV_API_URL ?? '/nav-api';

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── API Functions ─────────────────────────────────────────────────────────────

export async function fetchSafeRoute(req: RouteRequest): Promise<RouteResponse> {
  const response = await fetch(`${NAV_API_BASE}/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!response.ok) {
    const err = await response.text().catch(() => String(response.status));
    throw new Error(`Route error ${response.status}: ${err}`);
  }
  return response.json();
}

export async function fetchPolygons(): Promise<PolygonsResponse> {
  const response = await fetch(`${NAV_API_BASE}/polygons`);
  if (!response.ok) {
    throw new Error(`Polygons error: ${response.status}`);
  }
  return response.json();
}

export async function healthCheck(): Promise<{ status: string; polygons_loaded: number }> {
  const response = await fetch(`${NAV_API_BASE}/health`);
  if (!response.ok) throw new Error('Backend offline');
  return response.json();
}
