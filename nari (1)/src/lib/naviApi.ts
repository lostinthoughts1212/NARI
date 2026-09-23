/**
 * naviApi.ts
 * API client for the NARI navsys backend (FastAPI, port 8000).
 * Provides safe route calculation and danger zone polygon fetching.
 *
 * In dev: Vite proxies /nav-api → http://localhost:8000 (see vite.config.ts).
 * In production: set VITE_NAV_API_URL to your deployed backend URL.
 */

// Use VITE_NAV_API_URL if set, or Cloudflare tunnel on Netlify, or local Vite proxy.
// Use VITE_NAV_API_URL if set, or local Vite proxy / direct localhost:8000
const PRIMARY_NAV_API_BASE =
  import.meta.env.VITE_NAV_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname.includes('netlify.app')
    ? ''
    : 'http://localhost:8000');

const CANDIDATE_BASES = Array.from(
  new Set([
    PRIMARY_NAV_API_BASE,
    'http://localhost:8000',
    '/nav-api',
  ].filter(Boolean))
);

let activeBaseIndex = 0;

async function resilientFetch(path: string, init?: RequestInit): Promise<Response> {
  let lastError: any = null;

  for (let i = 0; i < CANDIDATE_BASES.length; i++) {
    const idx = (activeBaseIndex + i) % CANDIDATE_BASES.length;
    const base = CANDIDATE_BASES[idx];
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
    const url = `${cleanBase}${path.startsWith('/') ? path : '/' + path}`;

    try {
      const resp = await fetch(url, init);
      if (resp.ok || resp.status === 400 || resp.status === 422) {
        activeBaseIndex = idx;
        return resp;
      }
      lastError = new Error(`HTTP ${resp.status} from ${url}`);
    } catch (err) {
      lastError = err;
      console.warn(`[NARI API] Attempt failed for ${url}:`, err);
    }
  }

  throw lastError || new Error(`All backend candidates failed for ${path}`);
}

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
  maneuvers?: any[];
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
  maneuvers?: any[];
}

// ── API Functions ─────────────────────────────────────────────────────────────

export async function fetchSafeRoute(req: RouteRequest): Promise<RouteResponse> {
  const response = await resilientFetch('/route', {
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
  const response = await resilientFetch('/polygons');
  if (!response.ok) {
    throw new Error(`Polygons error: ${response.status}`);
  }
  return response.json();
}

export async function healthCheck(): Promise<{ status: string; polygons_loaded: number }> {
  const response = await resilientFetch('/health');
  if (!response.ok) throw new Error('Backend offline');
  return response.json();
}
