/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  MessageSquare, 
  ShieldCheck, 
  AlertTriangle, 
  Siren, 
  ThumbsUp, 
  PlusCircle, 
  Search, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Send, 
  User, 
  ShieldAlert,
  Sparkles,
  Info,
  Phone,
  Building2,
  Radio,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';
import { FeedbackReport, FeedbackCategory, PoliceStationInfo } from '../types';

interface FeedbackComplaintsSectionProps {
  currentUser: string;
}

// Live directory of nearest Police Stations and Women Safety Cells
const NEARBY_POLICE_STATIONS: PoliceStationInfo[] = [
  {
    id: 'ps-north',
    name: 'North District Women Special Safety Cell',
    distance: '0.8 km away',
    jurisdiction: 'Sector 4-12 Corridor & Metro Underpasses',
    phone: '011-2764-9100',
    pcrUnit: 'PCR Delta-04 (Patrolling)',
    isWomenSafetyDeskActive: true,
    status: 'Online & Patrolling'
  },
  {
    id: 'ps-transit',
    name: 'Central Metro & Transit Police Sub-Station',
    distance: '1.2 km away',
    jurisdiction: 'Interchange Metro Gates 1-6 & Bus Terminal',
    phone: '011-2334-1091',
    pcrUnit: 'PCR Echo-02 (Assigned)',
    isWomenSafetyDeskActive: true,
    status: 'Duty Desk Active'
  },
  {
    id: 'ps-pink',
    name: 'Sector 14 Pink Police Post (All-Women Station)',
    distance: '1.5 km away',
    jurisdiction: 'Commercial Market Ring & Student Coaching Hub',
    phone: '1091 (Direct)',
    pcrUnit: 'Pink Scooty Patrol Unit #03',
    isWomenSafetyDeskActive: true,
    status: 'Online & Patrolling'
  },
  {
    id: 'ps-hq',
    name: 'South-East District Police HQ & Cyber Cell',
    distance: '2.6 km away',
    jurisdiction: 'Tech Park Institutional Area & Outer Ring',
    phone: '011-2651-8890',
    pcrUnit: 'PCR Bravo-08 (Assigned)',
    isWomenSafetyDeskActive: true,
    status: 'Duty Desk Active'
  }
];

