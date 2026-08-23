/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Contact {
  id: string;
  name: string;
  phone: string;
  relation: string;
  isActive: boolean;
  alertSent: boolean;
  dispatchTime?: string;
}

export interface Hazard {
  id: string;
  lat: number; // legacy SVG map relative X coordinate (0-100)
  lng: number; // legacy SVG map relative Y coordinate (0-100)
  realLat?: number; // Real Bhubaneswar geographic latitude (for Leaflet map)
  realLng?: number; // Real Bhubaneswar geographic longitude (for Leaflet map)
  type: 'unlit' | 'harassment' | 'isolated' | 'cctv_fail' | 'police_spot';
  severity: 'low' | 'medium' | 'high' | 'safe';
  description: string;
  reporter: string;
  timeAgo: string;
  votes: number;
}

export interface RouteCoordinate {
  x: number;
  y: number;
  label?: string;
  lighting?: number; // 0-100%
  crowd?: number; // 0-100%
}

export interface RouteInfo {
  id: 'fast' | 'safe';
  name: string;
  durationMin: number;
  distanceKm: number;
  safetyScore: number; // 0-100
  lightingScore: number; // 0-100
  policeStationsCount: number;
  crowdDensityScore: number; // 0-100
  hazardsAvoidedCount: number;
  coordinates: RouteCoordinate[];
  color: string;
  ratingDescription: string;
}

export interface IoTMetrics {
  heartRate: number;
  baseHeartRate: number;
  accelX: number;
  accelY: number;
  accelZ: number;
  fallDetected: boolean;
  bloodOxygen: number; // %
  batteryPercent: number;
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected';
  panicScore: number; // 0-100
}

export interface DocSection {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  content: string[];
}

export type FeedbackCategory = 'safe' | 'warning' | 'emergency';

export interface PoliceStationInfo {
  id: string;
  name: string;
  distance: string;
  jurisdiction: string;
  phone: string;
  pcrUnit?: string;
  isWomenSafetyDeskActive: boolean;
  status: 'Online & Patrolling' | 'Duty Desk Active' | 'Standby';
}

export interface FeedbackReport {
  id: string;
  author: string;
  location: string;
  category: FeedbackCategory;
  title: string;
  content: string;
  timestamp: string;
  upvotes: number;
  status: 'Under Review' | 'Dispatched' | 'Resolved' | 'Verified Safe';
  isAnonymous?: boolean;
  policeStation?: {
    name: string;
    distance: string;
    token: string;
    pcrAssigned?: string;
    contactNumber: string;
    dispatchStatus: 'Dispatched to PCR' | 'Acknowledged by SHO' | 'Patrol Route Updated' | 'Logged for Verification';
  };
}

