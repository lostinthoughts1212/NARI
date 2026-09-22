/**
 * LivePublicTracker.tsx
 * Public Emergency Live Tracking Dashboard for NARI.
 * Accessed by trusted emergency contacts via: http://<host>/?track=<journeyId>
 * Real-time continuous synchronization via Firebase Realtime Database.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Polygon,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import {
  ShieldAlert,
  ShieldCheck,
  Phone,
  PhoneCall,
  AlertTriangle,
  Clock,
  Compass,
  MapPin,
  Share2,
  CheckCircle2,
  Maximize2,
  LocateFixed,
  Eye,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { subscribeToJourney, type LiveJourneySession, type LatLng } from '../lib/firebase';
import { fetchPolygons } from '../lib/naviApi';

// Fix Leaflet marker icons
// @ts-expect-error – private property
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom User GPS Moving Marker with direction arrow & pulsing radar ring
const createUserIcon = (heading: number | null | undefined, isSos: boolean, isOffRoute: boolean) => {
  const color = isSos ? '#EF4444' : isOffRoute ? '#F59E0B' : '#10B981';
  const pulseColor = isSos
    ? 'rgba(239, 68, 68, 0.4)'
    : isOffRoute
    ? 'rgba(245, 158, 11, 0.4)'
    : 'rgba(16, 185, 129, 0.4)';

  const rotation = heading != null ? heading : 0;

  return L.divIcon({
    className: '',
    html: `
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
        <div style="
          position: absolute;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: ${pulseColor};
          animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
        <div style="
          position: relative;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: ${color};
          border: 3px solid #FFFFFF;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(${rotation}deg);
          transition: transform 0.4s ease;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white" style="margin-bottom: 2px;">
            <polygon points="12,2 22,22 12,17 2,22" />
          </svg>
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
};

const originIcon = L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#10B981;border:3px solid #FFF;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const destIcon = L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#E91E8C;border:3px solid #FFF;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Auto-centering helper
function AutoCenterMap({ center, follow }: { center: [number, number]; follow: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (follow && center[0] && center[1]) {
      map.panTo(center, { animate: true, duration: 0.8 });
    }
  }, [center, follow, map]);
  return null;
}

interface LivePublicTrackerProps {
  journeyId: string;
  onExit?: () => void;
}

export default function LivePublicTracker({ journeyId, onExit }: LivePublicTrackerProps) {
  const [session, setSession] = useState<LiveJourneySession | null>(null);
  const [dangerZones, setDangerZones] = useState<[number, number][][]>([]);
  const [loading, setLoading] = useState(true);
  const [followUser, setFollowUser] = useState(true);
  const [copied, setCopied] = useState(false);
  const [trail, setTrail] = useState<[number, number][]>([]);

  // Subscribe to Firebase Realtime Database
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToJourney(journeyId, (data) => {
      setLoading(false);
      if (data) {
        setSession(data);
        if (data.currentLocation?.latitude && data.currentLocation?.longitude) {
          setTrail((prev) => {
            const nextPoint: [number, number] = [
              data.currentLocation.latitude,
              data.currentLocation.longitude,
            ];
            const last = prev[prev.length - 1];
            if (!last || last[0] !== nextPoint[0] || last[1] !== nextPoint[1]) {
              return [...prev.slice(-40), nextPoint]; // keep last 40 breadcrumbs
            }
            return prev;
          });
        }
      }
    });

    return () => unsubscribe();
  }, [journeyId]);

  // Load danger zones
  useEffect(() => {
    fetchPolygons()
      .then((data) => {
        const zones = data.polygons.map((poly) =>
          poly.map((coord) => [coord[1], coord[0]] as [number, number])
        );
        setDangerZones(zones);
      })
      .catch((err) => console.warn('Could not load danger zones:', err));
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const isSos = session?.status === 'sos';
  const isOffRoute = session?.status === 'off_route';
  const isCompleted = session?.status === 'completed';

  const userCenter: [number, number] = session?.currentLocation
    ? [session.currentLocation.latitude, session.currentLocation.longitude]
    : session?.origin
    ? [session.origin.latitude, session.origin.longitude]
    : [20.2961, 85.8245];

  const routePositions: [number, number][] = (session?.routeCoords || []).map((c) => [
    c.latitude,
    c.longitude,
  ]);

  const originPos: [number, number] | null = session?.origin
    ? [session.origin.latitude, session.origin.longitude]
    : null;

  const destPos: [number, number] | null = session?.destination
    ? [session.destination.latitude, session.destination.longitude]
    : null;

  const lastUpdatedSeconds = session?.updatedAt
    ? Math.max(0, Math.round((Date.now() - session.updatedAt) / 1000))
    : null;

  return (
    <div className={`relative w-screen h-screen overflow-hidden bg-[#070313] text-[#F3E8FF] flex flex-col ${
      isSos ? 'ring-8 ring-red-600 animate-pulse' : ''
    }`}>
      {/* ── TOP BANNER / EMERGENCY HEADER ── */}
      <header className="z-[1000] bg-[#140827]/90 backdrop-blur-md border-b border-[#7B2D8B]/40 px-4 py-3 shadow-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-lg ${
            isSos ? 'bg-red-600 animate-bounce' : isOffRoute ? 'bg-amber-600' : 'bg-gradient-to-tr from-[#7B2D8B] to-[#E91E8C]'
          }`}>
            {isSos ? <ShieldAlert size={22} /> : <ShieldCheck size={22} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white">
                {session?.userName ? `${session.userName}'s Live Safe Route` : 'NARI Emergency Live Stream'}
              </h1>
              <span className="text-xs bg-[#7B2D8B]/40 text-[#C4B5FD] px-2 py-0.5 rounded-full border border-[#7B2D8B]/50 flex items-center gap-1">
                <Radio size={10} className="text-emerald-400 animate-pulse" /> Live Tracking
              </span>
            </div>
            <p className="text-xs text-[#C4B5FD]/70">
              Session ID: <span className="font-mono text-white/90">{journeyId}</span>
              {lastUpdatedSeconds !== null && (
                <span className="ml-2 font-mono text-emerald-400">
                  · Ping {lastUpdatedSeconds}s ago
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2">
          {isSos ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-red-600 text-white font-bold text-xs uppercase tracking-wider animate-pulse shadow-lg shadow-red-600/50">
              <ShieldAlert size={16} /> EMERGENCY SOS ACTIVE!
            </div>
          ) : isOffRoute ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500 text-black font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/30">
              <AlertTriangle size={16} /> Off-Route Deviation (~{Math.round(session?.offRouteDistance || 0)}m)
            </div>
          ) : isCompleted ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg">
              <CheckCircle2 size={16} /> Journey Completed
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 font-semibold text-xs border border-emerald-500/40 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              On Safe Route
            </div>
          )}

          {/* Quick Actions */}
          <button
            onClick={handleCopyLink}
            title="Copy Public Tracking Link"
            className="p-2 rounded-lg bg-[#2A1450]/80 hover:bg-[#3D1D70] border border-[#7B2D8B]/50 text-white transition text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Share2 size={14} />
            <span className="hidden sm:inline">{copied ? 'Link Copied!' : 'Share'}</span>
          </button>

          {session?.userPhone && (
            <a
              href={`tel:${session.userPhone}`}
              className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-md shadow-emerald-700/40"
            >
              <Phone size={14} />
              <span className="hidden sm:inline">Call User</span>
            </a>
          )}

          <a
            href="tel:112"
            className="p-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-md shadow-red-700/40"
          >
            <PhoneCall size={14} />
            <span className="hidden sm:inline">Dial 112</span>
          </a>

          {onExit && (
            <button
              onClick={onExit}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs transition cursor-pointer"
              title="Close Tracker"
            >
              Exit
            </button>
          )}
        </div>
      </header>

      {/* ── SOS CRITICAL ALERT BANNER (If Active) ── */}
      {isSos && (
        <div className="z-[999] bg-gradient-to-r from-red-700 via-rose-600 to-red-700 text-white px-4 py-2 text-xs sm:text-sm font-bold flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="animate-bounce" />
            <span>CRITICAL ALERT: Distress signal triggered by {session?.userName || 'User'}. Real-time tracking link active.</span>
          </div>
          <a
            href="tel:112"
            className="bg-white text-red-700 font-extrabold px-3 py-1 rounded-md hover:bg-gray-100 transition shadow"
          >
            Dispatch Police
          </a>
        </div>
      )}

      {/* ── MAP CONTAINER ── */}
      <div className="relative flex-1 w-full h-full">
        {loading ? (
          <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center bg-[#070313]/90 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-full border-4 border-[#7B2D8B] border-t-[#E91E8C] animate-spin mb-3"></div>
            <p className="text-sm font-semibold text-white">Connecting to NARI Live Guardian Stream...</p>
            <p className="text-xs text-[#C4B5FD]/60 mt-1">Journey: {journeyId}</p>
          </div>
        ) : !session ? (
          <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center bg-[#070313] p-6 text-center">
            <ShieldAlert size={48} className="text-rose-500 mb-3" />
            <h2 className="text-lg font-bold text-white">Journey Not Found or Expired</h2>
            <p className="text-xs text-[#C4B5FD]/70 max-w-md mt-1 mb-4">
              This live tracking link may have ended or the session ID ({journeyId}) is invalid. Please request an updated link from the user.
            </p>
            {onExit && (
              <button
                onClick={onExit}
                className="px-4 py-2 rounded-lg bg-[#7B2D8B] hover:bg-[#9B4DCA] text-white text-xs font-semibold"
              >
                Back to Dashboard
              </button>
            )}
          </div>
        ) : null}

        <MapContainer
          center={userCenter}
          zoom={15}
          className="w-full h-full"
          zoomControl={false}
        >
          <AutoCenterMap center={userCenter} follow={followUser} />

          {/* CartoDB Dark Tiles */}
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            maxZoom={19}
          />

          {/* Danger Zone Polygons */}
          {dangerZones.map((zone, idx) => (
            <Polygon
              key={`dz-${idx}`}
              positions={zone}
              pathOptions={{
                color: '#EF4444',
                fillColor: '#EF4444',
                fillOpacity: 0.18,
                weight: 1.5,
              }}
            />
          ))}

          {/* Planned Safe Route Glow Polyline */}
          {routePositions.length > 0 && (
            <>
              <Polyline
                positions={routePositions}
                pathOptions={{
                  color: '#10B981',
                  weight: 12,
                  opacity: 0.25,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              <Polyline
                positions={routePositions}
                pathOptions={{
                  color: '#10B981',
                  weight: 5,
                  opacity: 0.9,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </>
          )}

          {/* Breadcrumb Trail */}
          {trail.length > 1 && (
            <Polyline
              positions={trail}
              pathOptions={{
                color: isSos ? '#EF4444' : '#E91E8C',
                weight: 3,
                dashArray: '5, 8',
                opacity: 0.8,
              }}
            />
          )}

          {/* Origin Marker */}
          {originPos && <Marker position={originPos} icon={originIcon} />}

          {/* Destination Marker */}
          {destPos && <Marker position={destPos} icon={destIcon} />}

          {/* Live User Moving Marker */}
          {session?.currentLocation && (
            <Marker
              position={[
                session.currentLocation.latitude,
                session.currentLocation.longitude,
              ]}
              icon={createUserIcon(
                session.currentLocation.heading,
                isSos,
                isOffRoute
              )}
            />
          )}
        </MapContainer>

        {/* ── FLOATING CONTROLS & HUD ── */}
        <div className="absolute top-4 right-4 z-[999] flex flex-col gap-2">
          <button
            onClick={() => setFollowUser((prev) => !prev)}
            className={`p-2.5 rounded-xl backdrop-blur-md border shadow-lg transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
              followUser
                ? 'bg-emerald-600 text-white border-emerald-400/50'
                : 'bg-[#1E0D3E]/80 text-[#C4B5FD] border-[#7B2D8B]/40 hover:bg-[#2A1450]'
            }`}
          >
            <LocateFixed size={16} />
            <span className="hidden sm:inline">{followUser ? 'Lock View' : 'Free View'}</span>
          </button>
        </div>

        {/* ── BOTTOM FLOATING METRICS DRAWER ── */}
        {session && (
          <div className="absolute bottom-4 left-4 right-4 z-[999] max-w-2xl mx-auto bg-[#140827]/95 backdrop-blur-xl border border-[#7B2D8B]/50 rounded-2xl p-4 shadow-2xl">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Walking Speed */}
              <div className="bg-[#1E0D3E]/80 rounded-xl p-2.5 border border-[#7B2D8B]/30">
                <span className="text-[11px] text-[#C4B5FD]/70 uppercase font-semibold flex items-center gap-1">
                  <Compass size={12} className="text-[#00BCD4]" /> Speed
                </span>
                <p className="text-base sm:text-lg font-black text-white mt-0.5">
                  {(session.currentLocation?.speed || 0).toFixed(1)} <span className="text-xs font-normal text-[#C4B5FD]">km/h</span>
                </p>
              </div>

              {/* Remaining Distance */}
              <div className="bg-[#1E0D3E]/80 rounded-xl p-2.5 border border-[#7B2D8B]/30">
                <span className="text-[11px] text-[#C4B5FD]/70 uppercase font-semibold flex items-center gap-1">
                  <MapPin size={12} className="text-emerald-400" /> Distance Left
                </span>
                <p className="text-base sm:text-lg font-black text-white mt-0.5">
                  {session.remainingDistanceKm != null
                    ? session.remainingDistanceKm < 1
                      ? `${Math.round(session.remainingDistanceKm * 1000)} m`
                      : `${session.remainingDistanceKm.toFixed(2)} km`
                    : '--'}
                </p>
              </div>

              {/* Estimated Arrival */}
              <div className="bg-[#1E0D3E]/80 rounded-xl p-2.5 border border-[#7B2D8B]/30">
                <span className="text-[11px] text-[#C4B5FD]/70 uppercase font-semibold flex items-center gap-1">
                  <Clock size={12} className="text-[#E91E8C]" /> ETA
                </span>
                <p className="text-base sm:text-lg font-black text-white mt-0.5">
                  {session.remainingTimeMin != null
                    ? `~${Math.round(session.remainingTimeMin)} min`
                    : '--'}
                </p>
              </div>

              {/* Safety State */}
              <div className={`rounded-xl p-2.5 border ${
                isSos
                  ? 'bg-red-950/60 border-red-500/60'
                  : isOffRoute
                  ? 'bg-amber-950/60 border-amber-500/60'
                  : 'bg-emerald-950/60 border-emerald-500/60'
              }`}>
                <span className="text-[11px] uppercase font-semibold flex items-center gap-1 text-white/80">
                  <ShieldCheck size={12} /> Status
                </span>
                <p className={`text-base sm:text-lg font-black mt-0.5 ${
                  isSos ? 'text-red-400' : isOffRoute ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {isSos ? 'DISTRESS' : isOffRoute ? 'OFF ROUTE' : 'SECURE'}
                </p>
              </div>
            </div>

            {/* Current Coordinates snippet */}
            <div className="mt-3 pt-2.5 border-t border-[#7B2D8B]/30 flex flex-wrap items-center justify-between text-[11px] text-[#C4B5FD]/70 font-mono">
              <div>
                GPS: {session.currentLocation?.latitude.toFixed(5)}, {session.currentLocation?.longitude.toFixed(5)}
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Bhubaneswar Safe Corridor</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