export default function FeedbackComplaintsSection({ currentUser }: FeedbackComplaintsSectionProps) {
  // Initial seed feedback & complaints reports with police dispatch links
  const [reports, setReports] = useState<FeedbackReport[]>([
    {
      id: 'fb-101',
      author: 'Priya Verma',
      location: 'Central Metro Exit 3 Underpass',
      category: 'emergency',
      title: 'Urgent: Active Stalking & Unlit Corridor',
      content: 'A group of suspicious individuals following women coming out of Metro Gate 3 after 9 PM. Immediate PCR van patrolling requested.',
      timestamp: '12 mins ago',
      upvotes: 38,
      status: 'Dispatched',
      isAnonymous: false,
      policeStation: {
        name: 'North District Women Special Safety Cell',
        distance: '0.8 km',
        token: 'POL-FIR-2026-8942',
        pcrAssigned: 'PCR Delta-04',
        contactNumber: '011-2764-9100',
        dispatchStatus: 'Dispatched to PCR'
      }
    },
    {
      id: 'fb-102',
      author: 'Meera K. (Anonymous)',
      location: 'South Boulevard Bus Shelter',
      category: 'warning',
      title: 'Streetlights Flickering & Poor CCTV Coverage',
      content: 'The streetlights near the Bus Stop #14 keep shutting off, leaving a 200m stretch in darkness. Needs municipal and station patrol audit.',
      timestamp: '45 mins ago',
      upvotes: 24,
      status: 'Under Review',
      isAnonymous: true,
      policeStation: {
        name: 'Sector 14 Pink Police Post (All-Women Station)',
        distance: '1.5 km',
        token: 'POL-COMP-2026-7231',
        pcrAssigned: 'Pink Scooty Patrol #03',
        contactNumber: '1091',
        dispatchStatus: 'Acknowledged by SHO'
      }
    },
    {
      id: 'fb-103',
      author: 'Anjali Sharma',
      location: 'University West Gate Corridor',
      category: 'safe',
      title: 'Positive Feedback: New Pink Auto Stand & Active Guards',
      content: '24/7 women safety booth and female auto drivers now active. Very well lit with active police booth present.',
      timestamp: '2 hours ago',
      upvotes: 56,
      status: 'Verified Safe',
      isAnonymous: false,
      policeStation: {
        name: 'North District Women Special Safety Cell',
        distance: '0.8 km',
        token: 'POL-SAFE-2026-1104',
        contactNumber: '011-2764-9100',
        dispatchStatus: 'Logged for Verification'
      }
    },
    {
      id: 'fb-104',
      author: 'Sunita Roy',
      location: 'Sector 6 Commercial Market Lane',
      category: 'warning',
      title: 'Crowded Narrow Passage near ATM',
      content: 'Late evening congestion with unverified hawkers blocking the walkway. Women walking alone feel uncomfortable.',
      timestamp: '3 hours ago',
      upvotes: 19,
      status: 'Under Review',
      isAnonymous: false,
      policeStation: {
        name: 'Sector 14 Pink Police Post (All-Women Station)',
        distance: '1.5 km',
        token: 'POL-COMP-2026-6549',
        contactNumber: '1091',
        dispatchStatus: 'Patrol Route Updated'
      }
    },
    {
      id: 'fb-105',
      author: 'Ritu M. (Anonymous)',
      location: 'City Tech Park Footover Bridge',
      category: 'emergency',
      title: 'Harassment Incident Logged',
      content: 'Loud catcalling and harassment reported near footover bridge stairs at 8:30 PM. Needs immediate CCTV audit and PCR presence.',
      timestamp: '5 hours ago',
      upvotes: 47,
      status: 'Dispatched',
      isAnonymous: true,
      policeStation: {
        name: 'South-East District Police HQ & Cyber Cell',
        distance: '2.6 km',
        token: 'POL-FIR-2026-4482',
        pcrAssigned: 'PCR Bravo-08',
        contactNumber: '011-2651-8890',
        dispatchStatus: 'Dispatched to PCR'
      }
    },
    {
      id: 'fb-106',
      author: 'Kavita Das',
      location: 'Green Park Outer Ring Road',
      category: 'safe',
      title: 'Well-Lit Jogging Track & High Crowd Density',
      content: 'Felt extremely safe walking back from work. High pedestrian movement and visible security patrols till 10 PM.',
      timestamp: '6 hours ago',
      upvotes: 31,
      status: 'Verified Safe',
      isAnonymous: false,
      policeStation: {
        name: 'Central Metro & Transit Police Sub-Station',
        distance: '1.2 km',
        token: 'POL-SAFE-2026-3021',
        contactNumber: '011-2334-1091',
        dispatchStatus: 'Logged for Verification'
      }
    }
  ]);

  // Active Category Filter: 'all' | 'safe' | 'warning' | 'emergency' | 'police_dispatched'
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | FeedbackCategory | 'police_dispatched'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showStationDirectory, setShowStationDirectory] = useState<boolean>(false);

  // New Complaint / Feedback Form state
  const [showForm, setShowForm] = useState<boolean>(false);
  const [formCategory, setFormCategory] = useState<FeedbackCategory>('warning');
  const [formLocation, setFormLocation] = useState<string>('');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formContent, setFormContent] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  
  // Police Station Dispatch Configuration in Form
  const [sendToPolice, setSendToPolice] = useState<boolean>(true);
  const [selectedStationId, setSelectedStationId] = useState<string>('ps-north');
  const [requestCallback, setRequestCallback] = useState<boolean>(false);
  const [contactPhone, setContactPhone] = useState<string>('');
  
  // Success receipt state
  const [submittedReceipt, setSubmittedReceipt] = useState<{
    token: string;
    station: PoliceStationInfo;
    category: FeedbackCategory;
    title: string;
    location: string;
    timestamp: string;
    pcrUnit?: string;
  } | null>(null);

  const [copiedToken, setCopiedToken] = useState<boolean>(false);
  const [selectedReportDetails, setSelectedReportDetails] = useState<FeedbackReport | null>(null);

  // Upvote handler
  const handleUpvote = (id: string) => {
    setReports(prev =>
      prev.map(item => (item.id === id ? { ...item, upvotes: item.upvotes + 1 } : item))
    );
  };

  // Submit Complaint / Feedback with Police Station Dispatch
  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLocation.trim() || !formTitle.trim() || !formContent.trim()) return;

    const chosenStation = NEARBY_POLICE_STATIONS.find(s => s.id === selectedStationId) || NEARBY_POLICE_STATIONS[0];
    const generatedToken = `POL-${formCategory === 'emergency' ? 'FIR' : 'COMP'}-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newReport: FeedbackReport = {
      id: `fb-${Date.now()}`,
      author: isAnonymous ? 'Anonymous Citizen' : currentUser,
      location: formLocation.trim(),
      category: formCategory,
      title: formTitle.trim(),
      content: formContent.trim(),
      timestamp: 'Just now',
      upvotes: 1,
      status: formCategory === 'emergency' ? 'Dispatched' : 'Under Review',
      isAnonymous,
      policeStation: sendToPolice ? {
        name: chosenStation.name,
        distance: chosenStation.distance,
        token: generatedToken,
        pcrAssigned: chosenStation.pcrUnit,
        contactNumber: chosenStation.phone,
        dispatchStatus: formCategory === 'emergency' 
          ? 'Dispatched to PCR' 
          : formCategory === 'warning' 
            ? 'Acknowledged by SHO' 
            : 'Logged for Verification'
      } : undefined
    };

    setReports([newReport, ...reports]);
    
    // Set official receipt
    setSubmittedReceipt({
      token: generatedToken,
      station: chosenStation,
      category: formCategory,
      title: formTitle.trim(),
      location: formLocation.trim(),
      timestamp: 'Just now (Transmitted to Station)',
      pcrUnit: chosenStation.pcrUnit
    });

    // Reset fields
    setFormLocation('');
    setFormTitle('');
    setFormContent('');
    setContactPhone('');
  };

  // Filtered list
  const filteredReports = reports.filter(item => {
    let matchesCategory = true;
    if (selectedCategoryFilter === 'police_dispatched') {
      matchesCategory = !!item.policeStation;
    } else if (selectedCategoryFilter !== 'all') {
      matchesCategory = item.category === selectedCategoryFilter;
    }

    const matchesSearch = 
      item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.policeStation?.name.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (item.policeStation?.token.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    return matchesCategory && matchesSearch;
  });

  // Parameter Counters
  const safeCount = reports.filter(r => r.category === 'safe').length;
  const warningCount = reports.filter(r => r.category === 'warning').length;
  const emergencyCount = reports.filter(r => r.category === 'emergency').length;
  const policeDispatchedCount = reports.filter(r => !!r.policeStation).length;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2500);
  };

  return (
    <div className="space-y-8" id="nari-feedback-complaints-section">
      
      {/* Top Banner Context & Police Station Quick Actions */}
      <div className="p-6 bg-[#F9DBBD] border border-[#f0c39c] rounded-2xl flex flex-wrap justify-between items-center gap-6 shadow-sm">
        <div className="flex items-start gap-3 max-w-2xl">
          <div className="w-10 h-10 rounded-xl bg-[#A53860] border border-[#A53860] flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-serif italic text-[#450920] font-bold flex items-center gap-2">
              Women's Safety Complaints, Feedback & Police Station Dispatch
            </h3>
            <p className="text-xs text-[#450920] font-semibold leading-relaxed font-sans mt-0.5">
              Submit ground-level safety feedback or file complaints with <span className="text-[#A53860] font-bold">direct transmission to the nearest Police Station & Women Safety Desk</span>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowStationDirectory(!showStationDirectory)}
            className="px-4 py-2.5 bg-[#F5EBE0] hover:bg-[#FFA5AB]/30 text-[#450920] border border-[#f0c39c] font-bold text-xs font-mono uppercase tracking-wider rounded-full transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Building2 className="w-4 h-4 text-[#A53860]" />
            <span>{showStationDirectory ? 'Hide Police Desks' : 'Nearest Police Stations (4)'}</span>
            {showStationDirectory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => {
              setShowForm(!showForm);
              setSubmittedReceipt(null);
            }}
            className="px-5 py-2.5 bg-[#A53860] text-white hover:bg-[#8c2e50] font-bold text-xs uppercase tracking-widest rounded-full transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            {showForm ? 'Close Report Form' : 'Register Complaint / Feedback'}
          </button>
        </div>
      </div>

      {/* NEAREST POLICE STATIONS & WOMEN SAFETY DESKS RADAR PANEL */}
      {showStationDirectory && (
        <div className="p-6 rounded-2xl bg-[#F9DBBD] border border-[#f0c39c] shadow-md space-y-4 animate-fade-in">
          <div className="flex flex-wrap justify-between items-center gap-2 border-b border-[#f0c39c] pb-3">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#A53860] animate-pulse" />
              <h4 className="text-xs font-bold text-[#450920] font-mono uppercase tracking-wider">
                Nearest Police Stations & 24/7 Women Safety Response Cells
              </h4>
            </div>
            <span className="text-[10px] font-mono text-[#A53860] font-bold bg-white px-2.5 py-1 rounded-full border border-[#f0c39c]">
              GPS Spatial Sync: Live Patrolling
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {NEARBY_POLICE_STATIONS.map((station) => (
              <div 
                key={station.id}
                className="p-4 rounded-xl bg-[#F5EBE0] border border-[#f0c39c] hover:border-[#A53860] transition-all space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-[#A53860] text-white">
                      {station.distance}
                    </span>
                    <span className="text-[8px] font-mono font-bold text-[#450920]">
                      {station.status}
                    </span>
                  </div>

                  <h5 className="text-xs font-bold text-[#450920] font-serif leading-tight">
                    {station.name}
                  </h5>
                  
                  <p className="text-[10px] text-[#450920] font-sans mt-1">
                    <span className="font-semibold text-[#A53860]">Coverage:</span> {station.jurisdiction}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#f0c39c]/70 space-y-2">
                  <div className="text-[9px] font-mono text-[#450920] font-bold flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-[#A53860]" />
                    <span>{station.pcrUnit}</span>
                  </div>

                  <a
                    href={`tel:${station.phone.replace(/[^0-9]/g, '')}`}
                    className="w-full py-1.5 px-3 rounded-lg bg-white hover:bg-[#FFA5AB]/30 border border-[#f0c39c] text-[#450920] font-mono text-[9px] font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Phone className="w-3 h-3 text-[#A53860]" />
                    <span>Call Desk ({station.phone})</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PARAMETER METRICS OVERVIEW (3 PARAMETERS + POLICE DISPATCH TRACKER) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* SAFE PARAMETER CARD */}
        <div 
          onClick={() => setSelectedCategoryFilter(selectedCategoryFilter === 'safe' ? 'all' : 'safe')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            selectedCategoryFilter === 'safe'
              ? 'bg-[#A53860] text-white border-[#A53860] shadow-md'
              : 'bg-[#F9DBBD] border-[#f0c39c] hover:border-[#A53860]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-2.5 rounded-xl border ${selectedCategoryFilter === 'safe' ? 'bg-white/20 text-white border-white/30' : 'bg-[#FFA5AB] text-[#450920] border-[#f0c39c]'}`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className={`text-[10px] font-mono uppercase tracking-widest font-bold block ${selectedCategoryFilter === 'safe' ? 'text-white/80' : 'text-[#450920]'}`}>
                  SAFE PARAMETER
                </span>
                <h4 className={`text-sm font-bold ${selectedCategoryFilter === 'safe' ? 'text-white' : 'text-[#450920]'}`}>Safe Zone Feedback</h4>
              </div>
            </div>
            <span className={`text-2xl font-serif font-bold font-mono ${selectedCategoryFilter === 'safe' ? 'text-white' : 'text-[#A53860]'}`}>{safeCount}</span>
          </div>
          <p className={`text-[11px] font-medium mt-3 font-sans leading-normal ${selectedCategoryFilter === 'safe' ? 'text-white/90' : 'text-[#450920]'}`}>
            Well-lit corridors, active police booths, and verified safe transit nodes.
          </p>
        </div>

        {/* WARNING PARAMETER CARD */}
        <div 
          onClick={() => setSelectedCategoryFilter(selectedCategoryFilter === 'warning' ? 'all' : 'warning')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            selectedCategoryFilter === 'warning'
              ? 'bg-[#A53860] text-white border-[#A53860] shadow-md'
              : 'bg-[#F9DBBD] border-[#f0c39c] hover:border-[#A53860]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-2.5 rounded-xl border ${selectedCategoryFilter === 'warning' ? 'bg-white/20 text-white border-white/30' : 'bg-[#FFA5AB] text-[#450920] border-[#f0c39c]'}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <span className={`text-[10px] font-mono uppercase tracking-widest font-bold block ${selectedCategoryFilter === 'warning' ? 'text-white/80' : 'text-[#450920]'}`}>
                  WARNING PARAMETER
                </span>
                <h4 className={`text-sm font-bold ${selectedCategoryFilter === 'warning' ? 'text-white' : 'text-[#450920]'}`}>Hazard & Alert Flag</h4>
              </div>
            </div>
            <span className={`text-2xl font-serif font-bold font-mono ${selectedCategoryFilter === 'warning' ? 'text-white' : 'text-[#A53860]'}`}>{warningCount}</span>
          </div>
          <p className={`text-[11px] font-medium mt-3 font-sans leading-normal ${selectedCategoryFilter === 'warning' ? 'text-white/90' : 'text-[#450920]'}`}>
            Flickering lights, broken CCTV, suspicious gatherings, and dark pathways.
          </p>
        </div>

        {/* EMERGENCY PARAMETER CARD */}
        <div 
          onClick={() => setSelectedCategoryFilter(selectedCategoryFilter === 'emergency' ? 'all' : 'emergency')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            selectedCategoryFilter === 'emergency'
              ? 'bg-[#A53860] text-white border-[#A53860] shadow-md'
              : 'bg-[#F9DBBD] border-[#f0c39c] hover:border-[#A53860]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-2.5 rounded-xl border animate-pulse ${selectedCategoryFilter === 'emergency' ? 'bg-white/20 text-white border-white/30' : 'bg-[#FFA5AB] text-[#450920] border-[#f0c39c]'}`}>
                <Siren className="w-5 h-5" />
              </div>
              <div>
                <span className={`text-[10px] font-mono uppercase tracking-widest font-bold block ${selectedCategoryFilter === 'emergency' ? 'text-white/80' : 'text-[#450920]'}`}>
                  EMERGENCY PARAMETER
                </span>
                <h4 className={`text-sm font-bold ${selectedCategoryFilter === 'emergency' ? 'text-white' : 'text-[#450920]'}`}>Urgent Complaint</h4>
              </div>
            </div>
            <span className={`text-2xl font-serif font-bold font-mono ${selectedCategoryFilter === 'emergency' ? 'text-white' : 'text-[#A53860]'}`}>{emergencyCount}</span>
          </div>
          <p className={`text-[11px] font-medium mt-3 font-sans leading-normal ${selectedCategoryFilter === 'emergency' ? 'text-white/90' : 'text-[#450920]'}`}>
            Active stalking, harassment, and critical threats routed directly to PCR vans.
          </p>
        </div>

        {/* POLICE DISPATCH TRACKER CARD */}
        <div 
          onClick={() => setSelectedCategoryFilter(selectedCategoryFilter === 'police_dispatched' ? 'all' : 'police_dispatched')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            selectedCategoryFilter === 'police_dispatched'
              ? 'bg-[#A53860] text-white border-[#A53860] shadow-md'
              : 'bg-[#F9DBBD] border-[#f0c39c] hover:border-[#A53860]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-2.5 rounded-xl border ${selectedCategoryFilter === 'police_dispatched' ? 'bg-white/20 text-white border-white/30' : 'bg-[#FFA5AB] text-[#450920] border-[#f0c39c]'}`}>
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className={`text-[10px] font-mono uppercase tracking-widest font-bold block ${selectedCategoryFilter === 'police_dispatched' ? 'text-white/80' : 'text-[#450920]'}`}>
                  POLICE DISPATCH
                </span>
                <h4 className={`text-sm font-bold ${selectedCategoryFilter === 'police_dispatched' ? 'text-white' : 'text-[#450920]'}`}>Station E-Filings</h4>
              </div>
            </div>
            <span className={`text-2xl font-serif font-bold font-mono ${selectedCategoryFilter === 'police_dispatched' ? 'text-white' : 'text-[#A53860]'}`}>{policeDispatchedCount}</span>
          </div>
          <p className={`text-[11px] font-medium mt-3 font-sans leading-normal ${selectedCategoryFilter === 'police_dispatched' ? 'text-white/90' : 'text-[#450920]'}`}>
            Reports directly transmitted to local police desks with verifiable tokens.
          </p>
        </div>

      </div>

      {/* NEW COMPLAINT / FEEDBACK FORM WITH POLICE STATION TRANSMISSION */}
      {showForm && (
        <div className="p-6 rounded-2xl bg-[#F9DBBD] border border-[#f0c39c] shadow-lg space-y-6 relative overflow-hidden">
          <div className="flex flex-wrap justify-between items-center border-b border-[#f0c39c] pb-4 gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#A53860]" />
              <h3 className="text-sm font-bold text-[#450920] font-mono uppercase tracking-wider">
                Register Safety Feedback or File Police Complaint
              </h3>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-[#A53860] font-mono font-bold bg-white px-3 py-1 rounded-full border border-[#f0c39c]">
              <Radio className="w-3 h-3 text-[#A53860] animate-pulse" />
              <span>Direct Node: Nearest Police Station Sync Active</span>
            </div>
          </div>

          {/* SUBMISSION SUCCESS / OFFICIAL POLICE RECEIPT */}
          {submittedReceipt ? (
            <div className="p-6 bg-[#F5EBE0] border-2 border-[#A53860]/30 rounded-2xl space-y-5 shadow-inner animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#f0c39c] pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-[#A53860] text-white rounded-xl shadow-sm">
                    <CheckCircle2 className="w-6 h-6 animate-bounce" />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono uppercase font-bold text-[#A53860] tracking-widest block">
                      OFFICIAL DISPATCH TRANSMISSION CONFIRMED
                    </span>
                    <h4 className="text-base font-serif italic font-bold text-[#450920]">
                      Feedback & E-Filing Transmitted to Nearest Police Station
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-[#f0c39c]">
                  <span className="text-[10px] font-mono font-bold text-[#450920]">Token:</span>
                  <span className="text-xs font-mono font-bold text-[#A53860]">{submittedReceipt.token}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(submittedReceipt.token)}
                    className="p-1 hover:bg-[#FFA5AB]/30 rounded text-[#450920] cursor-pointer"
                    title="Copy Token"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Receipt Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Station Dispatched */}
                <div className="p-3.5 bg-white rounded-xl border border-[#f0c39c] space-y-1">
                  <span className="text-[9px] font-mono text-[#450920] font-bold uppercase block">
                    Receiving Police Station
                  </span>
                  <h5 className="text-xs font-bold text-[#450920] font-serif">
                    {submittedReceipt.station.name}
                  </h5>
                  <p className="text-[10px] font-mono text-[#A53860] font-bold">
                    Distance: {submittedReceipt.station.distance}
                  </p>
                </div>

                {/* Patrol Unit / Officer Assigned */}
                <div className="p-3.5 bg-white rounded-xl border border-[#f0c39c] space-y-1">
                  <span className="text-[9px] font-mono text-[#450920] font-bold uppercase block">
                    Assigned Patrol Unit
                  </span>
                  <h5 className="text-xs font-bold text-[#A53860] font-mono">
                    {submittedReceipt.pcrUnit || 'Duty Station Desk (Active)'}
                  </h5>
                  <p className="text-[10px] font-sans text-[#450920]">
                    Status: Transmitted & Logged
                  </p>
                </div>

                {/* Direct Station Helpline */}
                <div className="p-3.5 bg-white rounded-xl border border-[#f0c39c] space-y-1">
                  <span className="text-[9px] font-mono text-[#450920] font-bold uppercase block">
                    Station Control Helpline
                  </span>
                  <h5 className="text-xs font-bold text-[#450920] font-mono">
                    {submittedReceipt.station.phone}
                  </h5>
                  <a
                    href={`tel:${submittedReceipt.station.phone.replace(/[^0-9]/g, '')}`}
                    className="inline-flex items-center gap-1 text-[10px] font-mono text-[#A53860] font-bold hover:underline"
                  >
                    <Phone className="w-3 h-3" />
                    Call Station Desk
                  </a>
                </div>

              </div>

              {/* Action bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#f0c39c]">
                <span className="text-[10px] font-mono text-[#450920]">
                  {copiedToken ? '✓ Token copied to clipboard' : 'Save your official token for reference & PCR check-in.'}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedReceipt(null);
                      setShowForm(false);
                    }}
                    className="px-5 py-2 bg-[#A53860] text-white font-bold text-xs uppercase tracking-wider rounded-full hover:bg-[#8c2e50] transition-all cursor-pointer shadow-sm"
                  >
                    Done / View in Public Feed
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitReport} className="space-y-6">
              
              {/* Category Parameter Selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-widest text-[#450920] font-bold block">
                  1. Select Classification Parameter *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  {/* SAFE */}
                  <button
                    type="button"
                    onClick={() => setFormCategory('safe')}
                    className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                      formCategory === 'safe'
                        ? 'bg-[#A53860] text-white border-[#A53860] shadow-sm'
                        : 'bg-white border-[#f0c39c] text-[#450920] hover:border-[#A53860]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className={`w-4 h-4 ${formCategory === 'safe' ? 'text-white' : 'text-[#A53860]'}`} />
                      <div>
                        <span className="text-xs font-bold font-mono uppercase block">Safe Parameter</span>
                        <span className={`text-[9px] font-sans block ${formCategory === 'safe' ? 'text-white/80' : 'text-[#450920]'}`}>Positive feedback / safe corridor</span>
                      </div>
                    </div>
                    {formCategory === 'safe' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                  </button>

                  {/* WARNING */}
                  <button
                    type="button"
                    onClick={() => setFormCategory('warning')}
                    className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                      formCategory === 'warning'
                        ? 'bg-[#A53860] text-white border-[#A53860] shadow-sm'
                        : 'bg-white border-[#f0c39c] text-[#450920] hover:border-[#A53860]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <AlertTriangle className={`w-4 h-4 ${formCategory === 'warning' ? 'text-white' : 'text-[#A53860]'}`} />
                      <div>
                        <span className="text-xs font-bold font-mono uppercase block">Warning Parameter</span>
                        <span className={`text-[9px] font-sans block ${formCategory === 'warning' ? 'text-white/80' : 'text-[#450920]'}`}>Unlit area / hazard / broken CCTV</span>
                      </div>
                    </div>
                    {formCategory === 'warning' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                  </button>

                  {/* EMERGENCY */}
                  <button
                    type="button"
                    onClick={() => setFormCategory('emergency')}
                    className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                      formCategory === 'emergency'
                        ? 'bg-[#A53860] text-white border-[#A53860] shadow-sm'
                        : 'bg-white border-[#f0c39c] text-[#450920] hover:border-[#A53860]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Siren className={`w-4 h-4 ${formCategory === 'emergency' ? 'text-white animate-pulse' : 'text-[#A53860]'}`} />
                      <div>
                        <span className="text-xs font-bold font-mono uppercase block">Emergency Parameter</span>
                        <span className={`text-[9px] font-sans block ${formCategory === 'emergency' ? 'text-white/80' : 'text-[#450920]'}`}>Active stalking / urgent threat</span>
                      </div>
                    </div>
                    {formCategory === 'emergency' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                  </button>

                </div>
              </div>

              {/* Form Location & Title Inputs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Location Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-[#450920] font-bold block">
                    2. Location / Landmark Name *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-[#A53860]" />
                    <input
                      type="text"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      placeholder="e.g. Central Metro Exit 3 / Sector 12 Market Alley"
                      className="w-full bg-white border border-[#f0c39c] focus:border-[#A53860] p-3 pl-10 rounded-xl text-[#450920] font-bold text-xs font-sans focus:outline-none transition-all placeholder-[#450920]/50 shadow-sm"
                      required
                    />
                  </div>
                </div>

                {/* Title Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-[#450920] font-bold block">
                    3. Complaint / Feedback Headline *
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Streetlights faulty and group loitering near stairs"
                    className="w-full bg-white border border-[#f0c39c] focus:border-[#A53860] p-3 rounded-xl text-[#450920] font-bold text-xs font-sans focus:outline-none transition-all placeholder-[#450920]/50 shadow-sm"
                    required
                  />
                </div>

              </div>

              {/* Detailed Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-[#450920] font-bold block">
                  4. Detailed Description & Situation Context *
                </label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  rows={3}
                  placeholder="Describe what occurred, time of incident, physical descriptions, lighting conditions, or police action required..."
                  className="w-full bg-white border border-[#f0c39c] focus:border-[#A53860] p-3 rounded-xl text-[#450920] font-bold text-xs font-sans focus:outline-none transition-all resize-none leading-relaxed placeholder-[#450920]/50 shadow-sm"
                  required
                ></textarea>
              </div>

              {/* POLICE STATION DISPATCH SELECTION & CONFIGURATION */}
              <div className="p-4 bg-[#F5EBE0] border border-[#f0c39c] rounded-xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendToPolice}
                      onChange={(e) => setSendToPolice(e.target.checked)}
                      className="w-4 h-4 rounded bg-white border-[#f0c39c] text-[#A53860] focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-mono font-bold uppercase text-[#450920] flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-[#A53860]" />
                        Transmit E-Filing to Nearest Police Station
                      </span>
                      <span className="text-[10px] font-sans text-[#450920]/80 block">
                        Routes a copy directly to the station duty officer and generates an official police token.
                      </span>
                    </div>
                  </label>

                  {sendToPolice && (
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-[#A53860] text-white">
                      E-Filing Enabled
                    </span>
                  )}
                </div>

                {sendToPolice && (
                  <div className="space-y-3 pt-2 border-t border-[#f0c39c]">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-[#450920] font-bold block">
                      Select Receiving Police Station / Women Safety Cell
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {NEARBY_POLICE_STATIONS.map((station) => (
                        <div
                          key={station.id}
                          onClick={() => setSelectedStationId(station.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            selectedStationId === station.id
                              ? 'bg-white border-[#A53860] shadow-sm ring-1 ring-[#A53860]'
                              : 'bg-[#F9DBBD]/50 border-[#f0c39c] hover:bg-white'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <h6 className="text-xs font-bold text-[#450920] font-serif">{station.name}</h6>
                            </div>
                            <p className="text-[9px] font-mono text-[#A53860] font-bold">
                              {station.distance} • {station.phone}
                            </p>
                          </div>

                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            selectedStationId === station.id
                              ? 'border-[#A53860] bg-[#A53860]'
                              : 'border-[#f0c39c] bg-white'
                          }`}>
                            {selectedStationId === station.id && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Police Callback Request Option */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-[#450920] font-bold">
                        <input
                          type="checkbox"
                          checked={requestCallback}
                          onChange={(e) => setRequestCallback(e.target.checked)}
                          className="rounded bg-white border-[#f0c39c] text-[#A53860] focus:ring-0 cursor-pointer"
                        />
                        <span className="font-mono text-[10px] uppercase">Request Police Duty Officer Call-Back</span>
                      </label>

                      {requestCallback && (
                        <input
                          type="tel"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          placeholder="Your contact number (e.g. +91 98765 43210)"
                          className="bg-white border border-[#f0c39c] p-2 rounded-lg text-xs font-mono font-bold text-[#450920] focus:outline-none focus:border-[#A53860]"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Actions & Anonymous Toggle */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#f0c39c]">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#450920] font-bold">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="rounded bg-white border-[#f0c39c] text-[#A53860] focus:ring-0 cursor-pointer"
                  />
                  <span className="font-mono text-[10px] uppercase">Submit Anonymously in Public Feed</span>
                </label>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-5 py-2.5 bg-[#F5EBE0] hover:bg-[#FFA5AB]/30 text-[#450920] font-mono text-[10px] uppercase font-bold tracking-wider rounded-full transition-all border border-[#f0c39c] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#A53860] text-white hover:bg-[#8c2e50] font-bold text-xs uppercase tracking-widest rounded-full transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {sendToPolice ? 'Submit & Dispatch to Police' : 'Submit Community Report'}
                  </button>
                </div>
              </div>

            </form>
          )}
        </div>
      )}

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#F9DBBD] p-3 rounded-2xl border border-[#f0c39c]">
        
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCategoryFilter('all')}
            className={`px-3.5 py-1.5 rounded-full text-[10px] uppercase font-mono font-bold tracking-wider transition-all cursor-pointer shrink-0 ${
              selectedCategoryFilter === 'all'
                ? 'bg-[#A53860] text-white'
                : 'bg-white text-[#450920] border border-[#f0c39c] hover:bg-[#FFA5AB]/30'
            }`}
          >
            All ({reports.length})
          </button>

          <button
            onClick={() => setSelectedCategoryFilter('safe')}
            className={`px-3.5 py-1.5 rounded-full text-[10px] uppercase font-mono font-bold tracking-wider transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              selectedCategoryFilter === 'safe'
                ? 'bg-[#A53860] text-white'
                : 'bg-white text-[#450920] border border-[#f0c39c] hover:bg-[#FFA5AB]/30'
            }`}
          >
            <ShieldCheck className="w-3 h-3 text-[#A53860]" />
            Safe ({safeCount})
          </button>

          <button
            onClick={() => setSelectedCategoryFilter('warning')}
            className={`px-3.5 py-1.5 rounded-full text-[10px] uppercase font-mono font-bold tracking-wider transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              selectedCategoryFilter === 'warning'
                ? 'bg-[#A53860] text-white'
                : 'bg-white text-[#450920] border border-[#f0c39c] hover:bg-[#FFA5AB]/30'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-[#A53860]" />
            Warning ({warningCount})
          </button>

          <button
            onClick={() => setSelectedCategoryFilter('emergency')}
            className={`px-3.5 py-1.5 rounded-full text-[10px] uppercase font-mono font-bold tracking-wider transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              selectedCategoryFilter === 'emergency'
                ? 'bg-[#A53860] text-white'
                : 'bg-white text-[#450920] border border-[#f0c39c] hover:bg-[#FFA5AB]/30'
            }`}
          >
            <Siren className="w-3 h-3 text-[#A53860]" />
            Emergency ({emergencyCount})
          </button>

          <button
            onClick={() => setSelectedCategoryFilter('police_dispatched')}
            className={`px-3.5 py-1.5 rounded-full text-[10px] uppercase font-mono font-bold tracking-wider transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              selectedCategoryFilter === 'police_dispatched'
                ? 'bg-[#A53860] text-white'
                : 'bg-white text-[#450920] border border-[#f0c39c] hover:bg-[#FFA5AB]/30'
            }`}
          >
            <Building2 className="w-3 h-3 text-[#A53860]" />
            Police Dispatched ({policeDispatchedCount})
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#A53860]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search location, police token..."
            className="w-full bg-white border border-[#f0c39c] p-2 pl-9 rounded-xl text-[#450920] font-bold text-xs font-sans focus:outline-none focus:border-[#A53860] placeholder-[#450920]/50 shadow-sm"
          />
        </div>

      </div>

      {/* FEED DISPLAY GRID */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-[#F9DBBD] border border-[#f0c39c] space-y-3">
            <Info className="w-8 h-8 text-[#A53860] mx-auto" />
            <h4 className="text-sm font-serif italic text-[#450920] font-bold">No community reports matching your filter</h4>
            <p className="text-xs text-[#450920] font-semibold">
              Try adjusting your parameter filter or clearing your search query.
            </p>
          </div>
        ) : (
          filteredReports.map((report) => {
            const isSafe = report.category === 'safe';
            const isWarning = report.category === 'warning';
            const isEmergency = report.category === 'emergency';

            return (
              <div
                key={report.id}
                className="p-6 rounded-2xl border border-[#f0c39c] bg-[#F9DBBD] shadow-sm relative overflow-hidden space-y-3"
              >
                {/* Accent indicator line on top */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#A53860]"></div>

                {/* Card Top Row */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  
                  {/* Category Badge & Status */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Category Tag */}
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-mono font-bold uppercase tracking-widest bg-[#A53860] text-white">
                      {isEmergency && <Siren className="w-3 h-3 animate-pulse" />}
                      {isWarning && <AlertTriangle className="w-3 h-3 text-[#FCF6BD]" />}
                      {isSafe && <ShieldCheck className="w-3 h-3 text-[#FCF6BD]" />}
                      {report.category.toUpperCase()} PARAMETER
                    </span>

                    {/* Status badge */}
                    <span className="text-[9px] font-mono text-[#450920] uppercase bg-[#F5EBE0] border border-[#f0c39c] px-2.5 py-1 rounded-full font-bold">
                      Status: <span className="text-[#A53860]">{report.status}</span>
                    </span>
                  </div>

                  {/* Timestamp & Author */}
                  <div className="flex items-center gap-3 text-[10px] font-mono text-[#450920] font-bold">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#A53860]" />
                      {report.timestamp}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-[#A53860]" />
                      {report.author}
                    </span>
                  </div>

                </div>

                {/* Location banner */}
                <div className="flex items-center gap-1.5 text-xs text-[#A53860] font-mono">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-bold uppercase tracking-wider">{report.location}</span>
                </div>

                {/* Headline Title */}
                <h3 className="text-base font-serif italic text-[#450920] font-bold">
                  {report.title}
                </h3>

                {/* Content description */}
                <p className="text-xs text-[#450920] font-semibold leading-relaxed font-sans">
                  {report.content}
                </p>

                {/* POLICE STATION DISPATCH BANNER (IF TRANSMITTED) */}
                {report.policeStation && (
                  <div className="p-3 bg-[#F5EBE0] rounded-xl border border-[#f0c39c] flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#A53860] shrink-0" />
                      <div>
                        <span className="font-bold text-[#450920]">
                          Transmitted to: {report.policeStation.name}
                        </span>
                        <span className="text-[#A53860] block font-semibold">
                          Token: {report.policeStation.token} ({report.policeStation.dispatchStatus})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${report.policeStation.contactNumber.replace(/[^0-9]/g, '')}`}
                        className="px-2.5 py-1 rounded bg-white hover:bg-[#FFA5AB]/30 border border-[#f0c39c] text-[#450920] font-bold flex items-center gap-1 transition-all"
                      >
                        <Phone className="w-3 h-3 text-[#A53860]" />
                        Call Desk
                      </a>
                    </div>
                  </div>
                )}

                {/* Bottom Row Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-[#f0c39c] text-[10px] font-mono">
                  
                  {/* Community Verification / Upvote button */}
                  <button
                    onClick={() => handleUpvote(report.id)}
                    className="px-3 py-1.5 rounded-lg bg-[#F5EBE0] hover:bg-[#FFA5AB]/30 border border-[#f0c39c] text-[#450920] font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <ThumbsUp className="w-3 h-3 text-[#A53860]" />
                    <span>Confirm / Verify ({report.upvotes})</span>
                  </button>

                  {/* Dispatch Route Tag */}
                  <div className="text-[#450920] font-bold flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-[#A53860]" />
                    <span>NARI Crisis & Police Node Sync</span>
                  </div>

                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
