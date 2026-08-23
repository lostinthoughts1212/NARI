/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  ShieldCheck, 
  Compass, 
  Siren, 
  Activity, 
  Users, 
  Zap, 
  PhoneCall, 
  Eye, 
  Sparkles,
  ArrowRight,
  TrendingUp,
  HeartHandshake,
  Flag,
  RadioTower,
  Lock,
  Camera
} from 'lucide-react';
import { motion } from 'motion/react';
import { FeatureGrid, FeatureItem } from './FeatureCard';
import { StatGrid, StatItem } from './StatCard';

interface LandingPageProps {
  onNavigateToLogin: () => void;
}

export default function LandingPage({ onNavigateToLogin }: LandingPageProps) {
  const features = [
    {
      icon: <Compass className="w-5 h-5 text-[#ff6b4a]" />,
      title: "AI Safe-Route Optimization",
      description: "Dynamically audits paths based on live crowd density levels, active streetlight coverage metrics, and verified community hazard alerts."
    },
    {
      icon: <Activity className="w-5 h-5 text-[#ff6b4a]" />,
      title: "Wristband Telemetry Integration",
      description: "Pairs with low-cost wearables to track real-time biometrics. Automatically triggers alerts if heart rate spikes or a fall is detected."
    },
    {
      icon: <Siren className="w-5 h-5 text-[#ff6b4a]" />,
      title: "Hands-Free Vocal SOS",
      description: "Powered by the Web Speech API. Instantly activates the emergency response workflow by simply speaking the safephrase 'NARI Help'."
    },
    {
      icon: <Users className="w-5 h-5 text-[#ff6b4a]" />,
      title: "Guardian Dispatch Network",
      description: "Pre-configured trusted emergency contacts are instantly messaged with a direct live-tracking secure GPS link upon distress triggers."
    }
  ];

  const statistics = [
    { value: "42s", label: "Avg. Guardian Response" },
    { value: "120+", label: "Cities & Routes Mapped" },
    { value: "3", label: "Escalation Tiers Per Incident" },
    { value: "99.9%", label: "Wearable Uptime" },
    { value: "0.8s", label: "Crisis Dispatch Latency" },
    { value: "98.4%", label: "Route Auditing Reliability" }
  ];

  const additionalFeatures: FeatureItem[] = [
    {
      icon: Flag,
      title: "Crowdsourced Hazard Reporting",
      description: "Community-verified alerts on unsafe zones, broken streetlights, and harassment hotspots — updated in real time by users nearby."
    },
    {
      icon: RadioTower,
      title: "Offline SMS Fallback",
      description: "Automatically switches to GSM-based SOS when internet is unavailable, ensuring alerts reach contacts even in dead zones."
    },
    {
      icon: Lock,
      title: "Duress Cancellation Code",
      description: "A hidden duress code lets you appear to cancel an alert under coercion while silently keeping escalation and tracking active."
    },
    {
      icon: Camera,
      title: "Evidence Auto-Capture",
      description: "Discreet audio recording and timestamped location logging begin the moment distress is detected — building a secure evidentiary trail."
    }
  ];

  const additionalStats: StatItem[] = [
    { number: "42s", label: "Avg. guardian response" },
    { number: "120+", label: "Cities & routes mapped" },
    { number: "3", label: "Escalation tiers per incident" },
    { number: "99.9%", label: "Wearable uptime" }
  ];

  return (
    <div className="min-h-screen bg-[#F5EBE0] text-[#450920] font-sans antialiased relative overflow-hidden" id="nari-landing-container">
      
      {/* Background Atmosphere Glow Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-[#A53860]/[0.08] blur-[140px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[500px] bg-[#FFA5AB]/[0.12] blur-[160px] rounded-full pointer-events-none"></div>
      
      {/* Landing Header Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-[#f0c39c] bg-[#F5EBE0]/95 backdrop-blur-md px-6 py-4 md:px-12 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#A53860] animate-pulse glow-primary"></div>
          <span className="text-lg md:text-xl font-serif tracking-tight text-[#450920] flex items-center gap-2 font-bold">
            NARI <span className="text-[10px] uppercase font-mono tracking-[0.2em] text-[#A53860] hidden sm:inline font-bold">Route Investigation</span>
          </span>
        </div>
        <button
          onClick={onNavigateToLogin}
          className="px-5 py-2 bg-[#A53860] text-white font-bold text-[10px] uppercase tracking-widest rounded-full hover:bg-[#8c2e50] transition-all cursor-pointer shadow-sm"
        >
          Access Portal
        </button>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-16 px-6 md:px-12 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* Top Tag */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 bg-[#F9DBBD] border border-[#f0c39c] px-4 py-1.5 rounded-full mb-8 text-[10px] uppercase tracking-[0.2em] text-[#A53860] font-bold shadow-sm"
        >
          <Sparkles className="w-3 h-3 text-[#A53860] animate-pulse" />
          Next-generation AI Powered Route Investigation
        </motion.div>

        {/* Headline */}
        <motion.h1 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-4xl sm:text-6xl lg:text-7xl font-serif tracking-tight text-[#450920] mb-6 leading-tight max-w-5xl font-bold"
        >
          NARI <br />
          <span className="italic text-[#A53860] font-medium font-serif">Intelligent. Autonomous. Peerless.</span>
        </motion.h1>

        {/* Sub-headline */}
        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-sm sm:text-base text-[#450920] max-w-2xl leading-relaxed mb-10 font-sans font-semibold"
        >
          NARI is an ecosystem pairing AI-optimized safe routing, instant local micro-alarms, and smart wearable biometrics to protect, identify, and securely coordinate crisis responses in real time.
        </motion.p>

        {/* Call to Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-4 mb-16"
        >
          <button
            onClick={onNavigateToLogin}
            className="w-full sm:w-auto px-8 py-4 bg-[#A53860] text-white font-bold text-xs uppercase tracking-widest rounded-full hover:bg-[#8c2e50] transition-all flex items-center justify-center gap-2.5 shadow-md group cursor-pointer"
          >
            Access Safety Console
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
          <a
            href="#features-section"
            className="w-full sm:w-auto px-8 py-4 bg-[#FFA5AB] border border-[#f0c39c] text-[#450920] font-bold text-xs uppercase tracking-widest rounded-full hover:bg-[#f78d94] transition-all text-center cursor-pointer shadow-sm"
          >
            Explore System Core
          </a>
        </motion.div>

        {/* Visual Teaser Card */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="w-full max-w-4xl rounded-2xl border border-[#f0c39c] bg-[#F9DBBD] p-6 md:p-8 shadow-md relative"
        >
          {/* Subtle Top bar */}
          <div className="flex items-center justify-between border-b border-[#f0c39c] pb-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#A53860] animate-pulse"></span>
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#450920] font-bold">Active HUD Preview</span>
            </div>
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#A53860]"></div>
              <div className="w-2 h-2 rounded-full bg-[#FFA5AB]"></div>
              <div className="w-2 h-2 rounded-full bg-[#f0c39c]"></div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {/* Safe Map Teaser */}
            <div className="p-4 rounded-xl bg-[#F5EBE0] border border-[#f0c39c] space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[9px] uppercase font-mono text-[#450920] font-bold">Streetlight Audit</span>
                <span className="text-[10px] text-[#A53860] font-mono font-bold">92% SAFE</span>
              </div>
              <div className="h-28 bg-[#F9DBBD] rounded-lg relative overflow-hidden flex items-center justify-center border border-[#f0c39c]">
                {/* Simulated Grid Map */}
                <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 opacity-25">
                  <div className="border border-[#A53860]/20"></div><div className="border border-[#A53860]/20"></div><div className="border border-[#A53860]/20"></div>
                  <div className="border border-[#A53860]/20"></div><div className="border border-[#A53860]/20"></div><div className="border border-[#A53860]/20"></div>
                </div>
                {/* Interactive glow nodes */}
                <div className="absolute w-2 h-2 rounded-full bg-[#A53860] blur-[2px] top-1/3 left-1/4 animate-pulse"></div>
                <div className="absolute w-24 h-1 bg-[#A53860] opacity-80 rotate-12"></div>
                <div className="absolute w-2 h-2 rounded-full bg-[#A53860] top-1/2 left-2/3"></div>
                <span className="text-[10px] font-mono text-[#A53860] uppercase tracking-widest font-bold relative z-10">Route Optimal</span>
              </div>
              <p className="text-[10px] text-[#450920] leading-normal font-medium">
                Audits real-time paths avoiding reported dark spots, unmonitored back alleys, or active crowd disturbances.
              </p>
            </div>

            {/* Wearable Biometrics Teaser */}
            <div className="p-4 rounded-xl bg-[#F5EBE0] border border-[#f0c39c] space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[9px] uppercase font-mono text-[#450920] font-bold">Stress Telemetry</span>
                <span className="text-[10px] text-[#A53860] font-mono font-bold animate-pulse">SYS ARMED</span>
              </div>
              <div className="h-28 bg-[#F9DBBD] rounded-lg relative overflow-hidden flex flex-col justify-center px-4 border border-[#f0c39c] space-y-1">
                <span className="text-[9px] font-mono text-[#450920] uppercase leading-none font-bold">Simulated Vital Pulse</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-serif font-bold text-[#450920] animate-pulse">138</span>
                  <span className="text-[10px] font-mono text-[#A53860] uppercase font-bold">bpm</span>
                </div>
                {/* Mini chart line */}
                <div className="h-6 w-full flex items-end gap-0.5 opacity-90">
                  <div className="w-1/12 h-3 bg-[#A53860] rounded-sm"></div>
                  <div className="w-1/12 h-4 bg-[#A53860] rounded-sm"></div>
                  <div className="w-1/12 h-8 bg-[#A53860] rounded-sm"></div>
                  <div className="w-1/12 h-5 bg-[#A53860] rounded-sm"></div>
                  <div className="w-1/12 h-10 bg-[#A53860] rounded-sm animate-pulse"></div>
                  <div className="w-1/12 h-14 bg-[#A53860] rounded-sm animate-pulse"></div>
                  <div className="w-1/12 h-12 bg-[#A53860] rounded-sm"></div>
                  <div className="w-1/12 h-16 bg-[#A53860] rounded-sm animate-pulse"></div>
                </div>
              </div>
              <p className="text-[10px] text-[#450920] leading-normal font-medium">
                Detects anomalies instantly using heart rate thresholds and high-G accelerometry fall sensors.
              </p>
            </div>

            {/* Vocal dispatch teaser */}
            <div className="p-4 rounded-xl bg-[#F5EBE0] border border-[#f0c39c] space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[9px] uppercase font-mono text-[#450920] font-bold">Voice Wake Detection</span>
                <span className="text-[10px] text-[#A53860] font-mono font-bold">STANDBY</span>
              </div>
              <div className="h-28 bg-[#F9DBBD] rounded-lg relative overflow-hidden flex flex-col justify-center items-center px-4 border border-[#f0c39c] space-y-2">
                <div className="w-10 h-10 rounded-full bg-[#A53860]/15 border border-[#A53860]/40 flex items-center justify-center animate-pulse">
                  <Siren className="w-4 h-4 text-[#A53860]" />
                </div>
                <span className="text-[9px] font-mono text-[#450920] uppercase tracking-widest text-center leading-none font-bold">
                  Say "NARI Help"
                </span>
                <span className="text-[8px] text-[#450920] font-mono font-bold">Microphone ready</span>
              </div>
              <p className="text-[10px] text-[#450920] leading-normal font-medium">
                Leverages local machine learning heuristics via browser Web Speech API to provide seamless, hands-free operation.
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Core Platform Pillars (Features List) */}
      <section id="features-section" className="py-20 px-6 md:px-12 bg-[#F9DBBD]/50 border-y border-[#f0c39c]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <span className="text-[10px] font-mono text-[#A53860] uppercase tracking-[0.2em] font-bold block">
              Architectural Specifications
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif tracking-tight text-[#450920] font-bold">
              Securing urban movement through intelligent design
            </h2>
            <p className="text-xs sm:text-sm text-[#450920] max-w-xl mx-auto font-medium">
              NARI integrates hardware triggers and spatial intelligence databases to bypass traditional bottleneck delays during emergency situations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="p-6 rounded-2xl bg-[#F9DBBD] border border-[#f0c39c] hover:border-[#A53860] transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-md"
              >
                <div className="space-y-4">
                  <div className="p-3 bg-[#F5EBE0] w-fit rounded-xl border border-[#f0c39c] text-[#A53860]">
                    {feature.icon}
                  </div>
                  <h3 className="text-base font-serif italic text-[#450920] font-bold">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-[#450920] leading-relaxed font-medium">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Second Row of Feature Cards */}
          <div className="pt-6 border-t border-[#f0c39c]">
            <FeatureGrid 
              features={additionalFeatures} 
              subtitle="Advanced Protocol Modules"
            />
          </div>
        </div>
      </section>

      {/* Hard Statistics Proof Section */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto space-y-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {statistics.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="text-center p-6 border border-[#f0c39c] rounded-2xl bg-[#F9DBBD] shadow-sm"
            >
              <h4 className="text-4xl sm:text-5xl font-serif text-[#A53860] font-bold tracking-tight mb-2">
                {stat.value}
              </h4>
              <p className="text-[10px] uppercase font-mono tracking-widest text-[#450920] font-bold">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Second Row of Stat Cards */}
        <div className="pt-6 border-t border-[#f0c39c]">
          <StatGrid 
            stats={additionalStats} 
            title="System Benchmark Reliability Metrics"
          />
        </div>
      </section>

      {/* Safety Matrix Action Teaser */}
      <section className="py-16 px-6 md:px-12 bg-[#F9DBBD] border-t border-[#f0c39c]">
        <div className="max-w-4xl mx-auto rounded-3xl bg-[#F5EBE0] border border-[#f0c39c] p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-md">
          <div className="space-y-3 max-w-lg z-10">
            <h3 className="text-2xl sm:text-3xl font-serif text-[#450920] font-bold">
              Ready to initialize your secure dashboard session?
            </h3>
            <p className="text-xs text-[#450920] leading-relaxed font-medium">
              Deploy your local simulated wearable nodes, audit active safety pathways, and verify automated crisis dispatches immediately inside our comprehensive platform simulator.
            </p>
          </div>

          <button
            onClick={onNavigateToLogin}
            className="w-full md:w-auto shrink-0 px-8 py-4 bg-[#A53860] text-white font-bold text-xs uppercase tracking-widest rounded-full transition-all flex items-center justify-center gap-2 shadow-sm z-10 cursor-pointer hover:bg-[#8c2e50]"
          >
            Access Portal
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

    </div>
  );
}
