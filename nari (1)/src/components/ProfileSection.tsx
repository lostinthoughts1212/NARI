/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  User, 
  Phone, 
  Heart, 
  Activity, 
  Settings, 
  ShieldCheck, 
  CreditCard, 
  Check, 
  RefreshCw,
  Clock,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  HeartPulse,
  AlertTriangle,
  Zap,
  Calendar
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { IoTMetrics } from '../types';

interface ProfileSectionProps {
  metrics: IoTMetrics;
  setMetrics: React.Dispatch<React.SetStateAction<IoTMetrics>>;
  username: string;
}

// Custom Tooltip for Recharts Safety & Stress Trends
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-[#f0c39c] p-3.5 rounded-xl shadow-md space-y-2 text-xs font-mono">
        <p className="text-[#450920] font-bold border-b border-[#f0c39c] pb-1.5 uppercase tracking-wider text-[10px]">
          {label} Wearable Log
        </p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: entry.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                {entry.name}:
              </span>
              <span className="font-bold text-[#450920] text-[11px]">
                {entry.value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function ProfileSection({ metrics, setMetrics, username }: ProfileSectionProps) {
  // User personal settings state
  const [fullName, setFullName] = useState<string>(username.replace(/[_-]/g, ' '));
  const [phone, setPhone] = useState<string>('+91 98450 12009');
  const [bloodGroup, setBloodGroup] = useState<string>('O Positive (O+)');
  const [emergencyId, setEmergencyId] = useState<string>('NARI-EMERG-77A9');
  const [medicalNotes, setMedicalNotes] = useState<string>('No known allergies. Asthmatic (inhaler in handbag pocket).');
  const [customSOSMessage, setCustomSOSMessage] = useState<string>('NARI Distress Call: [Verified User] has triggered automatic Stress Sentinel. Heart rate has spiked. Live Safe GPS Link attached.');
  
  // Settings / Calibration toggles state
  const [fallSensitivity, setFallSensitivity] = useState<'low' | 'medium' | 'high'>('medium');
  const [vocalSensitivity, setVocalSensitivity] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');
  const [autoSirenEnabled, setAutoSirenEnabled] = useState<boolean>(true);
  const [continuousGPSMode, setContinuousGPSMode] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);

  // Timeframe selector for Wearable Trends Chart
  const [trendTimeframe, setTrendTimeframe] = useState<'weekly' | 'monthly'>('weekly');

  // Wearable Safety vs Stress Trends dataset
  const weeklyData = [
    { name: 'Mon', safetyScore: 92, stressScore: 24, heartRate: 72 },
    { name: 'Tue', safetyScore: 88, stressScore: 35, heartRate: 78 },
    { name: 'Wed', safetyScore: 95, stressScore: 18, heartRate: 70 },
    { name: 'Thu', safetyScore: 84, stressScore: 42, heartRate: 83 },
    { name: 'Fri', safetyScore: 90, stressScore: 28, heartRate: 74 },
    { name: 'Sat', safetyScore: 96, stressScore: 15, heartRate: 68 },
    { name: 'Sun', safetyScore: 98, stressScore: 12, heartRate: 66 },
  ];

  const monthlyData = [
    { name: 'Week 1', safetyScore: 89, stressScore: 32, heartRate: 76 },
    { name: 'Week 2', safetyScore: 93, stressScore: 22, heartRate: 71 },
    { name: 'Week 3', safetyScore: 87, stressScore: 38, heartRate: 79 },
    { name: 'Week 4', safetyScore: 95, stressScore: 18, heartRate: 69 },
  ];

  const activeTrendData = trendTimeframe === 'weekly' ? weeklyData : monthlyData;

  // Calculate Averages
  const avgSafety = Math.round(
    activeTrendData.reduce((acc, curr) => acc + curr.safetyScore, 0) / activeTrendData.length
  );
  const avgStress = Math.round(
    activeTrendData.reduce((acc, curr) => acc + curr.stressScore, 0) / activeTrendData.length
  );

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
    }, 3000);
  };

  const handleCalibrateBaseHeartRate = () => {
    setIsCalibrating(true);
    // Simulate heart rate baseline calibration
    setTimeout(() => {
      const randomBase = Math.floor(68 + Math.random() * 8); // 68 - 75 bpm
      setMetrics(prev => ({
        ...prev,
        baseHeartRate: randomBase,
        heartRate: randomBase // align current
      }));
      setIsCalibrating(false);
    }, 2000);
  };

  return (
    <div className="space-y-8" id="nari-profile-section">
      
      {/* Top Welcome Card */}
      <div className="p-8 bg-[#F9DBBD] border border-[#f0c39c] rounded-2xl flex flex-wrap justify-between items-center gap-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-[#A53860] border border-[#A53860] flex items-center justify-center text-white shrink-0 font-serif italic text-xl font-bold shadow-sm">
            {fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-serif italic text-[#450920] font-bold flex items-center gap-2">
              Welcome, {fullName}
            </h3>
            <p className="text-xs text-[#450920] font-semibold leading-relaxed font-sans mt-0.5">
              Securely configure your physiological baseline calibrations, verify your fallback contact templates, and adjust hardware sync priorities.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-[#F5EBE0] border border-[#f0c39c] px-4 py-2 rounded-xl shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-[#A53860] animate-pulse"></span>
          <span className="text-[10px] font-mono text-[#450920] font-bold uppercase tracking-widest">
            Crypt Shield Active
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: User Form & System Tweaks (8 spans) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Form */}
          <div className="p-6 rounded-2xl bg-[#F9DBBD] border border-[#f0c39c] shadow-sm">
            <h3 className="text-sm font-bold text-[#450920] uppercase tracking-wider mb-6 flex items-center gap-1.5 font-mono">
              <Settings className="w-4 h-4 text-[#A53860]" />
              Secure Profile & Identity Registry
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full name input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-[#450920] font-bold block">
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-white border border-[#f0c39c] focus:border-[#A53860] p-3 rounded-xl text-[#450920] font-bold text-xs font-sans focus:outline-none transition-all shadow-sm"
                    required
                  />
                </div>

                {/* Primary phone input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-[#450920] font-bold block">
                    Registered Contact Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white border border-[#f0c39c] focus:border-[#A53860] p-3 rounded-xl text-[#450920] font-bold text-xs font-sans focus:outline-none transition-all shadow-sm"
                    required
                  />
                </div>

                {/* Blood Group */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-[#450920] font-bold block">
                    Blood Group
                  </label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full bg-white border border-[#f0c39c] focus:border-[#A53860] p-3 rounded-xl text-[#450920] font-bold text-xs font-sans focus:outline-none transition-all shadow-sm"
                  >
                    <option value="A Positive (A+)">A Positive (A+)</option>
                    <option value="A Negative (A-)">A Negative (A-)</option>
                    <option value="B Positive (B+)">B Positive (B+)</option>
                    <option value="O Positive (O+)">O Positive (O+)</option>
                    <option value="O Negative (O-)">O Negative (O-)</option>
                    <option value="AB Positive (AB+)">AB Positive (AB+)</option>
                  </select>
                </div>

                {/* Emergency Health ID */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-[#450920] font-bold block">
                    Government Health / Emergency Card ID
                  </label>
                  <input
                    type="text"
                    value={emergencyId}
                    onChange={(e) => setEmergencyId(e.target.value)}
                    className="w-full bg-white border border-[#f0c39c] focus:border-[#A53860] p-3 rounded-xl text-[#450920] font-bold text-xs font-sans focus:outline-none transition-all shadow-sm"
                    required
                  />
                </div>
              </div>

              {/* Critical Medical Notes */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-[#450920] font-bold block">
                  Critical Medical Notes (Transmitted on Level 3 SOS)
                </label>
                <textarea
                  value={medicalNotes}
                  onChange={(e) => setMedicalNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-white border border-[#f0c39c] focus:border-[#A53860] p-3 rounded-xl text-[#450920] font-bold text-xs font-sans focus:outline-none transition-all resize-none shadow-sm"
                  placeholder="e.g. Diabetic, takes insulin, allergic to penicillin..."
                ></textarea>
              </div>

              {/* Custom SMS template payload */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-[#450920] font-bold block">
                  Emergency SMS Dispatch Broadcast Template
                </label>
                <textarea
                  value={customSOSMessage}
                  onChange={(e) => setCustomSOSMessage(e.target.value)}
                  rows={3}
                  className="w-full bg-white border border-[#f0c39c] focus:border-[#A53860] p-3 rounded-xl text-[#450920] font-bold text-[11px] font-sans focus:outline-none transition-all resize-none leading-relaxed shadow-sm"
                  placeholder="Draft emergency message template..."
                ></textarea>
              </div>

              {/* Save profile CTAs */}
              <div className="flex items-center justify-between pt-2 border-t border-[#f0c39c]">
                <span className="text-[10px] text-[#450920] font-bold font-mono">
                  All updates remain strictly secure on local Sandbox contexts.
                </span>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#A53860] text-white hover:bg-[#8c2e50] text-xs uppercase font-bold tracking-widest rounded-full transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {isSaved ? <Check className="w-3.5 h-3.5" /> : null}
                  {isSaved ? 'Identity Saved' : 'Save Secure Registry'}
                </button>
              </div>

            </form>
          </div>

          {/* RECHARTS WEARABLE SAFETY & STRESS TRENDS CHART */}
          <div className="p-6 rounded-2xl bg-[#F9DBBD] border border-[#f0c39c] shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#f0c39c] pb-4">
              <div>
                <h3 className="text-sm font-bold text-[#450920] uppercase tracking-wider flex items-center gap-2 font-mono">
                  <TrendingUp className="w-4 h-4 text-[#A53860]" />
                  Wearable Biometric Trends
                </h3>
                <p className="text-[11px] text-[#450920] font-bold mt-0.5">
                  Weekly average safety index vs. stress metrics from wearable band telemetry
                </p>
              </div>

              {/* Timeframe toggle buttons */}
              <div className="flex bg-[#F5EBE0] p-1 rounded-xl border border-[#f0c39c]">
                <button
                  type="button"
                  onClick={() => setTrendTimeframe('weekly')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider font-bold transition-all cursor-pointer ${
                    trendTimeframe === 'weekly'
                      ? 'bg-[#A53860] text-white shadow-sm'
                      : 'text-[#450920] hover:bg-[#FFA5AB]/30'
                  }`}
                >
                  7 Days View
                </button>
                <button
                  type="button"
                  onClick={() => setTrendTimeframe('monthly')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider font-bold transition-all cursor-pointer ${
                    trendTimeframe === 'monthly'
                      ? 'bg-[#A53860] text-white shadow-sm'
                      : 'text-[#450920] hover:bg-[#FFA5AB]/30'
                  }`}
                >
                  Monthly View
                </button>
              </div>
            </div>

            {/* Metric Summary Cards Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Avg Safety Score */}
              <div className="p-4 rounded-xl bg-[#F5EBE0] border border-[#f0c39c] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-[#FFA5AB] text-[#450920]">
                    <ShieldCheck className="w-5 h-5 font-bold" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-[#450920] uppercase tracking-wider font-bold block">
                      Avg Safety Score
                    </span>
                    <span className="text-xs text-[#450920] font-semibold">
                      {trendTimeframe === 'weekly' ? 'Past 7 Days' : '4 Weeks Average'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold font-mono text-[#A53860]">{avgSafety}%</span>
                  <span className="text-[9px] font-mono text-[#450920] font-bold block uppercase">Optimal</span>
                </div>
              </div>

              {/* Avg Stress Score */}
              <div className="p-4 rounded-xl bg-[#F5EBE0] border border-[#f0c39c] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-[#FFA5AB] text-[#450920]">
                    <HeartPulse className="w-5 h-5 font-bold" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-[#450920] uppercase tracking-wider font-bold block">
                      Avg Stress Level
                    </span>
                    <span className="text-xs text-[#450920] font-semibold">
                      {trendTimeframe === 'weekly' ? 'Past 7 Days' : '4 Weeks Average'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold font-mono text-[#A53860]">{avgStress}%</span>
                  <span className="text-[9px] font-mono text-[#450920] font-bold block uppercase">Low Risk</span>
                </div>
              </div>

            </div>

            {/* RECHARTS AREA CHART */}
            <div className="p-4 rounded-xl bg-white border border-[#f0c39c] space-y-2 shadow-sm">
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activeTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSafety" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#A53860" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#A53860" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="colorStress" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FFA5AB" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#FFA5AB" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="#f0c39c" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#450920" 
                      fontSize={11} 
                      fontWeight="bold"
                      tickLine={false} 
                      axisLine={{ stroke: '#f0c39c' }} 
                    />
                    <YAxis 
                      stroke="#450920" 
                      fontSize={11} 
                      fontWeight="bold"
                      tickLine={false} 
                      axisLine={{ stroke: '#f0c39c' }} 
                      domain={[0, 100]} 
                      ticks={[0, 25, 50, 75, 100]}
                      unit="%"
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      wrapperStyle={{ paddingTop: '10px', fontSize: '11px', fontFamily: 'sans-serif', fontWeight: 'bold', color: '#450920' }}
                      iconType="circle"
                    />

                    <Area
                      type="monotone"
                      dataKey="safetyScore"
                      name="Safety Index (%)"
                      stroke="#A53860"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorSafety)"
                    />
                    <Area
                      type="monotone"
                      dataKey="stressScore"
                      name="Stress Metric (%)"
                      stroke="#e11d48"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorStress)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Chart Footer Insights */}
              <div className="flex flex-wrap items-center justify-between text-[10px] font-mono text-[#450920] font-bold pt-2 border-t border-[#f0c39c] gap-2">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#A53860]" />
                  Wearable AI Analysis: High safety correlation with well-lit metro corridors.
                </span>
                <span className="text-[#A53860] font-bold">Sync: Live IoT Stream Active</span>
              </div>
            </div>

          </div>

          {/* Wearable Configuration Section */}
          <div className="p-6 rounded-2xl bg-[#F9DBBD] border border-[#f0c39c] shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-[#450920] uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Activity className="w-4 h-4 text-[#A53860]" />
              IoT Wearable Calibration Adjustments
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Heart rate parameters */}
              <div className="p-4 rounded-xl bg-[#F5EBE0] border border-[#f0c39c] space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-[#450920] uppercase tracking-wide">Base Pulse Reference</h4>
                    <p className="text-[10px] text-[#450920] font-medium mt-0.5">Used to isolate spikes and panic score indexes</p>
                  </div>
                  <button
                    onClick={handleCalibrateBaseHeartRate}
                    disabled={isCalibrating}
                    className="p-1.5 rounded-lg bg-white hover:bg-[#FFA5AB]/20 text-[#450920] border border-[#f0c39c] transition-all cursor-pointer flex items-center gap-1 text-[9px] font-mono uppercase font-bold shadow-sm"
                  >
                    <RefreshCw className={`w-3 h-3 text-[#A53860] ${isCalibrating ? 'animate-spin' : ''}`} />
                    {isCalibrating ? 'Scanning...' : 'Calibrate'}
                  </button>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-xs text-[#450920] font-bold font-mono">Calibrated Baseline:</span>
                  <span className="text-xl font-bold text-[#A53860] font-mono">
                    {metrics.baseHeartRate} <span className="text-xs text-[#450920] font-sans">bpm</span>
                  </span>
                </div>
              </div>

              {/* Sensitivity adjusters */}
              <div className="p-4 rounded-xl bg-[#F5EBE0] border border-[#f0c39c] space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-[#450920] uppercase tracking-wide">Accelerometer Fall G-Limit</h4>
                  <p className="text-[10px] text-[#450920] font-medium mt-0.5">Toggles threshold severity required to register falls</p>
                </div>
                
                <div className="flex bg-white p-1 rounded-lg border border-[#f0c39c]">
                  {(['low', 'medium', 'high'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFallSensitivity(s)}
                      className={`flex-1 text-[9px] uppercase tracking-wider py-1 rounded-md font-mono font-bold transition-all cursor-pointer ${
                        fallSensitivity === s 
                          ? 'bg-[#A53860] text-white shadow-sm' 
                          : 'text-[#450920] hover:bg-[#FFA5AB]/30'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Toggle options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#f0c39c]">
              
              {/* Vocal sensitivity option */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#F5EBE0] border border-[#f0c39c]">
                <div>
                  <span className="text-[10px] font-mono text-[#450920] font-bold uppercase block">Speech API Wake Trigger</span>
                  <span className="text-[11px] text-[#450920] font-sans font-semibold">Auto-restart listening loops</span>
                </div>
                <button
                  type="button"
                  onClick={() => setContinuousGPSMode(!continuousGPSMode)}
                  className="text-[#450920] transition-all cursor-pointer"
                >
                  {continuousGPSMode ? (
                    <ToggleRight className="w-7 h-7 text-[#A53860]" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-[#f0c39c]" />
                  )}
                </button>
              </div>

              {/* Siren override */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#F5EBE0] border border-[#f0c39c]">
                <div>
                  <span className="text-[10px] font-mono text-[#450920] font-bold uppercase block">Automated Audible Alarm</span>
                  <span className="text-[11px] text-[#450920] font-sans font-semibold">Beep local siren on level 3 SOS</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoSirenEnabled(!autoSirenEnabled)}
                  className="text-[#450920] transition-all cursor-pointer"
                >
                  {autoSirenEnabled ? (
                    <ToggleRight className="w-7 h-7 text-[#A53860]" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-[#f0c39c]" />
                  )}
                </button>
              </div>

            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: Interactive digital safety passcard HUD (4 spans) */}
        <div className="lg:col-span-4 space-y-6">
          
          <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-[#450920]">
            Digital Safety Passcard
          </h4>

          {/* Golden glow smart identity card mockup */}
          <div className="p-6 rounded-3xl border border-[#A53860] bg-[#450920] relative overflow-hidden shadow-lg space-y-6 flex flex-col justify-between min-h-[360px]">
            {/* Scanner line */}
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#FFA5AB] to-transparent animate-pulse-slow"></div>
            
            {/* Card Header */}
            <div className="flex justify-between items-start">
              <div className="space-y-0.5">
                <span className="text-[8px] font-mono uppercase tracking-[0.25em] text-[#FFA5AB] font-bold block">
                  NARI Emergency Card
                </span>
                <span className="text-[7px] font-mono uppercase tracking-widest text-white/70 font-semibold block">
                  ACTIVE SATELLITE NODE
                </span>
              </div>
              <div className="w-6 h-6 rounded bg-[#A53860] border border-[#FFA5AB] flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-white" />
              </div>
            </div>

            {/* Chip/Fingerprint indicator */}
            <div className="flex items-center justify-between">
              <div className="w-8 h-6 rounded bg-[#A53860] border border-[#FFA5AB] flex items-center justify-center">
                <div className="w-5 h-3 border border-white/60 rounded-sm"></div>
              </div>
              <span className="text-[9px] font-mono text-[#F5EBE0] font-bold tracking-widest">
                ID: {emergencyId}
              </span>
            </div>

            {/* Main content body */}
            <div className="space-y-4 pt-4 border-t border-white/20">
              <div>
                <span className="text-[8px] font-mono uppercase tracking-widest text-white/60 font-bold block leading-none">
                  HOLDER NAME
                </span>
                <h4 className="text-base font-serif italic font-bold text-white mt-1">
                  {fullName}
                </h4>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[8px] font-mono uppercase tracking-widest text-white/60 font-bold block leading-none">
                    BLOOD REGISTER
                  </span>
                  <span className="text-[10px] font-mono text-[#FFA5AB] font-bold block mt-1">
                    {bloodGroup.split(' ')[0]}
                  </span>
                </div>
                <div>
                  <span className="text-[8px] font-mono uppercase tracking-widest text-white/60 font-bold block leading-none">
                    EMERGENCY PHONE
                  </span>
                  <span className="text-[10px] font-mono text-white font-bold block mt-1">
                    {phone}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer with GPS barcode representation */}
            <div className="space-y-2 pt-3 border-t border-white/20">
              <div className="flex justify-between text-[7px] font-mono text-white/70 font-semibold">
                <span>WAKEWORD: "NARI HELP"</span>
                <span>SECURE-ECC</span>
              </div>
              
              {/* Barcode lines */}
              <div className="h-4 flex items-center gap-0.5 opacity-80">
                <div className="w-[2px] h-full bg-white"></div>
                <div className="w-[1px] h-full bg-white"></div>
                <div className="w-[3px] h-full bg-white"></div>
                <div className="w-[1px] h-full bg-white"></div>
                <div className="w-[1px] h-full bg-white"></div>
                <div className="w-[4px] h-full bg-white"></div>
                <div className="w-[2px] h-full bg-white"></div>
                <div className="w-[1px] h-full bg-white"></div>
                <div className="w-[1px] h-full bg-white"></div>
                <div className="w-[3px] h-full bg-white"></div>
                <div className="w-[2px] h-full bg-white"></div>
                <div className="w-[1px] h-full bg-white"></div>
                <div className="w-[5px] h-full bg-[#FFA5AB]"></div>
                <div className="w-[2px] h-full bg-white"></div>
                <div className="w-[1px] h-full bg-white"></div>
                <div className="w-[3px] h-full bg-white"></div>
                <div className="w-[1px] h-full bg-white"></div>
                <div className="w-[4px] h-full bg-white"></div>
                <div className="w-[2px] h-full bg-white"></div>
                <div className="w-[1px] h-full bg-white"></div>
                <div className="w-[3px] h-full bg-white"></div>
                <div className="w-[1px] h-full bg-white"></div>
              </div>
            </div>

          </div>

          {/* Quick tips */}
          <div className="p-4 rounded-xl bg-[#F9DBBD] border border-[#f0c39c] space-y-3 text-xs">
            <h4 className="text-xs font-serif italic font-bold text-[#A53860]">
              Simulated Safety Hardware Pairing
            </h4>
            <p className="text-[11px] text-[#450920] font-semibold leading-relaxed font-sans">
              NARI utilizes advanced secure peer-to-peer data transport logic. Your health identity credentials are encrypted before being pushed out to local regional guardian directories.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
