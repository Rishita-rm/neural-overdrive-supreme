"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { 
  Zap, Loader2, ShieldCheck, Binary, Command, Flame, Server, 
  Wifi, HardDrive, Check, UserCircle, Ghost as GhostIcon, Bot, Swords, Shield, Atom, ChevronLeft,
  ScanSearch, Volume2, VolumeX, TrendingUp, Milestone, Sparkles, HelpCircle, X, Share2, User,
  Plus, ArrowRight, Radiation, Copy, Trophy, Lightbulb, Volume1, BrainCircuit, Activity,
  Info, AlertTriangle, BarChart3, Link as LinkIcon, Languages, Radar, Terminal, Mic2, Puzzle,
  Dna, ShieldAlert, MessagesSquare, Eye, Cpu, Globe, ZapOff, BookOpen, ScrollText, MessageSquareQuote,
  RefreshCw, Newspaper, Gift, Radio, FastForward
} from "lucide-react";
import confetti from "canvas-confetti";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { io, Socket } from "socket.io-client";

// --- TYPES ---
interface Category {
  text: string;
  examples: string[];
  color?: string;
  imageUrl?: string;
  lore?: string; 
  wisdom?: string;
  sectorName?: string;
  broadcast?: string;
}

interface Player {
  id: string;
  name: string;
  status: string;
}

interface GhostMessage {
  id: string;
  sender: string;
  text: string;
}

interface Artifact {
  name: string;
  description: string;
  rarity: string;
}

// --- PLAYER AVATAR COMPONENT ---
interface AvatarProps {
  seed: string;
  size?: number;
  className?: string;
  progress?: number;
  status?: string;
}

const AVATAR_COLORS = ["#00f3ff", "#ff003c", "#facc15", "#a855f7", "#22c55e", "#ff8a00"];
const AVATAR_ICONS = [UserCircle, GhostIcon, Bot, Swords, Shield, Atom];

const PlayerAvatar: React.FC<AvatarProps> = ({ seed, size = 40, className = "", progress = 0, status = "" }) => {
  const index = useMemo(() => {
    if (!seed) return 0;
    return String(seed).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % AVATAR_ICONS.length;
  }, [seed]);

  const colorIndex = useMemo(() => {
    if (!seed) return 0;
    return String(seed).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % AVATAR_COLORS.length;
  }, [seed]);

  const Icon = AVATAR_ICONS[index];
  const color = AVATAR_COLORS[colorIndex];

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <svg className="absolute inset-0 w-full h-full -rotate-90" style={{ transform: 'scale(1.15)' }}>
        <circle cx="50%" cy="50%" r="45%" stroke="rgba(255,255,255,0.1)" strokeWidth="2" fill="none" />
        <motion.circle 
          cx="50%" cy="50%" r="45%" stroke={color} strokeWidth="2.5" fill="none" 
          strokeDasharray="100" animate={{ strokeDashoffset: 100 - progress }}
        />
      </svg>
      <div 
        className="relative flex items-center justify-center rounded-full border shadow-[0_0_15px_rgba(255,255,255,0.05)] backdrop-blur-sm"
        style={{ width: size, height: size, backgroundColor: `${color}33`, borderColor: color }}
      >
        <Icon size={size * 0.55} style={{ color }} />
      </div>
      {status === "READY" && (
        <div className="absolute -bottom-0.5 -right-0.5 bg-green-500 rounded-full p-0.5 border border-black shadow-lg">
          <Check size={size * 0.2} className="text-black" />
        </div>
      )}
    </div>
  );
};

// --- AI CONFIGURATION ---
const apiKey = ""; 
const genAI = new GoogleGenerativeAI(apiKey);
const aiModel = genAI.getGenerativeModel({ 
  model: "gemini-2.5-flash-preview-09-2025",
  generationConfig: { temperature: 0.9 }
});

// Helper for Fetch with Retry (Exponential Backoff)
async function fetchWithRetry(url: string, options: RequestInit, retries = 5, delay = 1000): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        const text = await response.text();
        return text ? JSON.parse(text) : null;
      }
      if (response.status !== 429 && response.status < 500) break;
    } catch (e) {}
    await new Promise(res => setTimeout(res, delay * Math.pow(2, i)));
  }
  return null;
}

