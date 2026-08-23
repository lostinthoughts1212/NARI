/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, 
  Activity, 
  Cpu, 
  RotateCcw, 
  AlertOctagon, 
  Wifi, 
  Battery, 
  Lock, 
  BellRing, 
  TrendingUp, 
  Smartphone,
  Play,
  Square
} from 'lucide-react';
import { IoTMetrics } from '../types';

interface IoTWearableSimulatorProps {
  metrics: IoTMetrics;
  setMetrics: React.Dispatch<React.SetStateAction<IoTMetrics>>;
  onAutoTriggerSOS: (cause: string) => void;
  isSOSActive: boolean;
}

export default function IoTWearableSimulator({ 
  metrics, 
  setMetrics, 
  onAutoTriggerSOS,
  isSOSActive
}: IoTWearableSimulatorProps) {
  const [simulationState, setSimulationState] = useState<'resting' | 'anxious' | 'fall'>('resting');
  const [pulseScale, setPulseScale] = useState<number>(1);
  const [isLiveSimulating, setIsLiveSimulating] = useState<boolean>(true);
  const triggerRef = useRef<boolean>(false);

  // Monitor stress levels dynamically and trigger SOS if panic score peaks OR fall detected
  useEffect(() => {
    if (metrics.panicScore >= 90 && !isSOSActive && !triggerRef.current) {
      triggerRef.current = true;
      onAutoTriggerSOS(`Critical physiological stress threshold breached (Score: ${metrics.panicScore}%)`);
    } else if (metrics.fallDetected && !isSOSActive && !triggerRef.current) {
      triggerRef.current = true;
      onAutoTriggerSOS("High impact accelerometer crash (Sudden Fall Event)");
    }

    if (!isSOSActive) {
      triggerRef.current = false;
    }
  }, [metrics.panicScore, metrics.fallDetected, isSOSActive, onAutoTriggerSOS]);

  // Handle pulse scale animation synced with heart rate
  useEffect(() => {
    const pulseInterval = setInterval(() => {
      setPulseScale(1.15);
      setTimeout(() => setPulseScale(1), 150);
    }, (65 * 1000) / metrics.heartRate);

    return () => clearInterval(pulseInterval);
  }, [metrics.heartRate]);

  // Active fluctuating telemetry state simulation
  useEffect(() => {
    if (!isLiveSimulating) return;

    const stream = setInterval(() => {
      setMetrics((prev) => {
        let hrFluctuation = 0;
        let accelFluct = { x: 0.05, y: 0.05, z: 0.98 };

        if (simulationState === 'resting') {
          // Idle state
          hrFluctuation = (Math.random() - 0.5) * 3;
          const targetHR = 72;
          const hrDiff = targetHR - prev.heartRate;
          accelFluct = {
            x: Number(((Math.random() - 0.5) * 0.1).toFixed(2)),
            y: Number(((Math.random() - 0.5) * 0.1).toFixed(2)),
            z: Number((0.95 + (Math.random() - 0.5) * 0.1).toFixed(2)),
          };
          
          const newHR = Math.max(60, Math.min(85, prev.heartRate + hrFluctuation + hrDiff * 0.1));
          return {
            ...prev,
            heartRate: Math.round(newHR),
            accelX: accelFluct.x,
            accelY: accelFluct.y,
            accelZ: accelFluct.z,
            fallDetected: false,
            panicScore: Math.round(Math.max(10, Math.min(40, prev.panicScore + (Math.random() - 0.5) * 5))),
            batteryPercent: Math.max(1, prev.batteryPercent - (Math.random() > 0.98 ? 1 : 0))
          };
        } else if (simulationState === 'anxious') {
          // Intense cardiovascular adrenaline stress simulation
          hrFluctuation = (Math.random() - 0.5) * 4 + 1.2;
          const targetHR = 138; // Breaches trigger thresholds
          const hrDiff = targetHR - prev.heartRate;
          accelFluct = {
            x: Number(((Math.random() - 0.5) * 0.8).toFixed(2)),
            y: Number(((Math.random() - 0.5) * 0.8).toFixed(2)),
            z: Number((1.2 + (Math.random() - 0.5) * 0.5).toFixed(2)),
          };

          const newHR = Math.max(80, Math.min(150, prev.heartRate + hrFluctuation + hrDiff * 0.08));
          return {
            ...prev,
            heartRate: Math.round(newHR),
            accelX: accelFluct.x,
            accelY: accelFluct.y,
            accelZ: accelFluct.z,
            fallDetected: false,
            panicScore: Math.round(Math.max(50, Math.min(95, prev.panicScore + (Math.random() - 0.2) * 4))),
            batteryPercent: Math.max(1, prev.batteryPercent - (Math.random() > 0.95 ? 1 : 0))
          };
        } else {
          // Fall Event
          return {
            ...prev,
            heartRate: 142,
            accelX: 5.6,
            accelY: -4.8,
            accelZ: -1.2,
            fallDetected: true,
            panicScore: 98
          };
        }
      });
    }, 1200);

    return () => clearInterval(stream);
  }, [simulationState, isLiveSimulating, setMetrics]);

  // Set preset simulation profiles
  const handleSetPreset = (preset: 'resting' | 'anxious' | 'fall') => {
    setSimulationState(preset);
    if (preset === 'resting') {
      setMetrics(prev => ({
        ...prev,
        heartRate: 72,
        fallDetected: false,
        panicScore: 15,
        accelX: 0.02,
        accelY: -0.01,
        accelZ: 0.98
      }));
    } else if (preset === 'anxious') {
      setMetrics(prev => ({
        ...prev,
        heartRate: 110,
        fallDetected: false,
        panicScore: 65,
        accelX: 0.45,
        accelY: 0.62,
        accelZ: 1.15
      }));
    } else if (preset === 'fall') {
      setMetrics(prev => ({
        ...prev,
        heartRate: 135,
        fallDetected: true,
        panicScore: 95,
        accelX: 6.8,
        accelY: -5.4,
        accelZ: -1.5
      }));
    }
  };

  return (
    <div className="glass-card rounded-2xl border border-white/5 p-6 shadow-2xl transition-all duration-300 flex flex-col justify-between h-full" id="iot-wearable-panel">
      
      {/* Wearable Connection Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h3 className="text-sm font-bold text-[#111827] tracking-wide uppercase font-mono">
              NARI Wearable V1
            </h3>
          </div>
          <p className="text-[10px] text-[#374151] font-bold font-mono mt-0.5">Device ID: NARI-7049-BLE</p>
        </div>

        <div className="flex items-center gap-3 bg-[#fff6f0] border border-[#ffe4d6] px-2.5 py-1 rounded-lg">
          <div className="flex items-center gap-1">
            <Wifi className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[10px] font-mono font-bold text-[#111827]">Live BLE</span>
          </div>
          <div className="w-[1px] h-3 bg-[#ffe4d6]"></div>
          <div className="flex items-center gap-1">
            <Battery className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-[10px] font-mono font-bold text-[#111827]">{metrics.batteryPercent}%</span>
          </div>
        </div>
      </div>

      {/* Visual Render of Wristband Dial */}
      <div className="my-2 flex flex-col items-center">
        <div className="relative w-44 h-44 rounded-full border border-[#C5A059]/20 flex flex-col items-center justify-center bg-gradient-to-b from-[#121212] to-[#0a0a0a] shadow-inner font-sans glow-gold">
          
          {/* Radial Ring Decorators */}
          <div className="absolute inset-2 rounded-full border border-[#C5A059]/10 pointer-events-none animate-pulse-slow"></div>
          <div className="absolute inset-5 rounded-full border border-white/5 pointer-events-none"></div>

          {/* HR Core heart icon pulse */}
          <div className="relative z-10 flex flex-col items-center">
            <Heart 
              className="w-8 h-8 text-[#C5A059] fill-[#C5A059] transition-all duration-200"
              style={{ transform: `scale(${pulseScale})` }}
            />
            <span className="text-3xl font-black text-white font-mono tracking-tighter mt-1">
              {metrics.heartRate}
            </span>
            <span className="text-[9px] text-white/80 font-mono uppercase tracking-widest font-semibold">
              BPM Telemetry
            </span>
          </div>

          {/* Small Secondary metrics within Ring */}
          <div className="absolute bottom-5 text-[9px] font-mono text-[#C5A059] uppercase tracking-wider font-semibold">
            STRESS: {metrics.panicScore}%
          </div>

          <div className="absolute top-5 text-[9px] font-mono text-[#ffe259] uppercase tracking-wider font-semibold">
            SPO2: {metrics.bloodOxygen}%
          </div>
        </div>
      </div>

      {/* Interactive Simulation Profiles Controller */}
      <div className="mt-4 p-4 rounded-xl border border-[#ffe4d6] bg-[#fff6f0]">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-bold text-[#111827] uppercase tracking-widest flex items-center gap-1.5 font-mono">
            <Cpu className="w-3.5 h-3.5 text-[#d97706]" />
            Scenario Presets
          </span>
          <button 
            onClick={() => setIsLiveSimulating(!isLiveSimulating)}
            className={`text-[9px] font-mono font-bold px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors ${
              isLiveSimulating ? 'bg-[#d97706]/10 text-[#b45309] border border-[#d97706]/30' : 'bg-slate-200 text-[#374151]'
            }`}
          >
            {isLiveSimulating ? 'Telemetric active' : 'Live frozen'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'resting', label: 'Resting', color: 'border-slate-200 bg-white text-[#374151]' },
            { id: 'anxious', label: 'Stalked/Panic', color: 'border-rose-200 bg-rose-50 text-rose-800' },
            { id: 'fall', label: 'Sudden Fall', color: 'border-amber-200 bg-amber-50 text-amber-900' }
          ].map(preset => (
            <button
              key={preset.id}
              onClick={() => handleSetPreset(preset.id as any)}
              className={`py-2 px-1 rounded-lg border text-[11px] font-bold text-center transition-all ${
                simulationState === preset.id 
                  ? 'border-[#d97706] ring-2 ring-[#d97706]/30 bg-white text-[#b45309]' 
                  : preset.color
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Manual slide override controllers */}
      <div className="mt-4 space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-[#111827] font-bold font-mono">
            <span>Override Heart Rate:</span>
            <span className={metrics.heartRate >= 120 ? 'text-red-600 font-bold' : 'text-[#374151] font-bold'}>
              {metrics.heartRate} BPM
            </span>
          </div>
          <input 
            type="range" 
            min="55" 
            max="160" 
            value={metrics.heartRate}
            onChange={(e) => {
              const hr = Number(e.target.value);
              setMetrics(prev => {
                // Approximate panic index based on heart rate
                let calculatedPanic = Math.max(10, Math.min(99, Math.round(((hr - 60) / 90) * 100)));
                return {
                  ...prev,
                  heartRate: hr,
                  panicScore: calculatedPanic
                };
              });
            }}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#d97706]"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-[#111827] font-bold font-mono">
            <span>Stress Panic Score:</span>
            <span className={metrics.panicScore >= 90 ? 'text-red-600 font-bold animate-pulse' : 'text-[#374151] font-bold'}>
              {metrics.panicScore}%
            </span>
          </div>
          <div className="relative">
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={metrics.panicScore}
              onChange={(e) => {
                const stress = Number(e.target.value);
                setMetrics(prev => ({
                  ...prev,
                  panicScore: stress
                }));
              }}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#d97706]"
            />
            {/* The threshold warning bar marker */}
            <div className="absolute right-[10%] -top-1 w-[2px] h-3 bg-red-600" title="Auto trigger SOS threshold (90%)"></div>
          </div>
        </div>

        {/* Accelerometer Telemetry Bar values */}
        <div className="p-3 rounded-xl bg-[#fff6f0] border border-[#ffe4d6] space-y-2 mt-2">
          <div className="flex justify-between items-center text-[10px] text-[#111827] font-bold font-mono border-b border-[#ffe4d6] pb-1">
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-[#d97706]" />
              G-FORCE TELEMETRY (Axis)
            </span>
            <span className={metrics.fallDetected ? 'text-red-600 font-bold' : 'text-[#374151] font-bold'}>
              {metrics.fallDetected ? 'CRASH DETECT' : 'NORMAL'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 font-mono text-[9px] text-center">
            <div className="bg-white p-1.5 rounded-lg border border-[#ffe4d6]">
              <span className="text-[#4B5563] font-bold block">X-FORCE</span>
              <span className="text-[#111827] font-bold">{metrics.accelX} g</span>
            </div>
            <div className="bg-white p-1.5 rounded-lg border border-[#ffe4d6]">
              <span className="text-[#4B5563] font-bold block">Y-FORCE</span>
              <span className="text-[#111827] font-bold">{metrics.accelY} g</span>
            </div>
            <div className="bg-white p-1.5 rounded-lg border border-[#ffe4d6]">
              <span className="text-[#4B5563] font-bold block">Z-FORCE</span>
              <span className="text-[#111827] font-bold">{metrics.accelZ} g</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
