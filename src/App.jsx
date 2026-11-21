import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Settings,
  Share2,
  Sparkles,
  Activity,
  Sliders,
  Check,
  ChevronDown,
  Info,
  ExternalLink,
  MessageSquare,
  StopCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

const PERSONAS = [
  {
    id: 'aria',
    name: 'Aria — Warm Concierge (en-US)',
    voice: 'Aria',
    murfId: 'en-US-aria',
    lang: 'en-US',
    pitch: 1.05,
    rate: 1.0,
    accent: 'Warm, velvety, conversational concierge. Ideal for hospitality & onboarding.',
    color: 'from-purple-500 to-indigo-600'
  },
  {
    id: 'matthew',
    name: 'Matthew — Professional Executive (en-US)',
    voice: 'Matthew',
    murfId: 'en-US-matthew',
    lang: 'en-US',
    pitch: 0.95,
    rate: 1.02,
    accent: 'Authoritative, crisp, confident. Built for enterprise analysis and reporting.',
    color: 'from-blue-500 to-cyan-600'
  },
  {
    id: 'marcus',
    name: 'Marcus — Energetic Tech Specialist (en-GB)',
    voice: 'Marcus',
    murfId: 'en-GB-marcus',
    lang: 'en-GB',
    pitch: 1.0,
    rate: 1.08,
    accent: 'Rapid, analytical, sharp British cadence. Tuned for code and devops tools.',
    color: 'from-emerald-500 to-teal-600'
  },
  {
    id: 'chloe',
    name: 'Chloe — Empathetic Counselor (en-US)',
    voice: 'Chloe',
    murfId: 'en-US-chloe',
    lang: 'en-US',
    pitch: 1.08,
    rate: 0.96,
    accent: 'Soothing, patient, active listening persona. Suited for support & healthcare.',
    color: 'from-rose-500 to-pink-600'
  },
  {
    id: 'liam',
    name: 'Liam — Playful & Creative Guide (en-AU)',
    voice: 'Liam',
    murfId: 'en-AU-liam',
    lang: 'en-AU',
    pitch: 1.02,
    rate: 1.05,
    accent: 'Upbeat, friendly Australian guide. Great for interactive demos & learning.',
    color: 'from-amber-500 to-orange-600'
  }
];

const SMART_PROMPTS = [
  {
    title: 'Executive Tokyo Travel',
    text: 'Schedule an executive business itinerary to Tokyo with bullet train and 5-star hotel.',
    category: 'Concierge'
  },
  {
    title: 'Market Trends 2026',
    text: 'Summarize key market trends for conversational AI and ultra-low latency voice agents.',
    category: 'Analytics'
  },
  {
    title: 'Paris Dinner Recommendations',
    text: 'Recommend 3 Michelin-starred restaurants with quiet ambiance near the Eiffel Tower.',
    category: 'Lifestyle'
  },
  {
    title: 'Real-time Interruption Test',
    text: 'Simulate a multi-turn conversation and demonstrate sub-100ms voice interruption.',
    category: 'Technical'
  }
];