// Helper for PCM to WAV conversion
function pcmToWav(pcmData: Uint8Array, sampleRate: number = 24000): Blob {
  const buffer = new ArrayBuffer(44 + pcmData.length);
  const view = new DataView(buffer);
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + pcmData.length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, pcmData.length, true);
  for (let i = 0; i < pcmData.length; i++) {
    view.setUint8(44 + i, pcmData[i]);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

const useNeuralAudio = () => {
  const audioCtx = useRef<AudioContext | null>(null);

  const init = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      if (!audioCtx.current) {
        audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtx.current.state === "suspended") audioCtx.current.resume();
    } catch (e) {}
  }, []);

  const playPulse = useCallback((freq: number, vol = 0.1, dur = 0.1, type: OscillatorType = "sine") => {
    if (!audioCtx.current) return;
    try {
      const osc = audioCtx.current.createOscillator();
      const g = audioCtx.current.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.current.currentTime);
      g.gain.setValueAtTime(vol, audioCtx.current.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.current.currentTime + dur);
      osc.connect(g); g.connect(audioCtx.current.destination);
      osc.start(); osc.stop(audioCtx.current.currentTime + dur);
    } catch (e) {}
  }, []);

  const speakWithGemini = async (text: string, tone: string = "helpful") => {
    if (!audioCtx.current) return;
    try {
      if (audioCtx.current.state === "suspended") await audioCtx.current.resume();
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Say EXTREMELY FAST in a ${tone} cyberpunk style: ${text}` }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } }
          },
          model: "gemini-2.5-flash-preview-tts"
        })
      });
      const result = await response.json();
      const pcmBase64 = result?.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData?.data;
      if (pcmBase64) {
        const pcmBinary = Uint8Array.from(atob(pcmBase64), c => c.charCodeAt(0));
        const wavBlob = pcmToWav(pcmBinary, 24000);
        const audioUrl = URL.createObjectURL(wavBlob);
        const audio = new Audio(audioUrl);
        audio.play();
      }
    } catch (e) {}
  };

  return { init, playPulse, speakWithGemini };
};

export default function App() {
  // Main states
  const [gameState, setGameState] = useState<"IDLE" | "LOBBY" | "WAITING" | "PLAYING" | "GAMEOVER">("IDLE"); 
  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [lobbyMode, setLobbyMode] = useState<"HOST" | "JOIN" | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(40);
  const [integrity, setIntegrity] = useState(100);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [input, setInput] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [logs, setLogs] = useState<string[]>(["SYSTEM_CORE_INIT", "UPLINK_STANDBY"]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // AI states
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [isGeneratingHint, setIsGeneratingHint] = useState(false);
  const [synapseBurstHints, setSynapseBurstHints] = useState<string[]>([]);
  const [isGeneratingBurst, setIsGeneratingBurst] = useState(false);
  const [isMindSyncing, setIsMindSyncing] = useState(false);
  const [mindSyncClue, setMindSyncClue] = useState<string | null>(null);
  const [isReconActive, setIsReconActive] = useState(false);
  const [tacticalRecon, setTacticalRecon] = useState<string | null>(null);
  const [isHackingMatrix, setIsHackingMatrix] = useState(false);
  const [hackRiddle, setHackRiddle] = useState<{ riddle: string, solution: string } | null>(null);
  const [isGeneratingRiddle, setIsGeneratingRiddle] = useState(false);
  const [neuralInsight, setNeuralInsight] = useState<string | null>(null);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [exampleAnswer, setExampleAnswer] = useState<string | null>(null);
  const [isGeneratingExample, setIsGeneratingExample] = useState(false);
  const [sectorImageUrl, setSectorImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [ghostMsgs, setGhostMsgs] = useState<GhostMessage[]>([]);
  const [legacyReport, setLegacyReport] = useState<{ handle: string, summary: string, efficiency?: string, archetype?: string, artifact?: Artifact } | null>(null);
  const [isGeneratingLegacy, setIsGeneratingLegacy] = useState(false);

  // OVERCLOCK states
  const [isOverclockActive, setIsOverclockActive] = useState(false);
  const [overclockConstraint, setOverclockConstraint] = useState<string | null>(null);
  const [isGeneratingOverclock, setIsGeneratingOverclock] = useState(false);

  const [currentPrompt, setCurrentPrompt] = useState<Category>({ 
    text: "SYNCING...", 
    examples: [], 
    color: "#00f3ff",
    broadcast: "District uplink initializing...",
    sectorName: "District 0"
  });
  const [bufferedPrompt, setBufferedPrompt] = useState<Category | null>(null);
  const [guardianComment, setGuardianComment] = useState("Sector link established.");

  const { init, playPulse, speakWithGemini } = useNeuralAudio();
  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mainControls = useAnimation();

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [String(msg), ...prev].slice(0, 4));
  }, []);

  const stats = useMemo(() => ({
    multiplier: (streak >= 10 ? 5 : streak >= 5 ? 3 : streak >= 3 ? 2 : 1) * (isOverclockActive ? 2 : 1),
    tier: streak >= 15 ? "GOD_SYNC" : streak >= 10 ? "OVERCLOCK" : streak >= 5 ? "HYPER_LINK" : "STABLE"
  }), [streak, isOverclockActive]);

  // --- ✨ AI FEATURE: ART GENERATION (FIXED) ---
  const generateSectorImage = async (category: string) => {
    setIsGeneratingImage(true);
    try {
      const result = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: { 
            prompt: `Cinematic high-detail cyberpunk digital background for category: ${category}. Dark blue and neon cyan colors, data grid, technical HUD lines.` 
          },
          parameters: { sampleCount: 1 }
        })
      });
      if (result?.predictions?.[0]?.bytesBase64Encoded) {
        setSectorImageUrl(`data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`);
      } else {
        setSectorImageUrl(null); // Fallback to default background
      }
    } catch (e) {
      addLog("IMAGE_SYNC_INTERRUPTED");
      setSectorImageUrl(null);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const fetchCategory = useCallback(async (): Promise<Category> => {
    try {
      const promptText = `Generate ONE very simple trivia category (e.g. Colors, Fruits, Tools). 
      Return JSON: {"category": "Name", "lore": "Short Lore", "sector": "Cool District Name", "wisdom": "Quote", "broadcast": "Headline", "examples": ["50 words"]}. Only JSON.`;
      const result = await aiModel.generateContent(promptText);
      const rawText = result.response.text().trim().replace(/```json|```/g, "");
      const data = JSON.parse(rawText);
      return { 
        text: String(data.category || "UNKNOWN").toUpperCase(), 
        lore: String(data.lore || "Scanning..."),
        wisdom: String(data.wisdom || "Knowledge is power."),
        sectorName: String(data.sector || "District Zero"),
        broadcast: String(data.broadcast || "Matrix news uplink stable."),
        color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)], 
        examples: Array.isArray(data.examples) ? data.examples.map((e: any) => String(e).toLowerCase()) : [] 
      };
    } catch (e) {
      return { text: "EASY ANIMALS", lore: "Wildlife stream.", sectorName: "Bio-District", examples: ["cat", "dog"], color: "#00f3ff", broadcast: "Signal interference." };
    }
  }, []);

  const prefetch = useCallback(async () => {
    const data = await fetchCategory();
    setBufferedPrompt(data);
  }, [fetchCategory]);

  const cyclePrompt = useCallback(async () => {
    const data = bufferedPrompt || await fetchCategory();
    generateSectorImage(data.text);
    if (!isMuted) speakWithGemini(`Sector ${data.sectorName}: ${data.text}. Mission start.`, "helpful");
    
    if (socketRef.current?.connected) {
      socketRef.current.emit("change-question", { roomCode, question: data.text, examples: data.examples });
    } else {
      setCurrentPrompt({ ...data, color: data.color || "#00f3ff" });
      setIsSyncing(false);
    }
    
    setAiHint(null);
    setSynapseBurstHints([]);
    setBufferedPrompt(null);
    setExampleAnswer(null);
    setIsOverclockActive(false);
    setOverclockConstraint(null);
    prefetch();
    addLog(`SHIFTING_SECTOR: ${data.text}`);
  }, [bufferedPrompt, roomCode, prefetch, addLog, isMuted, speakWithGemini, fetchCategory]);

  const handleShareResult = async () => {
    const text = `I synthesized ${score} neural nodes in Neural Overdrive! Tier: ${stats.tier}. Peak Streak: ${streak}x.`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Neural Overdrive Supreme', text, url: window.location.origin }); } catch (e) {}
    } else {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      addLog("RESULT_COPIED");
    }
  };

  const handleInviteCopy = () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    const textArea = document.createElement("textarea");
    textArea.value = inviteUrl;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      addLog("SYNC_KEY_COPIED");
      confetti({ particleCount: 20 });
    } catch (err) {}
    document.body.removeChild(textArea);
  };

  const handleConnect = () => {
    if (!username || !roomCode) return addLog("ERROR: CONFIG_MISSING");
    init();
    setGameState("WAITING");
    socketRef.current = io("https://neural-overdrive-server.onrender.com");
    socketRef.current.on("connect", () => {
      socketRef.current?.emit("join-room", { roomCode, username });
    });
    socketRef.current.on("player-update", (data: Player[]) => setPlayers([...data]));
    socketRef.current.on("start-game-signal", () => { setGameState("PLAYING"); cyclePrompt(); });
    socketRef.current.on("sync-question", (data: any) => {
      const qText = data?.question || data?.text || "SYNCING...";
      setCurrentPrompt(p => ({ 
        ...p, 
        text: String(qText), 
        sectorName: String(data?.sectorName || "Unknown Sector"),
        broadcast: String(data?.broadcast || "Uplink stable.") 
      }));
      setAnswers([]);
      setIsSyncing(false);
      generateSectorImage(String(qText));
      if (!isMuted) speakWithGemini(`Target: ${qText}.`, "helpful");
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isHackingMatrix) return handleHackSubmit(e);
    const val = input.trim().toLowerCase();
    if (!val || gameState !== "PLAYING" || isSyncing || isValidating) return;
    if (answers.includes(val)) return;

    setIsValidating(true);
    try {
      const overclockCheck = isOverclockActive ? ` Rule: "${overclockConstraint}".` : "";
      const result = await aiModel.generateContent(`Category: "${currentPrompt.text}". Is "${val}" correct? ${overclockCheck} Return YES/NO.`);
      if (result.response.text().toUpperCase().includes("YES")) {
        setAnswers(p => [val, ...p]);
        setScore(s => s + (100 * stats.multiplier));
        setStreak(s => s + 1);
        setTimeLeft(t => Math.min(t + 8, 40));
        setIntegrity(i => Math.min(100, i + 10));
        if (answers.length + 1 >= 5) { setIsSyncing(true); cyclePrompt(); }
      } else {
        setIntegrity(i => Math.max(0, i - 15));
        mainControls.start({ x: [-15, 15, 0] });
        setStreak(0);
      }
    } catch (e) {
    } finally { 
      setIsValidating(false); setInput("");
    }
  };

  const triggerOverclock = async () => {
    if (isOverclockActive || isGeneratingOverclock || gameState !== "PLAYING") return;
    setIsGeneratingOverclock(true);
    addLog("✨ OVERCLOCKING...");
    try {
      const prompt = `For "${currentPrompt.text}", generate one tough constraint. Return JSON: {"constraint": "...", "short": "..."}`;
      const result = await aiModel.generateContent(prompt);
      const data = JSON.parse(result.response.text().trim().replace(/```json|```/g, ""));
      setOverclockConstraint(data.constraint);
      setIsOverclockActive(true);
      playPulse(880, 0.4, 0.2);
    } catch (e) {
    } finally {
      setIsGeneratingOverclock(false);
    }
  };

  const handleGetHint = async () => {
    if (isGeneratingHint || aiHint || integrity < 10) return;
    setIsGeneratingHint(true);
    try {
      const result = await aiModel.generateContent(`Easy hint for "${currentPrompt.text}".`);
      setAiHint(result.response.text());
      setIntegrity(i => Math.max(0, i - 10));
    } catch (e) {
    } finally {
      setIsGeneratingHint(false);
    }
  };

  const handleShowExample = async () => {
    if (isGeneratingExample || exampleAnswer || integrity < 20) return;
    setIsGeneratingExample(true);
    try {
        const result = await aiModel.generateContent(`One answer for "${currentPrompt.text}".`);
        setExampleAnswer(result.response.text().trim().toUpperCase());
        setIntegrity(i => Math.max(0, i - 20));
    } catch (e) {
    } finally {
        setIsGeneratingExample(false);
    }
  };

  const handleSynapseBurst = async () => {
    if (isGeneratingBurst || synapseBurstHints.length > 0 || integrity < 15) return;
    setIsGeneratingBurst(true);
    try {
        const result = await aiModel.generateContent(`3 word starts for "${currentPrompt.text}". Format: AB, CD, EF`);
        setSynapseBurstHints(result.response.text().split(",").map(s => s.trim().toUpperCase()));
        setIntegrity(i => Math.max(0, i - 15));
    } catch (e) {
    } finally {
        setIsGeneratingBurst(false);
    }
  };

  const handleHackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hackRiddle || !input) return;
    if (input.toLowerCase().trim() === String(hackRiddle.solution).toLowerCase().trim()) {
        setIntegrity(100);
        setIsHackingMatrix(false);
        setHackRiddle(null);
        setInput("");
        addLog("✨ MATRIX_PURGED");
        confetti({ particleCount: 100 });
    } else {
        setIntegrity(i => Math.max(0, i - 10));
        setInput("");
    }
  };

  const startHackMatrix = async () => {
    if (integrity > 30 || isGeneratingRiddle) return;
    setIsGeneratingRiddle(true);
    setIsHackingMatrix(true);
    try {
      const result = await aiModel.generateContent(`Cyber riddle for "${currentPrompt.text}". JSON: {"riddle": "...", "solution": "..."}`);
      const data = JSON.parse(result.response.text().trim().replace(/```json|```/g, ""));
      setHackRiddle(data);
    } catch (e) {
      setIsHackingMatrix(false);
    } finally {
      setIsGeneratingRiddle(false);
    }
  };

  useEffect(() => {
    if (gameState === "PLAYING") {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { 
              setGameState("GAMEOVER"); 
              aiModel.generateContent(`Analyze run. Score ${score}. Return JSON: {"handle": "Player", "summary": "Legacy", "efficiency": "XX%", "archetype": "Title", "artifact": {"name": "Artifact", "description": "Lore", "rarity": "Legendary"}}`)
                .then(r => setLegacyReport(JSON.parse(r.response.text().trim().replace(/```json|```/g, ""))))
                .catch(() => {});
              return 0; 
          }
          if (t <= 6) playPulse(t === 2 ? 600 : 1000, 0.2, 0.05); 
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, playPulse, score]);

  return (
    <div 
      className="fixed inset-0 bg-[#050a15] text-white font-mono flex flex-col overflow-y-auto scroll-smooth"
      onMouseMove={(e) => setMousePos({ x: (e.clientX/window.innerWidth-0.5)*40, y: (e.clientY/window.innerHeight-0.5)*40 })}
    >
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <AnimatePresence>
            {sectorImageUrl ? (
                <motion.div key={sectorImageUrl} initial={{ opacity: 0 }} animate={{ opacity: 0.25 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${sectorImageUrl})` }} />
            ) : (
                <motion.div animate={{ x: mousePos.x, y: mousePos.y }} className="absolute -top-1/4 -left-1/4 w-[150%] h-[150%] rounded-full blur-[200px] opacity-20" style={{ backgroundImage: `radial-gradient(circle, ${currentPrompt.color}, transparent)` }} />
            )}
        </AnimatePresence>
        <div className="absolute inset-0 bg-[#050a15]/90 backdrop-blur-[2px]" />
      </div>

      <div className="relative z-10 w-full flex flex-col min-h-full">
        {/* HUD Navigation */}
        <nav className="sticky top-0 z-50 p-4 flex flex-wrap justify-between items-center bg-slate-900/90 backdrop-blur-2xl border-b border-white/10 shadow-lg">
          <div className="flex items-center gap-3">
            <PlayerAvatar seed={username || "OP"} size={40} progress={(answers.length / 5) * 100} />
            <div>
              <div className="text-[11px] text-cyan-400 font-black tracking-widest uppercase truncate max-w-[150px]">{username || "OPERATOR"}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex items-center gap-1 bg-cyan-500/20 px-1.5 rounded-full text-[8px] font-black uppercase">L{currentLevel}</div>
              </div>
            </div>
          </div>
          <div className="text-center bg-white/5 px-6 py-2 rounded-full border border-white/10 shadow-glow">
            <div className="text-[7px] text-white/30 uppercase tracking-[0.3em] mb-0.5 tracking-widest uppercase">Score</div>
            <div className="text-3xl font-black italic tabular-nums tracking-tighter" style={{ color: currentPrompt.color }}>{score}</div>
          </div>
          <div className="flex gap-2">
             <button onClick={() => setShowHelp(true)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-cyan-400"><HelpCircle size={20} /></button>
             <button onClick={() => setIsMuted(!isMuted)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-white">{isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}</button>
          </div>
        </nav>

        <main className="flex-grow flex flex-col items-center justify-start px-6 py-12 relative w-full">
          {gameState === "IDLE" && (
            <div className="text-center max-w-4xl py-6 my-auto">
               <h1 className="text-4xl md:text-8xl font-black italic leading-none tracking-tighter mb-14 uppercase text-white drop-shadow-[0_0_60px_rgba(255,255,255,0.2)]">Neural<br/><span className="text-transparent" style={{ WebkitTextStroke: `2px ${currentPrompt.color}` }}>Overdrive</span></h1>
               <button onClick={() => { init(); setGameState("LOBBY"); }} className="group relative px-14 py-8 bg-white text-black font-black text-2xl md:text-4xl hover:bg-cyan-500 hover:text-white transition-all skew-x-[-12deg] shadow-[20px_20px_0px_#000] border-4 border-black uppercase italic active:scale-95">Initialize_Link</button>
            </div>
          )}

          {gameState === "LOBBY" && (
            <div className="w-full max-w-md bg-slate-900/60 border border-white/10 p-8 md:p-12 rounded-[3rem] backdrop-blur-3xl shadow-2xl relative my-6 text-center text-xs">
              {!lobbyMode ? (
                <div className="grid gap-6">
                  <button onClick={() => {setRoomCode(Math.random().toString(36).substring(2, 8).toUpperCase()); setLobbyMode('HOST'); prefetch();}} className="w-full p-6 bg-white/5 border border-white/10 rounded-[2.5rem] flex items-center justify-between hover:bg-white hover:text-black transition-all"><div><div className="text-lg font-black italic uppercase">Host Sector</div></div><Plus size={36} /></button>
                  <button onClick={() => {setLobbyMode('JOIN'); prefetch();}} className="w-full p-6 bg-white/5 border border-white/10 rounded-[2.5rem] flex items-center justify-between hover:bg-cyan-500 transition-all shadow-2xl text-white hover:text-black"><div><div className="text-lg font-black italic uppercase">Join Sector</div></div><ArrowRight size={36} /></button>
                </div>
              ) : (
                <div className="space-y-10">
                  <input autoFocus value={username} onChange={(e) => setUsername(e.target.value.toUpperCase().slice(0, 12))} placeholder="OPERATOR HANDLE..." className="w-full bg-white/5 border border-white/10 p-6 rounded-[1.5rem] focus:outline-none focus:border-cyan-500 font-black uppercase text-white text-3xl text-center shadow-inner" />
                  <input value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 8))} placeholder="SECTOR KEY..." className="w-full bg-white/5 border border-white/10 p-6 rounded-[1.5rem] focus:outline-none focus:border-cyan-500 font-black uppercase text-white text-3xl text-center shadow-inner" />
                  <button onClick={handleConnect} className="w-full p-10 bg-cyan-500 text-black font-black uppercase rounded-[2.5rem] hover:bg-white transition-all text-2xl italic shadow-xl">Establish_Uplink</button>
                </div>
              )}
            </div>
          )}

          {gameState === "WAITING" && (
            <div className="w-full max-w-4xl bg-slate-900/80 border border-white/20 p-8 rounded-[4rem] backdrop-blur-3xl text-center shadow-2xl">
              <div className="flex items-center justify-between mb-10 px-6 text-left">
                 <div>
                    <h2 className="text-4xl md:text-6xl font-black italic uppercase">Sync_Pool</h2>
                    <div className="text-cyan-400 font-black text-sm tracking-widest mt-1 uppercase">Sector: {String(roomCode)}</div>
                 </div>
                 <button onClick={handleInviteCopy} className="flex items-center gap-3 px-6 py-3 bg-cyan-500/10 border border-cyan-500/40 rounded-full text-cyan-400 font-black text-[12px] uppercase hover:bg-cyan-500 hover:text-black transition-all">
                    <LinkIcon size={16} /> Invite_Friends
                 </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-16">
                {players.map((p, i) => (<div key={p.id || `p-${i}`} className="p-10 bg-white/5 border border-white/10 rounded-[5rem] flex flex-col items-center gap-6 group hover:bg-white/5 transition-all"><PlayerAvatar seed={p.name} size={80} status={p.status} /><span className="text-xl font-black uppercase truncate w-full text-center">{p.name}</span></div>))}
              </div>
              <button onClick={() => { socketRef.current?.emit("start-game-request", { roomCode }); if(!socketRef.current?.connected) { setGameState("PLAYING"); cyclePrompt(); } }} className="w-full p-12 bg-white text-black font-black uppercase rounded-[3.5rem] hover:bg-cyan-500 transition-all text-3xl italic shadow-2xl active:scale-95">Initiate_Sector</button>
            </div>
          )}

          {gameState === "PLAYING" && (
            <motion.div animate={mainControls} className="w-full space-y-10 flex flex-col items-center py-6 text-center">
              <div className="w-full max-w-3xl px-4 flex flex-col gap-4">
                <div className="flex items-center justify-between bg-black/40 p-5 rounded-3xl border border-white/10 backdrop-blur-md">
                    <div className="flex items-center gap-4 text-left">
                        <Activity size={32} className="text-cyan-400 animate-pulse" />
                        <div>
                            <div className="text-[12px] font-black text-white/50 uppercase italic truncate max-w-[400px]">{String(exampleAnswer ? `Decoded: ${exampleAnswer}` : guardianComment)}</div>
                            <div className="text-[9px] font-bold text-white/20 uppercase tracking-widest italic">{String(currentPrompt.sectorName || "District 1")}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="h-4 w-56 bg-white/5 rounded-full overflow-hidden border border-white/10 shadow-inner">
                            <motion.div animate={{ width: `${integrity}%`, backgroundColor: integrity < 30 ? '#ff003c' : '#00f3ff' }} className="h-full shadow-[0_0_15px_#00f3ff]" />
                        </div>
                    </div>
                </div>
              </div>

              <div className="text-center w-full px-4 text-center">
                <div className="inline-flex items-center gap-4 mb-6 px-10 py-3 bg-white/5 border-2 border-white/10 rounded-full text-white/60 text-[14px] font-black tracking-[0.7em] backdrop-blur-3xl italic uppercase shadow-2xl uppercase"><ScanSearch size={32} className="text-cyan-400"/> Sector: {String(currentPrompt.text)}</div>
                <h2 className="text-4xl md:text-9xl font-black italic uppercase leading-none text-white transition-all duration-300 break-words drop-shadow-[0_0_70px_rgba(255,255,255,0.25)]">{isSyncing ? "UPLINKING..." : String(currentPrompt.text)}</h2>
              </div>

              <div className="relative w-56 h-56 md:w-72 md:h-72 flex items-center justify-center text-white text-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90"><circle cx="50%" cy="50%" r="45%" stroke="rgba(255,255,255,0.05)" strokeWidth="10" fill="none" /><motion.circle cx="50%" cy="50%" r="45%" stroke={timeLeft <= 5 ? "#ff003c" : currentPrompt.color} strokeWidth={timeLeft <= 5 ? 38 : 34} fill="none" strokeLinecap="round" strokeDasharray="283" animate={{ strokeDashoffset: 283 - (283 * timeLeft) / 40 }} /></svg>
                <motion.span 
                    animate={timeLeft <= 5 ? { scale: [1, 1.25, 1], rotate: [0, 3, -3, 0] } : {}}
                    className={`text-7xl md:text-9xl font-black tabular-nums ${timeLeft <= 5 ? 'text-red-500 drop-shadow-[0_0_20px_#ff0000]' : 'text-white'}`}
                >
                    {String(timeLeft)}
                </motion.span>
              </div>

              <div className="w-full max-w-6xl relative text-center pb-20 px-4">
                <form onSubmit={handleSubmit} className="mb-14">
                  <input autoFocus disabled={isSyncing || isValidating} value={input} onChange={(e) => setInput(e.target.value)} 
                         className={`w-full bg-transparent border-b-[12px] border-white/10 pb-8 text-5xl md:text-9xl font-black text-center focus:outline-none transition-all uppercase placeholder:opacity-5 focus:border-cyan-500 ${streak >= 5 ? 'text-yellow-400 border-yellow-400 shadow-[0_30px_70px_rgba(234,179,8,0.4)]' : 'text-white'}`} 
                         placeholder={isValidating ? "SYNCING..." : "INPUT_DATA..."} />
                </form>

                <div className="flex flex-wrap items-center justify-center gap-8">
                  <button onClick={handleShowExample} disabled={isGeneratingExample || exampleAnswer || integrity < 20} className="group flex items-center gap-4 px-10 py-5 bg-purple-500/10 border border-purple-500/40 rounded-full text-purple-400 font-black text-sm hover:bg-purple-500 hover:text-white transition-all disabled:opacity-20 shadow-lg uppercase">
                    {isGeneratingExample ? <Loader2 className="animate-spin" size={24} /> : <BrainCircuit size={24} />}
                    ✨ Show Example (-20)
                  </button>
                  <button onClick={handleGetHint} disabled={isGeneratingHint || aiHint || integrity < 10} className="group flex items-center gap-4 px-10 py-5 bg-yellow-500/10 border border-yellow-500/40 rounded-full text-yellow-400 font-black text-sm hover:bg-yellow-500 hover:text-black transition-all disabled:opacity-20 shadow-lg uppercase">
                    {isGeneratingHint ? <Loader2 className="animate-spin" size={24} /> : <Lightbulb size={24} />} 
                    ✨ Quick Hint (-10)
                  </button>
                  <button onClick={handleSynapseBurst} disabled={isGeneratingBurst || synapseBurstHints.length > 0 || integrity < 15} className="group flex items-center gap-4 px-10 py-5 bg-cyan-500/10 border border-cyan-500/40 rounded-full text-cyan-400 font-black text-sm hover:bg-cyan-500 hover:text-white transition-all disabled:opacity-20 shadow-lg uppercase">
                    {isGeneratingBurst ? <Loader2 className="animate-spin" size={24} /> : <Zap size={24} />}
                    ✨ Syllables (-15)
                  </button>
                </div>

                <AnimatePresence>
                    {aiHint && (
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-8 bg-white/5 border border-white/10 p-5 rounded-2xl max-w-xl mx-auto text-cyan-400 text-sm italic uppercase tracking-widest shadow-xl">
                            HINT: "{String(aiHint)}"
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="mt-16 flex flex-wrap justify-center gap-6 py-10 px-4 text-white text-center">
                  <AnimatePresence mode="popLayout">
                    {answers.map((w, idx) => (
                      <motion.div 
                        key={`${w}-${idx}`} 
                        layout initial={{ scale: 0, y: 50 }} animate={{ scale: 1, y: 0 }} 
                        className="px-10 py-5 bg-white/5 border-2 border-white/10 rounded-[3rem] text-3xl font-black text-white/90 flex items-center gap-6 backdrop-blur-3xl shadow-2xl border-b-[10px] uppercase italic hover:bg-white/10 transition-all cursor-default" 
                        style={{ borderColor: currentPrompt.color }}
                      >
                        <Binary size={36} className="text-cyan-400 opacity-50" /> {String(w).toUpperCase()}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}

          {gameState === "GAMEOVER" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-black/98 flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
              <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="max-w-6xl w-full py-20">
                <h2 className="text-red-500 text-7xl md:text-[11rem] font-black italic mb-16 drop-shadow-[0_0_60px_rgba(235,33,33,0.4)] text-center">SIGNAL LOST</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16 text-center">
                   <div className="bg-white/5 p-16 rounded-[5rem] border border-white/10 shadow-3xl text-center">
                      <div className="text-white/30 uppercase tracking-[0.6em] text-[12px] mb-6 font-black italic">Nodes Synthesized</div>
                      <div className="text-7xl md:text-9xl font-black text-cyan-400 tabular-nums">{String(score)}</div>
                   </div>
                   <div className="bg-white/5 p-16 rounded-[5rem] border border-white/10 shadow-3xl text-center flex flex-col justify-center">
                      <div className="text-white/30 uppercase tracking-[0.6em] text-[12px] mb-6 font-black italic">Neural Efficiency</div>
                      <div className="text-7xl md:text-9xl font-black text-yellow-400 tabular-nums">{String(legacyReport?.efficiency || "98%")}</div>
                   </div>
                </div>
                <div className="bg-cyan-500/10 p-16 rounded-[6rem] border-2 border-cyan-400/30 mb-16 relative overflow-hidden text-left">
                   {isGeneratingLegacy ? (
                     <div className="flex flex-col items-center gap-8 text-center w-full py-16">
                        <Loader2 className="animate-spin text-cyan-400" size={80} />
                        <div className="text-cyan-400 font-black italic text-2xl animate-pulse uppercase tracking-[0.3em]">✨ ANALYZING NEURAL_DATA...</div>
                     </div>
                   ) : legacyReport ? (
                     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 text-center w-full">
                        <div className="flex items-center justify-center gap-4 mb-6">
                            <BarChart3 className="text-cyan-400" size={32} />
                            <div className="text-white/40 uppercase font-black text-lg tracking-widest tracking-[0.4em]">Neural Archetype: <span className="text-white">{String(legacyReport.archetype)}</span></div>
                        </div>
                        <div className="text-6xl md:text-8xl font-black text-white italic uppercase tracking-tighter mb-8 drop-shadow-2xl">{String(legacyReport.handle)}</div>
                        <div className="h-px w-full max-w-lg mx-auto bg-white/10 mb-10" />
                        <div className="text-cyan-400 font-bold italic text-2xl md:text-4xl leading-relaxed max-w-4xl mx-auto uppercase italic">"{String(legacyReport.summary)}"</div>
                     </motion.div>
                   ) : null}
                </div>
                <div className="flex flex-col md:flex-row gap-10 justify-center">
                  <button onClick={() => window.location.reload()} className="flex-1 px-20 py-12 bg-white text-black font-black text-3xl uppercase italic skew-x-[-12deg] hover:bg-cyan-500 transition-all shadow-[12px_12px_0px_rgba(0,243,255,1)]">Re-Uplink</button>
                  <button onClick={handleShareResult} className="flex-1 px-12 md:px-24 py-10 md:py-16 border-8 border-cyan-500/50 font-black text-xl md:text-4xl hover:bg-cyan-500 hover:text-white transition-all skew-x-[-12deg] uppercase italic text-cyan-400">SHARE_RESULT <Share2 className="inline ml-2" /></button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </main>

        <footer className="sticky bottom-0 p-6 bg-slate-900/95 border-t-2 border-white/10 flex flex-wrap justify-between items-end backdrop-blur-3xl z-50 overflow-hidden">
          <div className="flex flex-col gap-2">
             <div className="flex items-center gap-2 text-cyan-400 animate-pulse">
                <Newspaper size={16} />
                <span className="text-[10px] font-black uppercase tracking-[0.4em]">✨ Matrix_Live_Broadcast</span>
             </div>
             <div className="w-full md:w-[600px] overflow-hidden whitespace-nowrap bg-black/40 py-2 rounded-lg border border-white/5">
                <motion.div initial={{ x: '100%' }} animate={{ x: '-100%' }} transition={{ duration: 25, repeat: Infinity, ease: 'linear' }} className="text-[12px] font-bold text-white/60 italic uppercase tracking-widest">
                    {String(currentPrompt.broadcast || "Uplink stable. Sector analysis in progress...")}
                </motion.div>
             </div>
          </div>
          <div className="text-right flex items-center gap-10 text-white/20">
             <div className="hidden lg:block text-[14px] font-black uppercase tracking-[0.8em] italic leading-none text-center">Neural_Core_Arch_V26.0</div>
             <Command size={32}/><HardDrive size={32}/>
          </div>
        </footer>
      </div>

      <AnimatePresence>
        {showHelp && (
          <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-6 text-center">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-slate-900 border border-white/20 p-10 md:p-16 rounded-[4rem] max-w-4xl w-full relative shadow-3xl text-center overflow-y-auto max-h-[90vh]">
              <button onClick={() => setShowHelp(false)} className="absolute top-10 right-10 text-white/40 hover:text-white transition-all"><X size={40}/></button>
              <h2 className="text-5xl font-black italic uppercase text-cyan-400 mb-10 flex items-center gap-6 text-center w-full justify-center"><HelpCircle size={60}/> Protocol Guide</h2>
              <div className="space-y-8 text-xl md:text-3xl text-white/80 leading-relaxed font-bold italic uppercase tracking-tighter text-center">
                <p>✨ **District Lore**: Every zone has its own cyberpunk backstory generated by Gemini.</p>
                <p>✨ **Final Identity**: Get analyzed by Gemini at the end of your run.</p>
                <p>✨ **Voice Sync**: AI mission briefings and targets spoken in real-time.</p>
              </div>
              <button onClick={() => setShowHelp(false)} className="mt-14 w-full py-8 bg-white text-black font-black uppercase text-3xl rounded-[2.5rem] hover:bg-cyan-500 transition-all text-center">Acknowledge</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
