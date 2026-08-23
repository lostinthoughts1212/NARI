import { API_BASE_URL } from '../constants/Config';
import type { RouteRequest, RouteResponse, PolygonsResponse } from '../types';

export async function fetchSafeRoute(req: RouteRequest): Promise<RouteResponse> {
  const response = await fetch(`${API_BASE_URL}/route`, {
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
  const response = await fetch(`${API_BASE_URL}/polygons`);
  if (!response.ok) {
    throw new Error(`Polygons error: ${response.status}`);
  }
  return response.json();
}

export async function healthCheck(): Promise<{ status: string; polygons_loaded: number }> {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) throw new Error('Backend offline');
  return response.json();
}