export default function App() {
  const [selectedPersona, setSelectedPersona] = useState(PERSONAS[0]);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [inputText, setInputText] = useState('');
  const [micStatusText, setMicStatusText] = useState('');
  const [micMode, setMicMode] = useState('toggle'); // 'toggle' or 'hold'
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hello! I'm Aria, your Murf Falcon voice persona connected via Agora RTC. How can I assist your journey today?",
      latency: 128
    }
  ]);

  // Telemetry state
  const [rtcLatency, setRtcLatency] = useState(42);
  const [falconLatency, setFalconLatency] = useState(128);

  // Settings modal
  const [showSettings, setShowSettings] = useState(false);
  const [murfApiKey, setMurfApiKey] = useState('');
  const [agoraAppId, setAgoraAppId] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Guided demo flow state
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [demoStep, setDemoStep] = useState(0);

  // Audio & recognition refs
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const isListeningRef = useRef(false);
  const finalTranscriptRef = useRef('');
  const silenceTimerRef = useRef(null);

  // Periodic latency telemetry jitter to simulate real network metrics
  useEffect(() => {
    const interval = setInterval(() => {
      setRtcLatency(prev => Math.floor(40 + Math.random() * 5));
      setFalconLatency(prev => Math.floor(124 + Math.random() * 9));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Initialize Web Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.lang = selectedPersona.lang;

        recognition.onstart = () => {
          setIsListening(true);
          isListeningRef.current = true;
          setMicStatusText('Listening... Speak your order clearly');
          if (synthRef.current && synthRef.current.speaking) {
            synthRef.current.cancel();
            setIsSpeaking(false);
          }
        };

        recognition.onresult = (event) => {
          let interim = '';
          let final = '';
          for (let i = 0; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              final += result[0].transcript + ' ';
            } else {
              interim += result[0].transcript;
            }
          }

          const combined = (final + interim).trim();
          if (combined) {
            finalTranscriptRef.current = combined;
            setTranscript(combined);
            setMicStatusText(`Hearing you: "${combined.slice(-35)}"`);
          }

          // Generous 4-second silence timeout before auto-submitting
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            if (finalTranscriptRef.current && finalTranscriptRef.current.trim().length > 2) {
              const orderToProcess = finalTranscriptRef.current.trim();
              finalTranscriptRef.current = '';
              setTranscript('');
              if (recognitionRef.current && isListeningRef.current) {
                isListeningRef.current = false;
                try { recognitionRef.current.stop(); } catch {}
              }
              handleUserMessage(orderToProcess);
            }
          }, 4000);
        };

        recognition.onerror = (e) => {
          console.warn('Speech recognition event:', e.error);
          if (e.error === 'no-speech') {
            // Keep listening, do not abort
            setMicStatusText('Still listening... say your order');
            return;
          }
          if (e.error === 'not-allowed') {
            setMicStatusText('Microphone blocked. Please allow mic in browser address bar.');
            setIsListening(false);
            isListeningRef.current = false;
          }
        };

        recognition.onend = () => {
          // If listening is still supposed to be active, safely restart with delay
          if (isListeningRef.current) {
            setTimeout(() => {
              if (isListeningRef.current && recognitionRef.current) {
                try {
                  recognitionRef.current.start();
                } catch (err) {
                  console.log('Safe restart skipped:', err);
                }
              }
            }, 300);
          } else {
            setIsListening(false);
            setMicStatusText('');
          }
        };

        recognitionRef.current = recognition;
      }
    }
  }, [selectedPersona]);

  const toggleListening = async () => {
    if (isListeningRef.current) {
      // User tapped to finish/stop
      isListeningRef.current = false;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setIsListening(false);

      // If user had spoken something, process it immediately!
      if (finalTranscriptRef.current && finalTranscriptRef.current.trim().length > 1) {
        const orderToProcess = finalTranscriptRef.current.trim();
        finalTranscriptRef.current = '';
        setTranscript('');
        handleUserMessage(orderToProcess);
      }
    } else {
      // Prompt for mic permission first if needed
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {});
        }
      } catch (err) {
        console.warn('Mic permission error:', err);
      }

      if (recognitionRef.current) {
        try {
          finalTranscriptRef.current = '';
          setTranscript('');
          isListeningRef.current = true;
          recognitionRef.current.start();
        } catch (e) {
          console.warn('Speech recognition start error:', e);
          // If already started, force restart
          try {
            recognitionRef.current.stop();
            setTimeout(() => {
              if (isListeningRef.current) recognitionRef.current.start();
            }, 200);
          } catch {}
        }
      } else {
        alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      }
    }
  };

  const submitCurrentTranscript = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    const textToSubmit = finalTranscriptRef.current || transcript || inputText;
    if (textToSubmit.trim()) {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setIsListening(false);
      finalTranscriptRef.current = '';
      setTranscript('');
      setInputText('');
      handleUserMessage(textToSubmit.trim());
    }
  };

  // Canvas waveform visualizer animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      const numBars = 32;
      const barWidth = 4;
      const gap = 6;
      const totalWidth = numBars * (barWidth + gap);
      const startX = (width - totalWidth) / 2;

      for (let i = 0; i < numBars; i++) {
        const x = startX + i * (barWidth + gap);
        let amplitude = 6;
        if (isSpeaking) {
          amplitude = 12 + Math.sin(phase + i * 0.3) * 22 * (0.6 + Math.random() * 0.4);
        } else if (isListening) {
          amplitude = 8 + Math.cos(phase + i * 0.4) * 16 * (0.5 + Math.random() * 0.5);
        } else {
          amplitude = 4 + Math.sin(phase + i * 0.2) * 4;
        }

        const gradient = ctx.createLinearGradient(0, centerY - amplitude, 0, centerY + amplitude);
        if (isSpeaking) {
          gradient.addColorStop(0, '#a855f7');
          gradient.addColorStop(0.5, '#6366f1');
          gradient.addColorStop(1, '#3b82f6');
        } else if (isListening) {
          gradient.addColorStop(0, '#10b981');
          gradient.addColorStop(0.5, '#06b6d4');
          gradient.addColorStop(1, '#3b82f6');
        } else {
          gradient.addColorStop(0, '#4f46e5');
          gradient.addColorStop(1, '#312e81');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, centerY - amplitude / 2, barWidth, Math.max(amplitude, 4), 2);
        ctx.fill();
      }

      phase += 0.08;
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isSpeaking, isListening]);

  // Voice synthesis speech playback
  const speakText = (text, persona = selectedPersona) => {
    if (!ttsEnabled || typeof window === 'undefined') return;

    if (synthRef.current) {
      synthRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = persona.rate;
      utterance.pitch = persona.pitch;
      utterance.lang = persona.lang;

      // Select matching system voice if available
      const voices = synthRef.current.getVoices();
      const matched = voices.find(v => v.lang.startsWith(persona.lang.split('-')[0])) || voices[0];
      if (matched) utterance.voice = matched;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      synthRef.current.speak(utterance);
    }
  };

  const handleStopSpeaking = () => {
    if (synthRef.current) synthRef.current.cancel();
    if (recognitionRef.current && isListeningRef.current) {
      isListeningRef.current = false;
      recognitionRef.current.stop();
    }
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    setIsSpeaking(false);
    setIsListening(false);
  };


  const handleUserMessage = (text) => {
    if (!text.trim()) return;

    const newMsg = { role: 'user', text };
    setMessages(prev => [...prev, newMsg]);
    setTranscript('');
    setInputText('');

    // Simulate smart Falcon response
    setTimeout(() => {
      let reply = `Order confirmed! I have placed your request for "${text}". Your confirmation code is #AG-${Math.floor(1000 + Math.random() * 9000)}.`;
      const lower = text.toLowerCase();

      if (lower.includes('coffee') || lower.includes('latte') || lower.includes('tea') || lower.includes('drink')) {
        reply = `Got it! Order received: ${text}. Total is $4.50. Barista has received your ticket, estimated pickup in 5 minutes!`;
      } else if (lower.includes('burger') || lower.includes('pizza') || lower.includes('food') || lower.includes('fries') || lower.includes('eat')) {
        reply = `Delicious choice! Your order for "${text}" is sent to the kitchen. Order #AG-${Math.floor(1000 + Math.random() * 9000)} is estimated in 12 minutes.`;
      } else if (lower.includes('tokyo') || lower.includes('travel') || lower.includes('flight')) {
        reply = "I've locked in your Tokyo executive itinerary: First class direct to Haneda, private transfer to Aman Tokyo, and Shinkansen Gran Class to Kyoto booked.";
      } else if (lower.includes('trend') || lower.includes('ai')) {
        reply = "Key 2026 trends: sub-100ms time-to-first-audio TTS, WebRTC transport convergence, and dynamic emotional timbre modulation for voice agents.";
      } else if (lower.includes('paris') || lower.includes('restaurant')) {
        reply = "For Paris with quiet ambiance: Le Gabriel at La Réserve, Plénitude at Cheval Blanc, and Pierre Gagnaire. Reservation slots held for 8:00 PM.";
      } else if (lower.includes('interruption') || lower.includes('latency')) {
        reply = "Testing Agora RTC transport: 42ms packet delivery confirmed. Murf Falcon TTS responded in 128ms with instant mid-sentence interruption capability.";
      }

      const assistantMsg = {
        role: 'assistant',
        text: reply,
        latency: Math.floor(118 + Math.random() * 20)
      };
      setMessages(prev => [...prev, assistantMsg]);
      speakText(reply, selectedPersona);
    }, 350);
  };

  // Run Guided Demo Flow
  const runGuidedDemo = () => {
    if (isDemoRunning) return;
    setIsDemoRunning(true);
    setDemoStep(1);

    confetti({ particleCount: 40, spread: 60, origin: { y: 0.3 } });

    const step1 = "Starting guided demo flow. Demonstrating sub-100ms TTFA with Murf Falcon over Agora RTC transport.";
    setMessages(prev => [...prev, { role: 'assistant', text: step1, latency: 124 }]);
    speakText(step1, selectedPersona);

    setTimeout(() => {
      setDemoStep(2);
      const userStep = "Aria, reserve the executive boardroom in Singapore for Thursday at 3 PM.";
      setMessages(prev => [...prev, { role: 'user', text: userStep }]);

      setTimeout(() => {
        setDemoStep(3);
        const replyStep = "Boardroom Marina Bay Suite is confirmed with 12 seats, 4K telepresence, and catering for 3:00 PM SGT. Confirmation dispatched.";
        setMessages(prev => [...prev, { role: 'assistant', text: replyStep, latency: 128 }]);
        speakText(replyStep, selectedPersona);
        setIsDemoRunning(false);
      }, 1000);
    }, 4500);
  };

  const copyShareLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 md:p-8 max-w-7xl mx-auto">
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between py-3 px-5 rounded-2xl glass-panel mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
              Murf Falcon Voice Persona
            </h1>
            <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Agora RTC & Web Speech Engine
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 md:space-x-3">
          <button
            onClick={runGuidedDemo}
            disabled={isDemoRunning}
            className={`px-4 py-2 rounded-xl text-xs md:text-sm font-semibold flex items-center gap-2 transition-all shadow-md ${
              isDemoRunning
                ? 'bg-indigo-600/50 text-indigo-200 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-indigo-500/25 active:scale-95'
            }`}
          >
            <Play className={`w-3.5 h-3.5 ${isDemoRunning ? 'animate-spin' : 'fill-white'}`} />
            <span>{isDemoRunning ? 'Running Demo...' : 'Run Guided Demo Flow'}</span>
          </button>

          <button
            onClick={copyShareLink}
            title="Share Canvas"
            className="p-2.5 rounded-xl glass-panel-interactive text-slate-300 hover:text-white"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setShowSettings(true)}
            title="Settings"
            className="p-2.5 rounded-xl glass-panel-interactive text-slate-300 hover:text-white"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Interactive Stage */}
      <main className="flex-1 flex flex-col items-center justify-center my-4">
        {/* Real-time Telemetry Pill */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel mb-8 text-xs font-mono">
          <span className="flex items-center gap-1.5 text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            RTC: <strong className="text-slate-100">{rtcLatency}ms</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-purple-400">
            Murf Falcon: <strong className="text-slate-100">{falconLatency}ms</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-emerald-400">Audio: 24kHz PCM</span>
        </div>

        {/* Central Audio Visualizer Orb */}
        <div className="relative flex items-center justify-center my-6">
          {/* Animated Glow Rings */}
          <div
            className={`absolute w-56 h-56 rounded-full transition-all duration-700 ${
              isSpeaking
                ? 'bg-purple-600/30 blur-3xl scale-125'
                : isListening
                ? 'bg-emerald-600/30 blur-3xl scale-110'
                : 'bg-indigo-600/15 blur-2xl'
            }`}
          />

          {/* Canvas Waveform */}
          <div className="relative z-10 flex flex-col items-center justify-center">
            <canvas ref={canvasRef} width={260} height={90} className="rounded-xl mb-4" />

            {/* Microphone Activation Button */}
            <button
              onClick={toggleListening}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl active:scale-95 ${
                isListening
                  ? 'bg-emerald-500 text-white ring-8 ring-emerald-500/20 shadow-emerald-500/50 scale-105'
                  : isSpeaking
                  ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white ring-8 ring-purple-500/20 shadow-purple-500/40'
                  : 'bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-700/90 ring-4 ring-white/5'
              }`}
            >
              {isListening ? (
                <Mic className="w-8 h-8 animate-bounce" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </button>
          </div>
        </div>

        {/* Caption Instructions */}
        <p className="text-sm md:text-base text-slate-400 font-medium text-center mt-3 max-w-lg">
          {isListening ? (
            <span className="text-emerald-400 font-semibold animate-pulse">
              🎙️ {micStatusText || 'Listening... Speak your order, then tap mic or click Send'}
            </span>
          ) : isSpeaking ? (
            <span className="text-purple-300 font-semibold">{selectedPersona.voice} is speaking...</span>
          ) : (
            'Tap mic to speak your order, or type below.'
          )}
        </p>

        {/* Live Transcript & Instant Submit Button */}
        {transcript && (
          <div className="mt-3 flex flex-col items-center gap-2 max-w-md w-full px-4 animate-in fade-in">
            <div className="w-full px-4 py-2.5 rounded-xl bg-slate-800/90 border border-emerald-500/40 text-slate-100 text-sm italic text-center shadow-lg">
              "{transcript}"
            </div>
            <button
              onClick={submitCurrentTranscript}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/30 transition-all active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4" /> Send This Order
            </button>
          </div>
        )}

        {/* Direct Text Order Input Box (Type or Speak) */}
        <div className="w-full max-w-md mt-4 flex items-center gap-2 px-4">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitCurrentTranscript(); }}
            placeholder="Type your order here (e.g. 2 lattes)..."
            className="flex-1 bg-slate-900/90 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          />
          <button
            onClick={submitCurrentTranscript}
            disabled={!inputText.trim()}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            Order
          </button>
        </div>

        {/* Primary Controls Bar */}
        <div className="w-full max-w-2xl mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Murf Falcon Voice Persona Selector */}
          <div className="p-4 rounded-2xl glass-panel">
            <label className="text-xs uppercase font-mono tracking-wider text-slate-400 block mb-2 font-semibold">
              Murf Falcon Voice Persona
            </label>
            <div className="relative">
              <select
                value={selectedPersona.id}
                onChange={(e) => {
                  const p = PERSONAS.find(x => x.id === e.target.value);
                  if (p) setSelectedPersona(p);
                }}
                className="w-full bg-slate-900/90 text-slate-200 text-sm font-medium rounded-xl py-2.5 px-3.5 border border-white/10 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {PERSONAS.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
            <p className="text-xs text-slate-400 mt-2 line-clamp-1">{selectedPersona.accent}</p>
          </div>

          {/* Voice Output & Audio Settings */}
          <div className="p-4 rounded-2xl glass-panel flex flex-col justify-between">
            <label className="text-xs uppercase font-mono tracking-wider text-slate-400 block mb-2 font-semibold">
              Voice Output & Audio
            </label>
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setTtsEnabled(!ttsEnabled)}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  ttsEnabled
                    ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30'
                    : 'bg-slate-800 text-slate-400 border border-white/5'
                }`}
              >
                {ttsEnabled ? <Volume2 className="w-4 h-4 text-indigo-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
                <span>{ttsEnabled ? 'TTS On' : 'TTS Muted'}</span>
              </button>

              <button
                onClick={handleStopSpeaking}
                title="Stop / Interrupt Audio"
                className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition-all flex items-center justify-center"
              >
                <StopCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Smart Prompts Grid */}
        <div className="w-full max-w-4xl mt-6">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-mono uppercase text-slate-400 font-semibold tracking-wider">
              Smart Prompts
            </span>
            <span className="text-xs text-slate-500">Click to run interactive test</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {SMART_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleUserMessage(prompt.text)}
                className="glass-panel-interactive p-3.5 rounded-xl text-left flex flex-col justify-between group h-28"
              >
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 mb-1 block">
                    {prompt.category}
                  </span>
                  <p className="text-xs font-semibold text-slate-200 line-clamp-2 group-hover:text-white">
                    {prompt.title}
                  </p>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2">{prompt.text}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Conversation Stream Log */}
        {messages.length > 0 && (
          <div className="w-full max-w-2xl mt-6 glass-panel rounded-2xl p-4 max-h-60 overflow-y-auto">
            <div className="text-xs font-mono uppercase text-slate-500 mb-3 flex items-center justify-between">
              <span>Live Conversation Log</span>
              <span>{messages.length} messages</span>
            </div>
            <div className="space-y-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      m.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-sm'
                        : 'bg-slate-800 text-slate-200 border border-white/5 rounded-bl-sm'
                    }`}
                  >
                    <p>{m.text}</p>
                    {m.latency && (
                      <span className="text-[10px] font-mono text-purple-300 block mt-1">
                        TTFA: {m.latency}ms
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-400" />
                Integration Settings
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-mono uppercase text-slate-300 block mb-1">
                  Murf AI API Key (Optional)
                </label>
                <input
                  type="password"
                  placeholder="murf_live_..."
                  value={murfApiKey}
                  onChange={(e) => setMurfApiKey(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  If left empty, browser Web Speech Synthesis runs with custom persona pitch & inflection.
                </p>
              </div>

              <div>
                <label className="text-xs font-mono uppercase text-slate-300 block mb-1">
                  Agora App ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="agora_app_..."
                  value={agoraAppId}
                  onChange={(e) => setAgoraAppId(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  For deploying live channel RTC streaming sessions.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all"
                >
                  Save & Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-8 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <div>
          <span>Gemini Canvas Murf Falcon Persona • Agora RTC Engine</span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/1Shai7/talknshop"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-300 transition-colors flex items-center gap-1"
          >
            GitHub: talknshop <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://murf.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-300 transition-colors"
          >
            Murf Falcon AI
          </a>
          <a
            href="https://agora.io"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-300 transition-colors"
          >
            Agora.io
          </a>
        </div>
      </footer>
    </div>
  );
}
