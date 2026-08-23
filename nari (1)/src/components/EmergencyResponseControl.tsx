/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  BellRing, 
  MapPin, 
  ShieldAlert, 
  Users, 
  Smartphone, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  Volume2, 
  Mic, 
  AlertTriangle,
  Siren,
  Send,
  Clock,
  Radio,
  KeyRound,
  ShieldCheck,
  Building2,
  Navigation,
  FileSpreadsheet,
  Lock,
  Unlock,
  Activity,
  Heart,
  Eye,
  Check,
  X
} from 'lucide-react';
import { Contact } from '../types';
import { 
  globalEscalationEngine, 
  IncidentRecord, 
  TierLevel, 
  AuditLogEntry 
} from '../lib/escalationEngine';

interface EmergencyResponseControlProps {
  isSOSActive: boolean;
  onManualSOSTrigger: () => void;
  onManualSOSCancel: () => void;
  autoTriggerCause: string;
}

export default function EmergencyResponseControl({
  isSOSActive,
  onManualSOSTrigger,
  onManualSOSCancel,
  autoTriggerCause
}: EmergencyResponseControlProps) {
  
  // Pre-configured emergency contacts
  const [contacts, setContacts] = useState<Contact[]>([
    { id: '1', name: "Ananya Dey (Mom)", phone: "+91 98311 00001", relation: "Primary Guardian (Tier 1)", isActive: true, alertSent: false },
    { id: '2', name: "Debashree G. (Roommate)", phone: "+91 98311 00002", relation: "Secondary Guard (Tier 2)", isActive: true, alertSent: false },
    { id: '3', name: "St. Mary Campus Security", phone: "112 / 033-2455110", relation: "Police Dispatch (Tier 3)", isActive: true, alertSent: false }
  ]);

  const [newContactName, setNewContactName] = useState<string>('');
  const [newContactPhone, setNewContactPhone] = useState<string>('');
  const [newContactRelation, setNewContactRelation] = useState<string>('Secondary Guard');

  const [isSirenOn, setIsSirenOn] = useState<boolean>(false);
  const [sirenVolume, setSirenVolume] = useState<number>(0.8);
  const [sirenToneType, setSirenToneType] = useState<'SWEEP' | 'PULSE' | 'BEEP'>('SWEEP');
  const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);
  const [voiceTriggered, setVoiceTriggered] = useState<boolean>(false);
  const [cancelCountdown, setCancelCountdown] = useState<number>(5);
  const [isTriggeringAuto, setIsTriggeringAuto] = useState<boolean>(false);
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(true);

  // Web Speech API & Live Audio Visualizer State
  const [lastTranscript, setLastTranscript] = useState<string>('');
  const [isSpeechSupported, setIsSpeechSupported] = useState<boolean>(true);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);
  const [micAudioLevel, setMicAudioLevel] = useState<number>(0);
  const recognitionRef = useRef<any>(null);
  const micMediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Web Audio Context for Siren Synth & Mic Analyzer
  const audioCtxRef = useRef<AudioContext | null>(null);
  const osc1Ref = useRef<OscillatorNode | null>(null);
  const osc2Ref = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sirenIntervalRef = useRef<any>(null);

  // Text to Speech helper
  const speakVoiceFeedback = (text: string) => {
    if (!ttsEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.1;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('Speech Synthesis Error:', e);
    }
  };

  // Request Hardware Microphone Permission & Start Audio Analyser Node
  const requestMicHardwarePermission = async (): Promise<boolean> => {
    try {
      setMicPermissionError(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicPermissionError('Browser mediaDevices API not supported in this environment.');
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch((err) => {
        // Explicitly catch permission dismissal or denial
        console.warn('getUserMedia error:', err);
        throw err;
      });

      micMediaStreamRef.current = stream;

      // Attach Audio Analyser for Live VU Meter
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContextClass();
        }
        if (audioCtxRef.current.state === 'suspended') {
          await audioCtxRef.current.resume().catch(() => {});
        }

        const source = audioCtxRef.current.createMediaStreamSource(stream);
        const analyser = audioCtxRef.current.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateLevel = () => {
          if (analyserRef.current) {
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setMicAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
            animFrameRef.current = requestAnimationFrame(updateLevel);
          }
        };
        updateLevel();
      }

      return true;
    } catch (err: any) {
      console.warn('Microphone Permission Notice:', err?.name || err?.message || err);
      let errMsg = 'Microphone permission dismissed or blocked by browser.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || (err.message && err.message.includes('dismissed'))) {
        errMsg = '⚠️ Microphone permission was dismissed or blocked. Click "Allow Microphone" or use simulated voice trigger below.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errMsg = 'No microphone device detected on this device.';
      }
      setMicPermissionError(errMsg);
      return false;
    }
  };

  // Clean up mic streams & audio analyzers
  const stopMicHardwareStream = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (micMediaStreamRef.current) {
      micMediaStreamRef.current.getTracks().forEach(track => track.stop());
      micMediaStreamRef.current = null;
    }
    setMicAudioLevel(0);
  };

  // Siren Audio Synthesizer Engine using Web Audio API
  const startSirenAudio = () => {
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
        }
      }

      if (!audioCtxRef.current) return;

      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }

      // Stop any existing sound
      stopSirenAudio();

      const ctx = audioCtxRef.current;
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(sirenVolume, ctx.currentTime);
      gainNode.connect(ctx.destination);
      gainNodeRef.current = gainNode;

      const osc = ctx.createOscillator();
      osc.type = sirenToneType === 'PULSE' ? 'square' : 'sawtooth';
      osc.frequency.setValueAtTime(750, ctx.currentTime);
      osc.connect(gainNode);
      osc.start();
      osc1Ref.current = osc;

      // Frequency sweeping / pulsing loop
      let highTone = false;
      if (sirenToneType === 'SWEEP') {
        sirenIntervalRef.current = setInterval(() => {
          if (!osc1Ref.current || !audioCtxRef.current) return;
          const targetFreq = highTone ? 750 : 1300;
          osc1Ref.current.frequency.exponentialRampToValueAtTime(
            targetFreq,
            audioCtxRef.current.currentTime + 0.22
          );
          highTone = !highTone;
        }, 250);
      } else if (sirenToneType === 'PULSE') {
        sirenIntervalRef.current = setInterval(() => {
          if (!gainNodeRef.current || !audioCtxRef.current) return;
          const now = audioCtxRef.current.currentTime;
          gainNodeRef.current.gain.setValueAtTime(highTone ? sirenVolume : 0.05, now);
          if (osc1Ref.current) {
            osc1Ref.current.frequency.setValueAtTime(highTone ? 1400 : 900, now);
          }
          highTone = !highTone;
        }, 150);
      } else {
        // BEEP
        sirenIntervalRef.current = setInterval(() => {
          if (!gainNodeRef.current || !audioCtxRef.current) return;
          const now = audioCtxRef.current.currentTime;
          gainNodeRef.current.gain.setValueAtTime(sirenVolume, now);
          gainNodeRef.current.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        }, 400);
      }

    } catch (err) {
      console.error('Audio Context Error:', err);
    }
  };

  const stopSirenAudio = () => {
    if (sirenIntervalRef.current) {
      clearInterval(sirenIntervalRef.current);
      sirenIntervalRef.current = null;
    }
    if (osc1Ref.current) {
      try {
        osc1Ref.current.stop();
        osc1Ref.current.disconnect();
      } catch (e) {}
      osc1Ref.current = null;
    }
    if (osc2Ref.current) {
      try {
        osc2Ref.current.stop();
        osc2Ref.current.disconnect();
      } catch (e) {}
      osc2Ref.current = null;
    }
  };

  // Toggle or auto-start Siren sound
  useEffect(() => {
    if (isSirenOn || isSOSActive) {
      startSirenAudio();
    } else {
      stopSirenAudio();
    }
    return () => {
      stopSirenAudio();
    };
  }, [isSirenOn, isSOSActive, sirenToneType, sirenVolume]);

  // Offline / GSM Fallback toggle
  const [isOfflineGsmMode, setIsOfflineGsmMode] = useState<boolean>(false);

  // Active Incident State from Escalation Engine
  const [currentIncident, setCurrentIncident] = useState<IncidentRecord | null>(null);

  // Timers for Tier 1 & Tier 2 countdowns
  const [tier1Timer, setTier1Timer] = useState<number>(60);
  const [tier2Timer, setTier2Timer] = useState<number>(45);

  // Disarm PIN Modal state
  const [showDisarmModal, setShowDisarmModal] = useState<boolean>(false);
  const [inputPin, setInputPin] = useState<string>('');
  const [pinMessage, setPinMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // SMS Gateway Test Broadcast feedback
  const [smsGatewayLogs, setSmsGatewayLogs] = useState<string[]>([]);
  const [testSmsSent, setTestSmsSent] = useState<boolean>(false);

  // View Audit Trail Drawer state
  const [showAuditDrawer, setShowAuditDrawer] = useState<boolean>(false);

  // Synchronize Escalation Engine when SOS activates or resets
  useEffect(() => {
    if (isSOSActive) {
      // Trigger new SOS incident in Escalation Engine
      const incident = globalEscalationEngine.triggerSOS(
        'user-nari-01',
        'Priya Sharma',
        '+91 98311 00000',
        {
          latitude: 22.5726,
          longitude: 88.3639,
          accuracyMeters: 4,
          addressLandmark: 'Central Metro Corridor Exit Gate 3, Kolkata'
        },
        {
          heartRateBpm: 142,
          fallDetected: true,
          stressScore: 88,
          audioSnippetCaptured: true,
          cameraSnapshotCaptured: true,
          fiveMinTrail: [
            { lat: 22.5710, lng: 88.3620, timestamp: '5 mins ago' },
            { lat: 22.5720, lng: 88.3630, timestamp: '2 mins ago' },
            { lat: 22.5726, lng: 88.3639, timestamp: 'Just now' }
          ]
        },
        isOfflineGsmMode
      );

      setCurrentIncident(incident);
      setTier1Timer(60);
      setTier2Timer(45);

      setSmsGatewayLogs([
        `[SMS GATEWAY BROADCAST STARTED]`,
        `[GSM ENCRYPTION] Channel: ${isOfflineGsmMode ? 'Cellular GSM Direct' : 'Twilio REST SMS API'}`,
        `[DESTINATION 1] Primary (+91 98311 00001): "HELP: I am in distress! - Priya Sharma. Live GPS: https://maps.google.com/?q=22.5726,88.3639"`,
        `[DISPATCH STATUS] Tier 1 Active. 60s acknowledgment window running...`
      ]);

      setContacts(prev => prev.map(c => c.isActive ? { ...c, alertSent: true } : c));
    } else {
      setCurrentIncident(null);
      setSmsGatewayLogs([]);
      setContacts(prev => prev.map(c => ({ ...c, alertSent: false })));
    }
  }, [isSOSActive, isOfflineGsmMode]);

  // Tier 1 Countdown Timer (60 seconds)
  useEffect(() => {
    if (!currentIncident || currentIncident.currentTier !== 'TIER_1_PRIMARY') return;

    if (tier1Timer <= 0) {
      // Advance to Tier 2
      const updated = globalEscalationEngine.advanceToTier2(currentIncident.id);
      if (updated) {
        setCurrentIncident({ ...updated });
        setTier2Timer(45);
        setSmsGatewayLogs(prev => [
          ...prev,
          `⚠️ TIER 1 TIMEOUT (60s expired with no response).`,
          `🚀 ESCALATING TO TIER 2: Notifying all Secondary Contacts simultaneously (+91 98311 00002)...`
        ]);
      }
      return;
    }

    const timer = setTimeout(() => {
      setTier1Timer(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [currentIncident, tier1Timer]);

  // Tier 2 Countdown Timer (45 seconds)
  useEffect(() => {
    if (!currentIncident || currentIncident.currentTier !== 'TIER_2_SECONDARY') return;

    if (tier2Timer <= 0) {
      // Advance to Tier 3 (Police) & Tier 4 (Guardians)
      const updated = globalEscalationEngine.advanceToTier3And4(currentIncident.id);
      if (updated) {
        setCurrentIncident({ ...updated });
        setSmsGatewayLogs(prev => [
          ...prev,
          `🚨 TIER 2 TIMEOUT (45s expired).`,
          `🏛️ TIER 3 POLICE DISPATCH: Live GPS, 5-min trail & biometrics transmitted to 112 Control Room!`,
          `🛡️ TIER 4 GUARDIAN NETWORK: Anonymized proximity alerts sent to 5 nearby opt-in guardians within 500m.`
        ]);
      }
      return;
    }

    const timer = setTimeout(() => {
      setTier2Timer(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [currentIncident, tier2Timer]);

  // Handle countdown triggers when Stress peaks automatically
  useEffect(() => {
    if (autoTriggerCause && !isSOSActive) {
      setIsTriggeringAuto(true);
      setCancelCountdown(5);
    } else {
      setIsTriggeringAuto(false);
    }
  }, [autoTriggerCause, isSOSActive]);

  useEffect(() => {
    if (!isTriggeringAuto) return;
    if (cancelCountdown <= 0) {
      setIsTriggeringAuto(false);
      onManualSOSTrigger();
      return;
    }

    const timer = setTimeout(() => {
      setCancelCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isTriggeringAuto, cancelCountdown, onManualSOSTrigger]);

  // Real Web Speech API Hook with Auto-Reconnect, Mic Stream & Multi-Keyword Matching
  useEffect(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setIsSpeechSupported(false);
      return;
    }
    setIsSpeechSupported(true);

    if (isVoiceListening) {
      setLastTranscript('');
      setMicPermissionError(null);

      // Attempt mic analyser safely in background without blocking speech engine
      requestMicHardwarePermission().catch(() => {});

      let recognition: any;
      try {
        recognition = new SpeechRecognitionAPI();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setLastTranscript('Mic listening... Say "NARI Help", "Help Me", "Emergency", or "Save Me"');
        };

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          const activeTranscript = finalTranscript || interimTranscript;
          setLastTranscript(activeTranscript);

          const checkText = activeTranscript.toLowerCase().trim();
          const distressKeywords = [
            'nari help', 'nari emergency', 'nari', 'help me', 'help',
            'save me', 'emergency', 'sos', 'call police', 'police', 
            'distress', 'danger', 'stop', 'madad', 'bachao', 'attack'
          ];

          const isTriggered = distressKeywords.some(kw => checkText.includes(kw));

          if (isTriggered) {
            setVoiceTriggered(true);
            speakVoiceFeedback("Distress phrase detected. NARI SOS activated. Alerting guardians.");
            onManualSOSTrigger();
            setIsVoiceListening(false);
            stopMicHardwareStream();
            if (recognitionRef.current) {
              try { recognitionRef.current.stop(); } catch(e){}
            }
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech Recognition Error:', event.error);
          if (event.error === 'not-allowed') {
            setMicPermissionError('⚠️ Microphone permission blocked by browser. Click the lock/camera icon in your URL bar.');
            setLastTranscript('Mic access blocked.');
            setIsVoiceListening(false);
            stopMicHardwareStream();
          } else if (event.error === 'no-speech') {
            setLastTranscript('Listening... (No speech detected yet. Say "NARI Help")');
          } else if (event.error === 'audio-capture') {
            setMicPermissionError('⚠️ Microphone hardware not detected or currently in use.');
            setIsVoiceListening(false);
            stopMicHardwareStream();
          } else if (event.error === 'network') {
            setLastTranscript('Speech engine network reconnecting...');
          } else {
            setLastTranscript(`Listening... (${event.error || 'active'})`);
          }
        };

        // Auto-reconnect if recognition stops while still active
        recognition.onend = () => {
          if (isVoiceListening && recognitionRef.current && !micPermissionError) {
            try {
              recognition.start();
            } catch (e) {}
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err: any) {
        console.error('Failed to start speech recognition:', err);
        setMicPermissionError('Failed to initialize speech engine in this browser.');
        setIsVoiceListening(false);
        stopMicHardwareStream();
      }

      return () => {
        if (recognitionRef.current === recognition) {
          try { recognition.stop(); } catch(e){}
          recognitionRef.current = null;
        }
      };
    } else {
      stopMicHardwareStream();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
        recognitionRef.current = null;
      }
    }
  }, [isVoiceListening, onManualSOSTrigger]);

  // Voice toggle
  const handleVoiceListenToggle = async () => {
    const nextState = !isVoiceListening;
    if (nextState) {
      setVoiceTriggered(false);
      setLastTranscript('Requesting mic permissions...');
      const granted = await requestMicHardwarePermission();
      if (granted) {
        setIsVoiceListening(true);
        speakVoiceFeedback("NARI Voice wake engine active. Listening for distress keywords.");
      } else {
        setIsVoiceListening(false);
      }
    } else {
      setIsVoiceListening(false);
      stopMicHardwareStream();
      speakVoiceFeedback("Voice listening deactivated.");
    }
  };

  const handleSimulateVoiceCommand = (phrase: string = 'NARI Help') => {
    setVoiceTriggered(true);
    setLastTranscript(phrase);
    setIsVoiceListening(false);
    speakVoiceFeedback(`Simulating voice distress: ${phrase}. SOS triggered.`);
    onManualSOSTrigger();
  };

  // Simulate Acknowledgment from Primary Contact (Tier 1)
  const handleSimulateTier1Ack = () => {
    if (!currentIncident) return;
    const updated = globalEscalationEngine.acknowledgeSOS(
      currentIncident.id,
      'Ananya Dey (Mom - Primary Contact)',
      'TIER_1_PRIMARY',
      'TWILIO_SMS'
    );
    if (updated) {
      setCurrentIncident({ ...updated });
      setSmsGatewayLogs(prev => [
        ...prev,
        `✅ REPLIES ACK RECEIVED from Primary Contact Ananya Dey (+91 98311 00001)!`,
        `🛑 Escalation engine HALTED. Response logged in tamper-evident chain-of-custody audit log.`
      ]);
    }
  };

  // Simulate Acknowledgment from Secondary Contact (Tier 2)
  const handleSimulateTier2Ack = () => {
    if (!currentIncident) return;
    const updated = globalEscalationEngine.acknowledgeSOS(
      currentIncident.id,
      'Debashree G. (Roommate - Secondary Contact)',
      'TIER_2_SECONDARY',
      'PUSH'
    );
    if (updated) {
      setCurrentIncident({ ...updated });
      setSmsGatewayLogs(prev => [
        ...prev,
        `✅ ACKNOWLEDGED by Secondary Contact Debashree G.!`,
        `🛑 Escalation engine HALTED. Response time logged.`
      ]);
    }
  };

  // Simulate Guardian "I Can Help" Response (Tier 4)
  const handleSimulateGuardianResponse = () => {
    if (!currentIncident) return;
    const updated = globalEscalationEngine.guardianRespond(
      currentIncident.id,
      'Dr. Radhika Sharma (0.1km away)'
    );
    if (updated) {
      setCurrentIncident({ ...updated });
      setSmsGatewayLogs(prev => [
        ...prev,
        `🛡️ GUARDIAN OPT-IN: Dr. Radhika Sharma accepted alert & clicked "I Can Help". Live guidance active.`
      ]);
    }
  };

  // Submit Disarm PIN (Safe PIN vs Duress PIN)
  const handleDisarmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentIncident || !inputPin) return;

    const res = globalEscalationEngine.processDisarmPin(currentIncident.id, inputPin);

    if (res.isDuress) {
      // Duress PIN entered! (9999)
      setPinMessage({
        text: '🚨 DURESS CODE MATCHED: UI disarmed for display, but STEALTH POLICE & GUARDIAN ALERT DISPATCHED!',
        isError: true
      });
      setTimeout(() => {
        setShowDisarmModal(false);
        setInputPin('');
        setPinMessage(null);
        if (res.incident) setCurrentIncident({ ...res.incident });
      }, 2500);
    } else if (res.success) {
      // Safe PIN entered! (1234)
      setPinMessage({
        text: '✅ Safe PIN verified. Alarm disarmed and logged.',
        isError: false
      });
      setTimeout(() => {
        setShowDisarmModal(false);
        setInputPin('');
        setPinMessage(null);
        onManualSOSCancel();
      }, 1500);
    } else {
      setPinMessage({
        text: '❌ Invalid PIN code. Try 1234 (Safe) or 9999 (Duress Test).',
        isError: true
      });
    }
  };

  // Manual Test Broadcast
  const handleTestSmsBroadcast = () => {
    setTestSmsSent(true);
    setTimeout(() => setTestSmsSent(false), 3000);
  };

  const handleMainSOSTap = () => {
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    speakVoiceFeedback("Emergency Panic Trigger Activated! Dispatching 4-tier alert loop.");
    onManualSOSTrigger();
  };

  // Contact list management
  const handleAddNewContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName || !newContactPhone) return;

    const newContact: Contact = {
      id: Math.random().toString(),
      name: newContactName,
      phone: newContactPhone,
      relation: newContactRelation,
      isActive: true,
      alertSent: false
    };

    setContacts(prev => [...prev, newContact]);
    setNewContactName('');
    setNewContactPhone('');
  };

  const deleteContact = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  const toggleContactActive = (id: string) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c));
  };

  return (
    <div className="space-y-6" id="nari-chain-of-custody-crisis-center">
      
      {/* HEADER BAR: NETWORK MODE & DURESS INFORMATION */}
      <div className="p-4 bg-[#F9DBBD] border border-[#f0c39c] shadow-sm rounded-2xl flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#FCF6BD] border border-[#f0c39c] text-[#A53860]">
            <Radio className="w-5 h-5 animate-pulse text-[#A53860]" />
          </div>
          <div>
            <h3 className="text-sm font-serif italic text-[#450920] font-bold flex items-center gap-2">
              Chain-of-Custody Escalation Engine & Gateway
            </h3>
            <p className="text-[10px] text-[#450920] font-bold font-mono">
              4-Tier Automatic Alerting Protocol • GSM/Offline Fallback • Duress Stealth Protection
            </p>
          </div>
        </div>

        {/* Controls: GSM Fallback Toggle & Audit Trail Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOfflineGsmMode(!isOfflineGsmMode)}
            className={`px-3.5 py-1.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border shadow-sm ${
              isOfflineGsmMode
                ? 'bg-[#A53860] text-white border-[#A53860]'
                : 'bg-[#FFA5AB] text-[#450920] border-[#f0c39c]'
            }`}
            title="Toggle Cellular Offline GSM SMS Gateway"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mode: {isOfflineGsmMode ? 'Offline GSM SMS' : 'Twilio REST API'}</span>
          </button>

          {currentIncident && (
            <button
              onClick={() => setShowAuditDrawer(!showAuditDrawer)}
              className="px-3.5 py-1.5 bg-[#FFA5AB] hover:bg-[#f78d94] text-[#450920] border border-[#f0c39c] rounded-full text-[10px] font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#A53860]" />
              <span>Evidentiary Audit Log</span>
            </button>
          )}
        </div>
      </div>

      {/* 4-TIER ESCALATION VISUALIZER (ACTIVE WHEN SOS RUNNING) */}
      {isSOSActive && currentIncident && (
        <div className="p-6 rounded-2xl bg-[#080808] border border-rose-500/30 shadow-2xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-400 to-rose-500 animate-pulse"></div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div className="flex items-center gap-2.5">
              <Siren className="w-5 h-5 text-rose-500 animate-bounce" />
              <div>
                <h3 className="text-sm font-serif italic text-white font-bold">
                  Active Escalation State Machine: <span className="text-rose-400 font-mono uppercase">{currentIncident.currentTier}</span>
                </h3>
                <p className="text-[10px] text-white/40 font-mono">
                  Incident ID: {currentIncident.id} • User: {currentIncident.userName}
                </p>
              </div>
            </div>

            {/* Disarm with Code Button */}
            <button
              onClick={() => setShowDisarmModal(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase font-mono tracking-widest rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              Disarm with PIN Code
            </button>
          </div>

          {/* 4 TIER STEPPER CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            
            {/* TIER 1: PRIMARY CONTACT */}
            <div className={`p-4 rounded-xl border transition-all relative ${
              currentIncident.currentTier === 'TIER_1_PRIMARY'
                ? 'bg-rose-500/10 border-rose-500 ring-1 ring-rose-500'
                : currentIncident.acknowledgedBy?.responderTier === 'TIER_1_PRIMARY'
                ? 'bg-emerald-500/10 border-emerald-500'
                : 'bg-black/50 border-white/5 opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-mono uppercase font-bold text-rose-400">
                  TIER 1 (0s)
                </span>
                {currentIncident.currentTier === 'TIER_1_PRIMARY' && (
                  <span className="text-xs font-mono font-bold text-rose-400 animate-pulse">
                    ⏱️ {tier1Timer}s
                  </span>
                )}
              </div>
              <h4 className="text-xs font-bold text-white mb-1">Primary Contact</h4>
              <p className="text-[10px] text-white/50 mb-3 font-sans">
                Ananya Dey (+91 98311 00001)
              </p>

              {currentIncident.currentTier === 'TIER_1_PRIMARY' && (
                <button
                  onClick={handleSimulateTier1Ack}
                  className="w-full py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-[9px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Simulate Primary ACK
                </button>
              )}
            </div>

            {/* TIER 2: SECONDARY CONTACTS */}
            <div className={`p-4 rounded-xl border transition-all relative ${
              currentIncident.currentTier === 'TIER_2_SECONDARY'
                ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500'
                : currentIncident.acknowledgedBy?.responderTier === 'TIER_2_SECONDARY'
                ? 'bg-emerald-500/10 border-emerald-500'
                : 'bg-black/50 border-white/5 opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-mono uppercase font-bold text-amber-400">
                  TIER 2 (+60s)
                </span>
                {currentIncident.currentTier === 'TIER_2_SECONDARY' && (
                  <span className="text-xs font-mono font-bold text-amber-400 animate-pulse">
                    ⏱️ {tier2Timer}s
                  </span>
                )}
              </div>
              <h4 className="text-xs font-bold text-white mb-1">Secondary Contacts</h4>
              <p className="text-[10px] text-white/50 mb-3 font-sans">
                Simultaneous alert to 2 secondary nodes
              </p>

              {currentIncident.currentTier === 'TIER_2_SECONDARY' && (
                <button
                  onClick={handleSimulateTier2Ack}
                  className="w-full py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-[9px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Simulate Secondary ACK
                </button>
              )}
            </div>

            {/* TIER 3: POLICE & EMERGENCY SERVICES */}
            <div className={`p-4 rounded-xl border transition-all relative ${
              currentIncident.currentTier === 'TIER_3_POLICE' || currentIncident.status === 'POLICE_DISPATCHED'
                ? 'bg-rose-600/20 border-rose-500 ring-1 ring-rose-500'
                : 'bg-black/50 border-white/5 opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-mono uppercase font-bold text-rose-400">
                  TIER 3 (+105s)
                </span>
                <Building2 className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <h4 className="text-xs font-bold text-white mb-1">112 Police Dispatch</h4>
              <p className="text-[10px] text-white/50 mb-3 font-sans">
                Non-cancelable high priority dispatch with Live GPS & Trail
              </p>

              {currentIncident.status === 'POLICE_DISPATCHED' && (
                <span className="inline-block w-full text-center py-1 bg-rose-500/20 text-rose-300 font-mono text-[8px] uppercase font-bold rounded">
                  DISPATCHED TO 112
                </span>
              )}
            </div>

            {/* TIER 4: NEARBY GUARDIAN NETWORK (PARALLEL) */}
            <div className={`p-4 rounded-xl border transition-all relative ${
              currentIncident.currentTier === 'TIER_4_GUARDIANS' || currentIncident.guardiansNotifiedCount > 0
                ? 'bg-blue-500/10 border-blue-500 ring-1 ring-blue-500'
                : 'bg-black/50 border-white/5 opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-mono uppercase font-bold text-blue-400">
                  TIER 4 (Parallel)
                </span>
                <Users className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <h4 className="text-xs font-bold text-white mb-1">Nearby Guardians</h4>
              <p className="text-[10px] text-white/50 mb-3 font-sans">
                500m radius opt-in network ({currentIncident.guardiansNotifiedCount} alerted)
              </p>

              {currentIncident.guardiansNotifiedCount > 0 && (
                <button
                  onClick={handleSimulateGuardianResponse}
                  className="w-full py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded-lg text-[9px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Simulate "I Can Help"
                </button>
              )}
            </div>

          </div>

          {/* Acknowledgement Alert Banner */}
          {currentIncident.status === 'ACKNOWLEDGED' && currentIncident.acknowledgedBy && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/40 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                <div>
                  <h4 className="text-xs font-bold text-white font-mono uppercase">
                    Escalation Stopped — Acknowledged by {currentIncident.acknowledgedBy.responderName}
                  </h4>
                  <p className="text-[10px] text-emerald-200/80 font-sans mt-0.5">
                    Response time: {currentIncident.acknowledgedBy.responseTimeSeconds}s • Timestamp: {currentIncident.acknowledgedBy.timestamp}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DISARM PIN MODAL */}
      {showDisarmModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c0c0c] border border-[#C5A059]/40 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl relative">
            <button
              onClick={() => setShowDisarmModal(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <Lock className="w-5 h-5 text-[#C5A059]" />
              <div>
                <h3 className="text-sm font-bold text-white font-mono uppercase">
                  Authentication PIN Required
                </h3>
                <p className="text-[10px] text-white/40 font-mono">
                  Enter 4-Digit Disarm Code to Halt Emergency Engine
                </p>
              </div>
            </div>

            <form onSubmit={handleDisarmSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-white/50 block">
                  Enter Disarm Code *
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={inputPin}
                  onChange={(e) => setInputPin(e.target.value)}
                  placeholder="• • • •"
                  className="w-full text-center text-2xl font-mono tracking-widest bg-black border border-white/20 focus:border-[#C5A059] p-3 rounded-xl text-white focus:outline-none"
                  autoFocus
                  required
                />
              </div>

              {/* Helper Code Legend for Testing */}
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-[10px] font-mono space-y-1">
                <div className="flex justify-between text-emerald-400">
                  <span>Safe Disarm Code:</span>
                  <span className="font-bold">1234</span>
                </div>
                <div className="flex justify-between text-rose-400">
                  <span>Duress Disarm Code (Stealth Alert):</span>
                  <span className="font-bold">9999</span>
                </div>
              </div>

              {pinMessage && (
                <div className={`p-3 rounded-xl text-xs font-mono ${
                  pinMessage.isError ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {pinMessage.text}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDisarmModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 font-mono text-xs uppercase rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#C5A059] text-black font-bold text-xs uppercase font-mono tracking-wider rounded-xl hover:bg-[#FFE259] transition-all"
                >
                  Verify PIN Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AUDIT TRAIL DRAWER / MODAL */}
      {showAuditDrawer && currentIncident && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#090909] border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] flex flex-col justify-between space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#C5A059]" />
                <h3 className="text-sm font-bold text-white font-mono uppercase">
                  Chain-of-Custody Tamper-Evident Audit Logs
                </h3>
              </div>
              <button onClick={() => setShowAuditDrawer(false)} className="text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Audit log list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 max-h-[400px] font-mono text-xs">
              {currentIncident.auditTrail.map((log) => (
                <div key={log.id} className="p-3 bg-black border border-white/5 rounded-xl space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-[#C5A059] font-bold">[{log.tier}] {log.eventType}</span>
                    <span className="text-white/40">{log.timestamp}</span>
                  </div>
                  <p className="text-white/80 leading-normal">{log.details}</p>
                  <div className="flex justify-between items-center text-[9px] text-white/30 pt-1 border-t border-white/5">
                    <span>Actor: {log.actor} • Channel: {log.channel}</span>
                    <span className="text-emerald-400/70 font-mono">SHA-256: {log.signatureHash}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-white/5 flex justify-between items-center">
              <span className="text-[10px] font-mono text-white/40">
                Cryptographically Signed for Legal & Forensic Chain-of-Custody
              </span>
              <button
                onClick={() => setShowAuditDrawer(false)}
                className="px-4 py-1.5 bg-white/10 text-white font-mono text-xs uppercase rounded-lg"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN TWO-COLUMN DISPATCH DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="crisis-center-panel">
        
        {/* LEFT COLUMN: SOS PANIC DISPATCH SHIELD */}
        <div className="p-6 bg-[#F9DBBD] rounded-2xl border border-[#f0c39c] shadow-sm flex flex-col justify-between h-full space-y-6">
          <div>
            <h3 className="text-sm font-bold text-[#450920] uppercase tracking-wider mb-1 flex items-center gap-1.5 font-mono">
              <ShieldAlert className="w-4 h-4 text-[#A53860] animate-pulse" />
              Tactile Crisis Dispatch Center
            </h3>
            <p className="text-[10px] text-[#450920] font-bold font-mono">1-Tap panic button with zero latency trigger</p>
          </div>

          {/* Auto trigger stress warning */}
          {isTriggeringAuto && (
            <div className="p-4 bg-[#FCF6BD] border border-[#A53860] rounded-xl flex items-center justify-between gap-3 animate-pulse">
              <div>
                <span className="text-[9px] font-mono font-bold text-[#A53860] block uppercase">Critical Biometric Trigger</span>
                <p className="text-[11px] text-[#450920] font-bold mt-0.5">{autoTriggerCause}</p>
              </div>
              <div className="text-center bg-[#A53860] text-white px-3 py-1.5 rounded-lg flex flex-col items-center">
                <span className="text-xs font-bold leading-none font-mono">0:0{cancelCountdown}</span>
                <button 
                  onClick={onManualSOSCancel} 
                  className="text-[8px] uppercase tracking-widest font-extrabold mt-1 text-[#FCF6BD] underline"
                >
                  DISARM
                </button>
              </div>
            </div>
          )}

          {/* SOS TAP BUTTON WITH CLEAN BALANCED SPACING */}
          <div className="py-6 flex flex-col items-center justify-center">
            {isSOSActive ? (
              <button
                onClick={() => setShowDisarmModal(true)}
                className="w-48 h-48 rounded-full border-4 border-[#450920] bg-[#A53860] flex flex-col items-center justify-center text-white cursor-pointer select-none relative animate-pulse shadow-md transition-all duration-300 transform active:scale-95"
              >
                <Siren className="w-12 h-12 text-white animate-bounce" />
                <span className="text-2xl font-serif tracking-tight italic mt-2 font-bold text-white">ACTIVE SOS</span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest mt-1 text-[#FCF6BD]">Tap to Disarm PIN</span>
              </button>
            ) : (
              <button
                onClick={handleMainSOSTap}
                className="w-48 h-48 rounded-full border-4 border-[#A53860] bg-[#A53860] hover:bg-[#8c2e50] flex flex-col items-center justify-center text-white cursor-pointer select-none relative shadow-md hover:shadow-lg transition-all duration-300 transform active:scale-95 group"
              >
                <div className="absolute inset-3 rounded-full border border-white/40 animate-pulse"></div>
                <BellRing className="w-12 h-12 text-white group-hover:scale-110 transition-all" />
                <span className="text-2xl font-serif tracking-tight italic mt-2 text-white font-bold">TAP SOS</span>
                <span className="text-[10px] font-mono uppercase tracking-widest mt-1 text-[#FCF6BD] font-bold">1-Touch Alarm</span>
              </button>
            )}
          </div>

          {/* Voice Wake & Siren Controls */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleVoiceListenToggle}
              className={`p-3 rounded-xl border flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
                isVoiceListening 
                  ? 'bg-[#A53860] border-[#A53860] text-white ring-2 ring-[#A53860]' 
                  : 'bg-[#FCF6BD] border-[#f0c39c] text-[#450920] hover:border-[#A53860]'
              }`}
            >
              <Mic className={`w-4 h-4 ${isVoiceListening ? 'text-white animate-bounce' : 'text-[#A53860]'}`} />
              <div className="text-left font-sans">
                <span className={`text-[10px] font-bold block leading-none ${isVoiceListening ? 'text-white' : 'text-[#450920]'}`}>Voice Wake Engine</span>
                <span className={`text-[8px] font-bold font-mono ${isVoiceListening ? 'text-white/80' : 'text-[#450920]'}`}>
                  {isVoiceListening ? 'Listening Continuous...' : 'Click to Activate'}
                </span>
              </div>
            </button>

            <button
              onClick={() => setIsSirenOn(!isSirenOn)}
              className={`p-3 rounded-xl border flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
                isSirenOn 
                  ? 'bg-[#A53860] border-[#A53860] text-white ring-2 ring-[#A53860] animate-pulse' 
                  : 'bg-[#FCF6BD] border-[#f0c39c] text-[#450920] hover:border-[#A53860]'
              }`}
            >
              <Volume2 className={`w-4 h-4 ${isSirenOn ? 'text-white animate-bounce' : 'text-[#A53860]'}`} />
              <div className="text-left font-sans">
                <span className={`text-[10px] font-bold block leading-none ${isSirenOn ? 'text-white' : 'text-[#450920]'}`}>95dB Audio Siren</span>
                <span className={`text-[8px] font-bold font-mono ${isSirenOn ? 'text-white/80' : 'text-[#450920]'}`}>
                  {isSirenOn ? 'Alarm Active 🔊' : 'Siren Muted'}
                </span>
              </div>
            </button>
          </div>

          {/* SIREN AUDIO ENGINE CONFIGURATION PANEL */}
          <div className="p-3.5 bg-[#FCF6BD] border border-[#f0c39c] rounded-xl space-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b border-[#f0c39c] pb-1.5">
              <span className="text-[9px] font-mono font-bold text-[#450920] uppercase tracking-widest flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-[#A53860]" />
                Web Audio Siren Synthesizer
              </span>
              <span className="text-[9px] font-mono text-[#A53860] font-bold">
                {isSirenOn || isSOSActive ? 'OSCILLATOR ACTIVE' : 'READY'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
              {/* Tone Type Selector */}
              <div>
                <label className="text-[8.5px] font-mono font-bold uppercase text-[#450920] block mb-1">
                  Siren Tone Waveform:
                </label>
                <div className="flex gap-1">
                  {(['SWEEP', 'PULSE', 'BEEP'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSirenToneType(type)}
                      className={`flex-1 py-1 text-[8.5px] font-mono font-bold rounded uppercase border transition-all shadow-sm ${
                        sirenToneType === type
                          ? 'bg-[#A53860] text-white border-[#A53860]'
                          : 'bg-white text-[#450920] border-[#f0c39c] hover:bg-[#FFA5AB]/30'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Volume Slider */}
              <div>
                <div className="flex justify-between text-[8.5px] font-mono font-bold uppercase text-[#450920] mb-1">
                  <span>Siren Volume:</span>
                  <span className="text-[#450920] font-bold">{Math.round(sirenVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={sirenVolume}
                  onChange={(e) => setSirenVolume(parseFloat(e.target.value))}
                  className="w-full accent-[#A53860] h-1.5 bg-[#f0c39c] rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* VOICE RECOGNITION & TTS SPEECH SYSTEM PANEL */}
          <div className="p-3.5 rounded-xl border border-[#f0c39c] bg-[#FCF6BD] space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold text-[#450920] uppercase tracking-widest flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-[#A53860]" />
                Voice Recognition & Speech System
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={requestMicHardwarePermission}
                  className="text-[8.5px] px-2 py-0.5 rounded-full font-mono font-bold uppercase transition-all bg-[#FFA5AB] text-[#450920] border border-[#f0c39c] hover:bg-[#f78d94] cursor-pointer shadow-sm"
                  title="Test or Grant Microphone Permission"
                >
                  Test Mic Stream 🎙️
                </button>
                <button
                  type="button"
                  onClick={() => setTtsEnabled(!ttsEnabled)}
                  className={`text-[8.5px] px-2 py-0.5 rounded-full font-mono font-bold uppercase transition-all cursor-pointer shadow-sm ${
                    ttsEnabled ? 'bg-[#A53860] text-white border border-[#A53860]' : 'bg-white text-[#450920] border border-[#f0c39c]'
                  }`}
                  title="Toggle Text-to-Speech Verbal Confirmation"
                >
                  TTS: {ttsEnabled ? 'On 🗣️' : 'Muted'}
                </button>
              </div>
            </div>

            {/* Error Banner for Permission or Hardware Issues */}
            {micPermissionError && (
              <div className="p-2.5 bg-[#A53860]/10 border border-[#A53860] rounded-lg text-[#450920] text-[10px] font-mono flex items-start gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 text-[#A53860] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p>{micPermissionError}</p>
                  <button
                    type="button"
                    onClick={requestMicHardwarePermission}
                    className="underline text-[#A53860] font-bold hover:text-[#8c2e50] cursor-pointer"
                  >
                    Click here to grant microphone access
                  </button>
                </div>
              </div>
            )}

            {/* Live Audio Volume VU Meter */}
            {isVoiceListening && (
              <div className="space-y-1 p-2 bg-[#F9DBBD] rounded-lg border border-[#f0c39c]">
                <div className="flex justify-between items-center text-[9px] font-mono text-[#450920] font-bold">
                  <span className="flex items-center gap-1">
                    <Radio className="w-3 h-3 text-[#A53860] animate-pulse" />
                    Microphone Input Level:
                  </span>
                  <span>{micAudioLevel}% dB</span>
                </div>
                <div className="w-full bg-[#FCF6BD] h-2 rounded-full overflow-hidden p-0.5 border border-[#f0c39c]">
                  <div
                    className="h-full bg-[#A53860] rounded-full transition-all duration-75"
                    style={{ width: `${Math.max(5, micAudioLevel)}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-white border border-[#f0c39c]">
              <div className="shrink-0 pt-0.5">
                <Mic className={`w-3.5 h-3.5 ${isVoiceListening ? 'text-[#A53860] animate-pulse' : 'text-[#450920]'}`} />
              </div>
              <div className="flex-1 space-y-0.5">
                <span className="text-[9px] font-mono text-[#450920] font-bold uppercase block leading-none">
                  Live Voice Transcript
                </span>
                <p className={`font-mono text-[10px] break-all leading-tight ${
                  voiceTriggered ? 'text-[#A53860] font-bold' : lastTranscript ? 'text-[#450920] font-bold' : 'text-[#450920]/70 italic font-semibold'
                }`}>
                  {voiceTriggered ? '🚨 Distress Keyword Matched -> SOS TRIGGERED!' : lastTranscript || 'Click Voice Wake Engine or speak keyword...'}
                </p>
              </div>
            </div>

            {/* Keyword Chips & Quick Simulation Trigger Buttons */}
            <div className="space-y-1 pt-1 border-t border-[#f0c39c]">
              <span className="text-[8.5px] font-mono text-[#450920] font-bold block">
                Recognized Distress Keywords (English & Regional):
              </span>
              <div className="flex flex-wrap gap-1">
                {['"NARI Help"', '"Help Me"', '"Emergency"', '"Save Me"', '"Call Police"', '"Madad"', '"Bachao"'].map((phrase) => (
                  <button
                    key={phrase}
                    type="button"
                    onClick={() => handleSimulateVoiceCommand(phrase.replace(/"/g, ''))}
                    className="px-2 py-0.5 bg-[#FFA5AB] hover:bg-[#f78d94] text-[#450920] border border-[#f0c39c] rounded text-[8.5px] font-mono font-bold transition-all cursor-pointer shadow-sm"
                  >
                    Simulate {phrase}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: GUARDIAN DIRECTORY & SMS BROADCAST SIMULATOR */}
        <div className="p-6 bg-[#F9DBBD] rounded-2xl border border-[#f0c39c] shadow-sm flex flex-col justify-between h-full min-h-[440px] space-y-4">
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-[#450920] uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Users className="w-4 h-4 text-[#A53860]" />
                Guardian Directory & SMS Gateway
              </h3>
              <button
                onClick={handleTestSmsBroadcast}
                className="px-2.5 py-1 bg-[#FFA5AB] hover:bg-[#f78d94] text-[#450920] border border-[#f0c39c] rounded-lg text-[9px] font-mono font-bold uppercase transition-all flex items-center gap-1 cursor-pointer shadow-sm"
              >
                <Send className="w-3 h-3 text-[#A53860]" />
                <span>Test SMS Broadcast</span>
              </button>
            </div>
            <p className="text-[10px] text-[#450920] font-bold font-mono">Pre-configured contacts notified instantly on SOS alert</p>
          </div>

          {/* Test SMS Feedback Banner */}
          {testSmsSent && (
            <div className="p-3 rounded-xl bg-[#FCF6BD] border border-[#A53860] text-[#450920] font-mono text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#A53860] shrink-0" />
              <span>Simulated SMS Broadcast: "HELP: I am in distress" + Live GPS link sent to 3 contacts!</span>
            </div>
          )}

          {/* Contact List */}
          <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[180px] pr-1">
            {contacts.map((c) => (
              <div key={c.id} className="p-2.5 bg-[#FCF6BD] border border-[#f0c39c] rounded-xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <input 
                    type="checkbox" 
                    checked={c.isActive}
                    onChange={() => toggleContactActive(c.id)}
                    className="w-3.5 h-3.5 text-[#A53860] bg-white border-[#f0c39c] rounded focus:ring-[#A53860]"
                  />
                  <div>
                    <h4 className="font-bold text-[#450920] flex items-center gap-1.5">
                      {c.name}
                      <span className="text-[8px] font-mono font-bold px-2 py-0.2 rounded-full bg-[#F9DBBD] text-[#450920] border border-[#f0c39c]">
                        {c.relation}
                      </span>
                    </h4>
                    <p className="text-[10px] text-[#450920] font-bold font-mono mt-0.5">{c.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isSOSActive && c.isActive && (
                    <span className="text-[9px] font-mono font-bold text-[#A53860] flex items-center gap-1 bg-[#FFA5AB] px-2 py-0.5 rounded border border-[#f0c39c]">
                      <CheckCircle2 className="w-3 h-3 text-[#A53860]" />
                      SMS Sent
                    </span>
                  )}
                  
                  <button 
                    onClick={() => deleteContact(c.id)}
                    className="p-1 rounded hover:bg-[#FFA5AB] text-[#450920] transition-all shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Contact Form */}
          <form onSubmit={handleAddNewContact} className="p-3.5 bg-[#FCF6BD] border border-[#f0c39c] rounded-xl space-y-2.5 text-xs">
            <span className="text-[9px] font-mono font-bold text-[#450920] uppercase tracking-widest block">
              Add Guardian Node
            </span>
            
            <div className="grid grid-cols-2 gap-2">
              <input 
                type="text" 
                placeholder="Full Name" 
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                className="bg-white border border-[#f0c39c] p-2 rounded-lg text-[#450920] font-sans text-xs focus:outline-none focus:border-[#A53860] placeholder-[#450920]/40 font-semibold"
                required
              />
              <input 
                type="tel" 
                placeholder="e.g. +91 90000..." 
                value={newContactPhone}
                onChange={(e) => setNewContactPhone(e.target.value)}
                className="bg-white border border-[#f0c39c] p-2 rounded-lg text-[#450920] font-sans text-xs focus:outline-none focus:border-[#A53860] placeholder-[#450920]/40 font-semibold"
                required
              />
            </div>

            <div className="flex items-center justify-between gap-2.5">
              <select
                value={newContactRelation}
                onChange={(e) => setNewContactRelation(e.target.value)}
                className="bg-white border border-[#f0c39c] p-1.5 rounded-lg text-[10px] text-[#450920] font-bold focus:outline-none"
              >
                <option value="Primary Guardian (Tier 1)">Primary Guardian (Tier 1)</option>
                <option value="Secondary Guard (Tier 2)">Secondary Guard (Tier 2)</option>
                <option value="Peer Guard">Peer Guard</option>
                <option value="Campus Safety">Campus Safety</option>
              </select>

              <button
                type="submit"
                className="bg-[#A53860] text-white hover:bg-[#8c2e50] px-3.5 py-1.5 rounded-full text-[10px] font-bold transition-all uppercase tracking-wider shadow-sm cursor-pointer"
              >
                Add Guardian Node
              </button>
            </div>
          </form>

          {/* REAL SMS GATEWAY BROADCAST PAYLOAD PREVIEW & TERMINAL */}
          <div className="p-3 bg-[#FCF6BD] border border-[#f0c39c] rounded-xl space-y-2 text-xs">
            <div className="flex justify-between items-center text-[9px] font-mono text-[#450920] border-b border-[#f0c39c] pb-1 font-bold">
              <span>SMS GATEWAY DISPATCH LOG</span>
              <span className="text-[#A53860]">
                {isOfflineGsmMode ? 'GSM CELLULAR HARDWARE' : 'TWILIO CLOUD GATEWAY'}
              </span>
            </div>

            {smsGatewayLogs.length > 0 ? (
              <div className="space-y-1 font-mono text-[9px] text-[#450920] max-h-[90px] overflow-y-auto font-bold">
                {smsGatewayLogs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-1">
                    <span className="text-[#A53860]">&gt;</span>
                    <span className="break-all">{log}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] italic leading-relaxed text-[#450920] font-mono font-bold">
                &ldquo;🚨 HELP: I am in distress! - Priya Sharma. Live GPS: <strong className="text-[#A53860]">https://maps.google.com/?q=22.5726,88.3639</strong>. Landmark: Central Metro Gate 3. Reply ACK to confirm safety.&rdquo;
              </p>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
