/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  Siren, 
  Activity, 
  User, 
  BookOpen, 
  LogOut, 
  ShieldCheck, 
  HeartHandshake, 
  Sparkles,
  MapPin,
  Bell,
  Heart,
  MessageSquare
} from 'lucide-react';
import { IoTMetrics, Hazard } from './types';
import IoTWearableSimulator from './components/IoTWearableSimulator';
import SafeRouteNavigation from './components/SafeRouteNavigation';
import EmergencyResponseControl from './components/EmergencyResponseControl';
import ProblemDocumentation from './components/ProblemDocumentation';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import ProfileSection from './components/ProfileSection';
import FeedbackComplaintsSection from './components/FeedbackComplaintsSection';
import { supabase } from './lib/supabaseClient';

type MasterPage = 'landing' | 'login' | 'app';
type DashboardSubTab = 'navigation' | 'sos' | 'wearable' | 'feedback' | 'profile' | 'document';


export default function App() {
  // Master page router
  const [currentPage, setCurrentPage] = useState<MasterPage>('landing');
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setCurrentUser(session.user.user_metadata?.full_name || session.user.email);
        setCurrentPage('app');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setCurrentUser(session.user.user_metadata?.full_name || session.user.email);
        setCurrentPage('app');
      } else {
        setCurrentUser(null);
        setCurrentPage('landing');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Dashboard sub-section tabs
  const [activeTab, setActiveTab] = useState<DashboardSubTab>('navigation');

  // SOS status
  const [isSOSActive, setIsSOSActive] = useState<boolean>(false);
  const [autoTriggerCause, setAutoTriggerCause] = useState<string>('');

  // Initial Mocked Hazards
  const [hazards, setHazards] = useState<Hazard[]>([
    {
      id: 'h1',
      lat: 52, lng: 70,
      realLat: 20.2820, realLng: 85.8150,
      type: 'unlit',
      severity: 'high',
      description: 'Underpass streetlights out completely after dark.',
      reporter: 'Anjali S. (Verified)',
      timeAgo: '16m ago',
      votes: 14
    },
    {
      id: 'h2',
      lat: 38, lng: 48,
      realLat: 20.3040, realLng: 85.8080,
      type: 'harassment',
      severity: 'high',
      description: 'Persistent stalking incidents reported near back parking block.',
      reporter: 'Nisha K. (Verified)',
      timeAgo: '2h ago',
      votes: 42
    },
    {
      id: 'h3',
      lat: 68, lng: 24,
      realLat: 20.3100, realLng: 85.8320,
      type: 'cctv_fail',
      severity: 'medium',
      description: 'CCTV camera lens covered/vandalized near central park lane.',
      reporter: 'Priya R. (Verified)',
      timeAgo: '4h ago',
      votes: 8
    }
  ]);

  // Initial Wristband Telemetry Metric presets
  const [metrics, setMetrics] = useState<IoTMetrics>({
    heartRate: 72,
    baseHeartRate: 72,
    accelX: 0.02,
    accelY: -0.01,
    accelZ: 0.98,
    fallDetected: false,
    bloodOxygen: 98,
    batteryPercent: 88,
    connectionStatus: 'connected',
    panicScore: 12
  });

  const handleAddHazard = (newHazard: Hazard) => {
    setHazards(prev => [newHazard, ...prev]);
  };

  const handleVoteHazard = (id: string) => {
    setHazards(prev => prev.map(h => (h.id === id ? { ...h, votes: h.votes + 1 } : h)));
  };

  const handleManualSOSTrigger = () => {
    setIsSOSActive(true);
    setActiveTab('sos');
    // update metrics to reflect highly stressed states
    setMetrics(prev => ({
      ...prev,
      heartRate: 140,
      panicScore: 98
    }));
  };

  const handleAutoTriggerSOS = (cause: string) => {
    setAutoTriggerCause(cause);
    setIsSOSActive(true);
    setActiveTab('sos');
  };

  const handleManualSOSCancel = () => {
    setIsSOSActive(false);
    setAutoTriggerCause('');
    // reset parameters to healthy resting values
    setMetrics(prev => ({
      ...prev,
      heartRate: 74,
      fallDetected: false,
      panicScore: 15,
      accelX: 0.02,
      accelY: -0.01,
      accelZ: 0.98
    }));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    handleManualSOSCancel();
  };

  // --- RENDERING ROUTER CORNERSTONES ---

  if (currentPage === 'landing') {
    return <LandingPage onNavigateToLogin={() => setCurrentPage('login')} />;
  }

  if (currentPage === 'login') {
    return (
      <LoginPage 
        onNavigateBack={() => setCurrentPage('landing')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F5EBE0] text-[#450920] font-sans antialiased flex flex-col justify-between relative" id="nari-app-container">
      
      {/* Decorative Atmosphere Glow */}
      <div className="absolute top-0 left-1/4 w-[580px] h-[380px] bg-[#A53860]/[0.06] blur-[140px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[400px] bg-[#FFA5AB]/[0.1] blur-[160px] rounded-full pointer-events-none"></div>

      {/* SYSTEM HEADER BAR */}
      <header className="sticky top-0 z-50 border-b border-[#f0c39c] bg-[#F5EBE0]/95 backdrop-blur-md px-6 py-4 md:px-12 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        
        {/* Brand NARI with pulse indicator */}
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isSOSActive ? 'bg-[#A53860] animate-ping' : 'bg-[#A53860] animate-pulse glow-primary'}`}></div>
            <span className="text-xl md:text-2xl font-serif tracking-tight italic text-[#450920] flex items-baseline gap-1.5 font-bold">
              NARI<span className="text-[10px] uppercase tracking-[0.25em] font-mono not-italic text-[#A53860] font-bold">System</span>
            </span>
          </div>
          <div className="hidden md:block h-6 w-[1px] bg-[#f0c39c]"></div>
          <p className="hidden md:block text-[10px] uppercase tracking-[0.16em] text-[#450920] font-bold">Next-generation AI powered Route Investigation</p>
        </div>

        {/* Status indicator pill & User badge */}
        <div className="flex items-center gap-3">
          {currentUser && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-[#F9DBBD] border border-[#f0c39c] rounded-full shadow-sm">
              <div className="w-4 h-4 rounded-full bg-[#A53860]/20 flex items-center justify-center">
                <User className="w-2.5 h-2.5 text-[#A53860]" />
              </div>
              <span className="text-[10px] font-mono text-[#450920] font-bold">{currentUser}</span>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 bg-[#FFA5AB] hover:bg-[#f78d94] text-[#450920] border border-[#f0c39c] rounded-xl transition-all flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider cursor-pointer shadow-sm font-bold"
            title="Log out of Secure Console"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-bold">Logout</span>
          </button>
        </div>

      </header>

      {/* SYSTEM SUB-NAVIGATION TABS BAR */}
      <div className="border-b border-[#f0c39c] bg-[#F9DBBD]/60 py-2.5 px-6 md:px-12 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1.5 bg-[#F5EBE0] p-1.5 rounded-full border border-[#f0c39c] shadow-sm">
          {/* Navigation tab */}
          <button
            onClick={() => setActiveTab('navigation')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold transition-all cursor-pointer ${
              activeTab === 'navigation'
                ? 'bg-[#A53860] text-white shadow-sm'
                : 'text-[#450920] hover:bg-[#FFA5AB]/40'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Route Navigation
          </button>

          {/* SOS Tab */}
          <button
            onClick={() => setActiveTab('sos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold transition-all cursor-pointer ${
              activeTab === 'sos'
                ? 'bg-[#A53860] text-white shadow-sm'
                : 'text-[#450920] hover:bg-[#FFA5AB]/40'
            }`}
          >
            <Siren className="w-3.5 h-3.5" />
            SOS Dispatch
          </button>

          {/* Wearable Tab */}
          <button
            onClick={() => setActiveTab('wearable')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold transition-all cursor-pointer ${
              activeTab === 'wearable'
                ? 'bg-[#A53860] text-white shadow-sm'
                : 'text-[#450920] hover:bg-[#FFA5AB]/40'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Wearable Hub
          </button>

          {/* Feedback & Complaints Tab */}
          <button
            onClick={() => setActiveTab('feedback')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold transition-all cursor-pointer ${
              activeTab === 'feedback'
                ? 'bg-[#A53860] text-white shadow-sm'
                : 'text-[#450920] hover:bg-[#FFA5AB]/40'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Feedback & Complaints
          </button>

          {/* Profile Tab */}
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-[#A53860] text-white shadow-sm'
                : 'text-[#450920] hover:bg-[#FFA5AB]/40'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            User Profile
          </button>

          {/* Analytical Strategy Doc */}
          <button
            onClick={() => setActiveTab('document')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold transition-all cursor-pointer ${
              activeTab === 'document'
                ? 'bg-[#A53860] text-white shadow-sm'
                : 'text-[#450920] hover:bg-[#FFA5AB]/40'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Strategic Analysis
          </button>
        </div>

        {/* Global Instant Alarm Button */}
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-2 bg-[#F5EBE0] border border-[#f0c39c] px-3 py-1.5 rounded-full text-[9px] font-mono uppercase tracking-wider shadow-sm">
            <span className={`w-1.5 h-1.5 rounded-full ${isSOSActive ? 'bg-[#A53860] animate-pulse' : 'bg-[#A53860]'}`}></span>
            <span className="text-[#450920] font-bold">
              {isSOSActive ? 'Crisis Broadcast Active' : 'Sensor Loop Secured'}
            </span>
          </div>

          <button 
            onClick={() => {
              if (isSOSActive) {
                handleManualSOSCancel();
              } else {
                handleManualSOSTrigger();
              }
            }} 
            className={`rounded-full px-5 py-2 text-[9px] uppercase tracking-widest font-bold font-mono transition-all border shadow-sm cursor-pointer ${
              isSOSActive
                ? 'bg-[#A53860] border-[#A53860] text-white animate-pulse'
                : 'bg-[#FFA5AB] border-[#f0c39c] text-[#450920] hover:bg-[#A53860] hover:text-white'
            }`}
          >
            {isSOSActive ? 'CANCEL ALARM' : 'PANIC TRIGGER'}
          </button>
        </div>
      </div>

      {/* MASTER CONTAINER MAIN ACTIVE STAGE */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 md:p-8 space-y-8">
        
        {/* GLOBAL ACTIVE SOS BANNER */}
        {isSOSActive && (
          <div className="p-4 bg-[#A53860] border border-[#8c2e50] rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-md animate-pulse text-white">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#450920] rounded-xl text-white animate-bounce">
                <Siren className="w-5 h-5 text-[#FFA5AB]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                  <span>🚨 EMERGENCY SOS DISPATCH ACTIVE</span>
                  {autoTriggerCause && <span className="text-xs text-[#FFA5AB] font-sans normal-case font-normal">({autoTriggerCause})</span>}
                </h3>
                <p className="text-[11px] text-white/90 font-sans mt-0.5">
                  4-Tier Automated Alert Loop is running. SMS broadcasts sent to primary & secondary guardians.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeTab !== 'sos' && (
                <button
                  onClick={() => setActiveTab('sos')}
                  className="px-4 py-2 bg-[#FFA5AB] text-[#450920] font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm hover:bg-white"
                >
                  View Crisis Core
                </button>
              )}
              <button
                onClick={handleManualSOSCancel}
                className="px-4 py-2 bg-[#450920] hover:bg-black text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
              >
                Cancel Alarm
              </button>
            </div>
          </div>
        )}

        {/* Render Tab Segment based on Active Selection */}

        {activeTab === 'navigation' && (
          <div className="space-y-6" id="navigation-tab-container">
            {/* Context bar */}
            <div className="p-6 bg-[#F9DBBD] border border-[#f0c39c] shadow-sm rounded-2xl flex flex-wrap justify-between items-center gap-4">
              <div className="flex items-start gap-3 max-w-2xl">
                <div className="p-2 rounded-xl bg-[#A53860]/15 text-[#A53860] shrink-0 mt-0.5">
                  <Compass className="w-4 h-4 animate-spin-slow" />
                </div>
                <div>
                  <h4 className="text-sm font-serif italic text-[#450920] font-bold flex items-center gap-2">
                    Spatial Safe-Route Navigation Console
                  </h4>
                  <p className="text-xs text-[#450920] font-medium leading-relaxed font-sans mt-0.5">
                    Analyze alternate routing maps loaded with real-time streetlight sensors, pedestrian volume checks, and community reporting nodes. Log new hazards dynamically below.
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation core component */}
            <SafeRouteNavigation 
              onAddHazard={handleAddHazard}
              onVoteHazard={handleVoteHazard}
              hazards={hazards}
              metricsPanicScore={metrics.panicScore}
            />
          </div>
        )}

        {activeTab === 'sos' && (
          <div className="space-y-6" id="sos-tab-container">
            {/* Context bar */}
            <div className="p-6 bg-[#F9DBBD] border border-[#f0c39c] shadow-sm rounded-2xl flex flex-wrap justify-between items-center gap-4">
              <div className="flex items-start gap-3 max-w-2xl">
                <div className="p-2 rounded-xl bg-[#A53860]/15 text-[#A53860] shrink-0 mt-0.5">
                  <Siren className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-serif italic text-[#450920] font-bold flex items-center gap-2">
                    Vocal & Tactile Emergency Response Control
                  </h4>
                  <p className="text-xs text-[#450920] font-medium leading-relaxed font-sans mt-0.5">
                    Utilizes hands-free Web Speech detection. Speak "NARI Help" to trigger immediate dispatch loops. Configure and test trusted guardian peer contacts and examine simulated alert SMS feeds.
                  </p>
                </div>
              </div>
            </div>

            {/* Emergency response controller */}
            <EmergencyResponseControl 
              isSOSActive={isSOSActive}
              onManualSOSTrigger={handleManualSOSTrigger}
              onManualSOSCancel={handleManualSOSCancel}
              autoTriggerCause={autoTriggerCause}
            />
          </div>
        )}

        {activeTab === 'wearable' && (
          <div className="space-y-6" id="wearable-tab-container">
            {/* Context bar */}
            <div className="p-6 bg-[#F9DBBD] border border-[#f0c39c] shadow-sm rounded-2xl flex flex-wrap justify-between items-center gap-4">
              <div className="flex items-start gap-3 max-w-2xl">
                <div className="p-2 rounded-xl bg-[#A53860]/15 text-[#A53860] shrink-0 mt-0.5">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-serif italic text-[#450920] font-bold flex items-center gap-2">
                    IoT Wristband Telemetry Monitoring Hub
                  </h4>
                  <p className="text-xs text-[#450920] font-medium leading-relaxed font-sans mt-0.5">
                    Simulate wearable hardware sensor behavior in real-time. Drag sliders to adjust heart rate metrics or toggle the high-G impact fall simulator to examine system automation scripts.
                  </p>
                </div>
              </div>
            </div>

            {/* Wearable controller */}
            <div className="max-w-2xl mx-auto w-full">
              <IoTWearableSimulator 
                metrics={metrics}
                setMetrics={setMetrics}
                onAutoTriggerSOS={handleAutoTriggerSOS}
                isSOSActive={isSOSActive}
              />
            </div>
          </div>
        )}

        {activeTab === 'feedback' && (
          <div className="space-y-6" id="feedback-tab-container">
            <FeedbackComplaintsSection 
              currentUser={currentUser || "NARI Guard"}
            />
          </div>
        )}


        {activeTab === 'profile' && (
          <div className="space-y-6" id="profile-tab-container">
            <ProfileSection 
              metrics={metrics}
              setMetrics={setMetrics}
              username={currentUser || "NARI Guard"}
            />
          </div>
        )}

        {activeTab === 'document' && (
          <div className="h-full space-y-6" id="document-tab-container">
            <ProblemDocumentation />
          </div>
        )}

      </main>

      {/* FOOTER BAR */}
      <footer className="border-t border-[#f0c39c] py-8 px-6 md:px-12 bg-[#F9DBBD] text-[#450920] text-[9px] uppercase tracking-[0.2em]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center gap-2.5 font-serif text-[#450920] lowercase tracking-normal italic text-sm font-bold">
            NARI Safety Init. / 2026
          </div>

          <div className="flex flex-wrap gap-8 font-bold">
            <button onClick={() => setActiveTab('navigation')} className="hover:text-[#A53860] transition-all cursor-pointer">Navigation</button>
            <button onClick={() => setActiveTab('sos')} className="hover:text-[#A53860] transition-all cursor-pointer">Crisis Core</button>
            <button onClick={() => setActiveTab('profile')} className="hover:text-[#A53860] transition-all cursor-pointer">Security Card</button>
          </div>

          <div className="text-[#450920]/80 font-mono text-[8px] tracking-widest font-bold">
            EST. 2026 • ASIA CENTRAL NOC
          </div>

        </div>
      </footer>

    </div>
  );
}
