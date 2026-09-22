import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  set,
  update,
  onValue,
  off,
  type DatabaseReference,
} from 'firebase/database';
import type { LiveJourneySession, LiveLocationData, JourneyStatus } from '../types';

export const firebaseConfig = {
  apiKey: "AIzaSyAQkZL4FMmLY9jJJ5N6sIVIAAYPa8yn1VE",
  authDomain: "nari-safety-app-6001f.firebaseapp.com",
  databaseURL: "https://nari-safety-app-6001f-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "nari-safety-app-6001f",
  storageBucket: "nari-safety-app-6001f.firebasestorage.app",
  messagingSenderId: "332635339124",
  appId: "1:332635339124:web:bb5d1ff930e21b668ed421"
};

// Initialize Firebase once
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getDatabase(app);

/**
 * Creates a new active journey session in Firebase under /journeys/{journeyId}
 */
export async function createJourneySession(session: LiveJourneySession): Promise<void> {
  const journeyRef = ref(db, `journeys/${session.id}`);
  await set(journeyRef, session);
}

/**
 * Updates the user's current GPS location and journey progression
 */
export async function updateLiveLocation(
  journeyId: string,
  location: LiveLocationData,
  extra?: {
    offRouteDistance?: number;
    currentManeuverIndex?: number;
    remainingDistanceKm?: number;
    remainingTimeMin?: number;
    status?: JourneyStatus;
  }
): Promise<void> {
  const journeyRef = ref(db, `journeys/${journeyId}`);
  const payload: Record<string, any> = {
    currentLocation: location,
    updatedAt: Date.now(),
  };

  if (extra?.offRouteDistance !== undefined) payload.offRouteDistance = extra.offRouteDistance;
  if (extra?.currentManeuverIndex !== undefined) payload.currentManeuverIndex = extra.currentManeuverIndex;
  if (extra?.remainingDistanceKm !== undefined) payload.remainingDistanceKm = extra.remainingDistanceKm;
  if (extra?.remainingTimeMin !== undefined) payload.remainingTimeMin = extra.remainingTimeMin;
  if (extra?.status !== undefined) payload.status = extra.status;

  await update(journeyRef, payload);
}

/**
 * Updates the journey status (e.g., 'active', 'off_route', 'sos', 'completed')
 */
export async function updateJourneyStatus(
  journeyId: string,
  status: JourneyStatus
): Promise<void> {
  const journeyRef = ref(db, `journeys/${journeyId}`);
  await update(journeyRef, {
    status,
    updatedAt: Date.now(),
  });
}

/**
 * Subscribes to real-time updates for a specific journey
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
