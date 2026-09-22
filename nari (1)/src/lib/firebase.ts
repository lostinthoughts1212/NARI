import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  onValue,
  off,
  update,
  get,
  type DatabaseReference,
} from 'firebase/database';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface ValhallaManeuver {
  type: number;
  instruction: string;
  verbal_transition_alert_instruction?: string;
  verbal_pre_transition_instruction?: string;
  verbal_post_transition_instruction?: string;
  street_names?: string[];
  time: number;
  length: number;
  begin_shape_index: number;
  end_shape_index: number;
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

export const firebaseConfig = {
  apiKey: "AIzaSyAQkZL4FMmLY9jJJ5N6sIVIAAYPa8yn1VE",
  authDomain: "nari-safety-app-6001f.firebaseapp.com",
  databaseURL: "https://nari-safety-app-6001f-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "nari-safety-app-6001f",
  storageBucket: "nari-safety-app-6001f.firebasestorage.app",
  messagingSenderId: "332635339124",
  appId: "1:332635339124:web:bb5d1ff930e21b668ed421"
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getDatabase(app);

/**
 * Subscribes to real-time journey updates
 */
export function subscribeToJourney(
  journeyId: string,
  callback: (session: LiveJourneySession | null) => void
): () => void {
  const journeyRef = ref(db, `journeys/${journeyId}`);
  onValue(journeyRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as LiveJourneySession);
    } else {
      callback(null);
    }
  });

  return () => off(journeyRef);
}

/**
 * Fetch one-off journey snapshot
 */
export async function getJourney(journeyId: string): Promise<LiveJourneySession | null> {
  const journeyRef = ref(db, `journeys/${journeyId}`);
  const snapshot = await get(journeyRef);
  return snapshot.exists() ? (snapshot.val() as LiveJourneySession) : null;
}
