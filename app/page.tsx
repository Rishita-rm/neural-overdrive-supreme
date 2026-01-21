"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import {
  Zap,
  Loader2,
  ShieldCheck,
  Binary,
  Command,
  Flame,
  Server,
  Wifi,
  HardDrive,
  Check,
  UserCircle,
  Ghost as GhostIcon,
  Bot,
  Swords,
  Shield,
  Atom,
  ChevronLeft,
  ScanSearch,
  Volume2,
  VolumeX,
  TrendingUp,
  Milestone,
  Sparkles,
  HelpCircle,
  X,
  Share2,
  User,
  Plus,
  ArrowRight,
  Radiation,
  Copy,
  Trophy, // Added Trophy to imports
} from "lucide-react";
import confetti from "canvas-confetti";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { io, Socket } from "socket.io-client";

// --- TYPES ---
interface Category {
  text: string;
  examples: string[];
  color?: string;
}

interface Player {
  name: string;
  status: string;
}

interface Shout {
  id: number;
  username: string;
  msg: string;
}

// Named interface differently to avoid collision with Lucide icon
interface NeuralGhost {
  id: number;
  word: string;
  sender: string;
}

// --- CONSTANTS ---
const MAX_TIME = 40;
const CLASSIC_CATEGORIES: Category[] = [
  {
    text: "FRUITS",
    examples: [
      "apple",
      "banana",
      "orange",
      "mango",
      "grape",
      "watermelon",
      "cherry",
    ],
  },
  {
    text: "ANIMALS",
    examples: ["lion", "tiger", "elephant", "dog", "cat", "zebra", "monkey"],
  },
  {
    text: "COLORS",
    examples: ["red", "blue", "green", "yellow", "pink", "purple", "white"],
  },
  {
    text: "COUNTRIES",
    examples: [
      "india",
      "usa",
      "japan",
      "france",
      "brazil",
      "canada",
      "germany",
    ],
  },
];

const AVATAR_COLORS = [
  "#00f3ff",
  "#ff003c",
  "#facc15",
  "#a855f7",
  "#22c55e",
  "#ff8a00",
];
const AVATAR_ICONS = [UserCircle, GhostIcon, Bot, Swords, Shield, Atom];

// --- PLAYER AVATAR COMPONENT ---
interface AvatarProps {
  seed: string;
  size?: number;
  className?: string;
  progress?: number;
  status?: string;
}

const PlayerAvatar: React.FC<AvatarProps> = ({
  seed,
  size = 40,
  className = "",
  progress = 0,
  status = "",
}) => {
  const index = useMemo(() => {
    if (!seed) return 0;
    return (
      String(seed)
        .split("")
        .reduce((acc, char) => acc + char.charCodeAt(0), 0) %
      AVATAR_ICONS.length
    );
  }, [seed]);

  const colorIndex = useMemo(() => {
    if (!seed) return 0;
    return (
      String(seed)
        .split("")
        .reduce((acc, char) => acc + char.charCodeAt(0), 0) %
      AVATAR_COLORS.length
    );
  }, [seed]);

  const Icon = AVATAR_ICONS[index];
  const color = AVATAR_COLORS[colorIndex];

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 ${className}`}
    >
      <svg
        className="absolute inset-0 w-full h-full -rotate-90"
        style={{ transform: "scale(1.15)" }}
      >
        <circle
          cx="50%"
          cy="50%"
          r="45%"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="2"
          fill="none"
        />
        <motion.circle
          cx="50%"
          cy="50%"
          r="45%"
          stroke={color}
          strokeWidth="2.5"
          fill="none"
          strokeDasharray="100"
          animate={{ strokeDashoffset: 100 - progress }}
        />
      </svg>
      <div
        className="relative flex items-center justify-center rounded-full border shadow-[0_0_15px_rgba(255,255,255,0.05)] backdrop-blur-sm"
        style={{
          width: size,
          height: size,
          backgroundColor: `${color}33`,
          borderColor: color,
        }}
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
  generationConfig: { temperature: 0.95 },
});

const useNeuralAudio = () => {
  const audioCtx = useRef<AudioContext | null>(null);
  const musicGain = useRef<GainNode | null>(null);
  const bgOscillators = useRef<OscillatorNode[]>([]);

  const init = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      if (!audioCtx.current) {
        audioCtx.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        musicGain.current = audioCtx.current.createGain();
        musicGain.current.gain.value = 0.05;
        musicGain.current.connect(audioCtx.current.destination);
      }
      if (audioCtx.current.state === "suspended") audioCtx.current.resume();

      if (
        bgOscillators.current.length === 0 &&
        audioCtx.current &&
        musicGain.current
      ) {
        const createLayer = (
          freq: number,
          type: OscillatorType,
          vol: number
        ) => {
          if (!audioCtx.current || !musicGain.current) return;
          const osc = audioCtx.current.createOscillator();
          const g = audioCtx.current.createGain();
          osc.type = type;
          osc.frequency.value = freq;
          g.gain.value = vol;
          osc.connect(g);
          g.connect(musicGain.current);
          osc.start();
          bgOscillators.current.push(osc);
        };
        createLayer(55, "triangle", 0.2);
        createLayer(110, "sine", 0.1);
      }
    } catch (e) {}
  }, []);

  const setVolume = (val: number) => {
    if (musicGain.current && audioCtx.current) {
      musicGain.current.gain.setTargetAtTime(
        val,
        audioCtx.current.currentTime,
        0.1
      );
    }
  };

  const playPulse = useCallback(
    (freq: number, vol = 0.1, dur = 0.1, type: OscillatorType = "sine") => {
      if (!audioCtx.current) return;
      try {
        const osc = audioCtx.current.createOscillator();
        const g = audioCtx.current.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.current.currentTime);
        g.gain.setValueAtTime(vol, audioCtx.current.currentTime);
        g.gain.exponentialRampToValueAtTime(
          0.001,
          audioCtx.current.currentTime + dur
        );
        osc.connect(g);
        g.connect(audioCtx.current.destination);
        osc.start();
        osc.stop(audioCtx.current.currentTime + dur);
      } catch (e) {}
    },
    []
  );

  return { init, playPulse, setVolume };
};

export default function App() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [input, setInput] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(MAX_TIME);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState<
    "IDLE" | "LOBBY" | "WAITING" | "PLAYING" | "GAMEOVER"
  >("IDLE");
  const [lobbyMode, setLobbyMode] = useState<"HOST" | "JOIN" | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const [roomCode, setRoomCode] = useState("");
  const [username, setUsername] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [shouts, setShouts] = useState<Shout[]>([]);
  const [isCopied, setIsCopied] = useState(false);

  const [currentPrompt, setCurrentPrompt] = useState<Category>({
    text: "NEURAL_LINK_STBY",
    color: "#00f3ff",
    examples: [],
  });
  const [bufferedPrompt, setBufferedPrompt] = useState<Category | null>(null);
  const [streak, setStreak] = useState(0);
  const [integrity, setIntegrity] = useState(100);
  const [logs, setLogs] = useState<string[]>([
    "SYSTEM_BOOT_SUCCESS",
    "VIBRANT_UI_ACTIVE",
  ]);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const { init, playPulse, setVolume } = useNeuralAudio();
  const mainControls = useAnimation();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const stats = useMemo(
    () => ({
      multiplier: streak >= 10 ? 5 : streak >= 5 ? 3 : streak >= 3 ? 2 : 1,
      tier:
        streak >= 15
          ? "GOD_SYNC"
          : streak >= 10
          ? "OVERCLOCK"
          : streak >= 5
          ? "HYPER_LINK"
          : "STABLE",
    }),
    [streak]
  );

  const addLog = useCallback((msg: any) => {
    setLogs((prev) => [String(msg), ...prev].slice(0, 4));
  }, []);

  useEffect(() => {
    try {
      const peak = localStorage.getItem("neural_v8_peak");
      const user = localStorage.getItem("neural_user");
      if (peak) setHighScore(parseInt(peak));
      if (user) setUsername(user);
    } catch (e) {}
  }, []);

  useEffect(() => {
    setVolume(isMuted ? 0 : 0.05);
  }, [isMuted, setVolume]);

  useEffect(() => {
    const targetLevel = Math.floor(score / 2000) + 1;
    if (targetLevel > currentLevel) {
      setCurrentLevel(targetLevel);
      setShowLevelUp(true);
      playPulse(800, 0.3, 0.5, "triangle");
      setTimeout(() => setShowLevelUp(false), 3000);
    }
  }, [score, currentLevel, playPulse]);

  const fetchCategory = useCallback(async (): Promise<Category> => {
    try {
      const randomSeed = Math.floor(Math.random() * 1000000);
      const promptText = `Generate ONE common speed trivia category. Level ${currentLevel}. 
      Choose a unique topic. Random Seed: ${randomSeed}.
      Return JSON: {"category": "MAX 3 WORDS", "examples": ["list of 50 common answers"]}. Only JSON.`;

      const result = await aiModel.generateContent(promptText);
      const rawText = result.response
        .text()
        .trim()
        .replace(/```json|```/g, "");
      const data = JSON.parse(rawText);
      const color =
        AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
      return {
        text: String(data.category || "UNKNOWN").toUpperCase(),
        color,
        examples: Array.isArray(data.examples)
          ? data.examples.map((e: any) => String(e).toLowerCase())
          : [],
      };
    } catch (e) {
      const fallback =
        CLASSIC_CATEGORIES[
          Math.floor(Math.random() * CLASSIC_CATEGORIES.length)
        ];
      return { ...fallback, color: "#00f3ff" };
    }
  }, [currentLevel]);

  const prefetch = useCallback(async () => {
    const data = await fetchCategory();
    setBufferedPrompt(data);
  }, [fetchCategory]);

  const cyclePrompt = useCallback(() => {
    const data =
      bufferedPrompt ||
      CLASSIC_CATEGORIES[Math.floor(Math.random() * CLASSIC_CATEGORIES.length)];
    if (socketRef.current?.connected) {
      socketRef.current.emit("change-question", {
        roomCode,
        question: data.text,
        examples: data.examples,
      });
    } else {
      setCurrentPrompt({ ...data, color: data.color || "#00f3ff" });
      setIsSyncing(false);
    }
    setBufferedPrompt(null);
    prefetch();
    addLog(`SHIFTING_SECTOR: ${data.text}`);
  }, [bufferedPrompt, roomCode, prefetch, addLog]);

  const handleConnect = () => {
    if (!username || !roomCode) return addLog("ERROR: CONFIG_MISSING");
    init();
    try {
      localStorage.setItem("neural_user", username);
    } catch (e) {}

    socketRef.current = io("https://neural-overdrive-server.onrender.com");

    socketRef.current.on("connect", () => {
      socketRef.current?.emit("join-room", { roomCode, username });
    });

    socketRef.current.on("player-update", (data: Player[]) => {
      if (Array.isArray(data)) setPlayers([...data]);
    });

    socketRef.current.on("shout-received", (data: any) => {
      const id = Math.random();
      setShouts((prev) => [...prev, { id, ...data }]);
      setTimeout(
        () => setShouts((prev) => prev.filter((s) => s.id !== id)),
        3000
      );
    });

    socketRef.current.on("start-game-signal", () => {
      setGameState("PLAYING");
      cyclePrompt();
    });

    socketRef.current.on("sync-question", (data: any) => {
      const qText =
        typeof data === "object" && data !== null
          ? data.question || data.text
          : data;
      const qExamples =
        typeof data === "object" && data !== null ? data.examples || [] : [];
      setCurrentPrompt((p) => ({
        ...p,
        text: String(qText || "SYNCING..."),
        examples: Array.isArray(qExamples) ? qExamples : [],
      }));
      setAnswers([]);
      setIsSyncing(false);
      confetti({
        particleCount: 30,
        colors: [currentPrompt.color || "#00f3ff"],
      });
    });

    setGameState("WAITING");
  };

  const toggleReady = () => {
    const nextReadyState = !isReady;
    setIsReady(nextReadyState);
    if (socketRef.current?.connected) {
      socketRef.current.emit("player-ready", {
        roomCode,
        username,
        status: nextReadyState ? "READY" : "WAITING",
      });
    }
  };

  const handleHostStart = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("start-game-request", { roomCode });
    } else {
      setGameState("PLAYING");
      cyclePrompt();
    }
  }, [roomCode, cyclePrompt]);

  const handleShareResult = async () => {
    const text = `I just decoded ${score} neural nodes in Neural Overdrive Supreme! Record: ${highScore}. 🚀`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Neural Overdrive Supreme",
          text,
          url: window.location.origin,
        });
      } catch (e) {}
    } else {
      navigator.clipboard.writeText(text);
      addLog("RESULT_COPIED_TO_CLIPBOARD");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = input.trim();
    if (!val || gameState !== "PLAYING" || isSyncing || isValidating) return;

    const cleanVal = val.toLowerCase();
    if (answers.includes(cleanVal)) {
      playPulse(60, 0.4, 0.3, "sawtooth");
      mainControls.start({ x: [-10, 10, 0] });
      return;
    }

    const isFastValid =
      Array.isArray(currentPrompt.examples) &&
      currentPrompt.examples.includes(cleanVal);

    if (!isFastValid) {
      setIsValidating(true);
      try {
        const result = await aiModel.generateContent(
          `Category: "${currentPrompt.text}". Is "${val}" valid? YES/NO only.`
        );
        const aiResponse = result.response.text().toUpperCase();
        if (!aiResponse.includes("YES")) {
          setIntegrity((i) => Math.max(0, i - 15));
          mainControls.start({
            filter: ["brightness(2) contrast(3)", "none"],
            x: [-20, 20, 0],
          });
          setStreak(0);
          setInput("");
          return;
        }
      } catch (e) {
      } finally {
        setIsValidating(false);
      }
    }

    setAnswers((p) => [cleanVal, ...p]);
    setScore((s) => {
      const ns = s + 100 * stats.multiplier;
      if (ns > highScore) {
        setHighScore(ns);
        try {
          localStorage.setItem("neural_v8_peak", ns.toString());
        } catch (e) {}
      }
      return ns;
    });
    setStreak((s) => s + 1);
    setTimeLeft((t) => Math.min(t + 3, MAX_TIME));
    setIntegrity((i) => Math.min(100, i + 5));
    playPulse(400 + streak * 40, 0.1, 0.05);
    if (socketRef.current?.connected)
      socketRef.current.emit("submit-word", {
        roomCode,
        word: cleanVal,
        username,
      });
    if (answers.length + 1 >= 5) {
      setIsSyncing(true);
      cyclePrompt();
    }
    setInput("");
  };

  useEffect(() => {
    if (gameState === "PLAYING") {
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            setGameState("GAMEOVER");
            playPulse(40, 0.8, 1.5, "sawtooth");
            return 0;
          }
          if (t <= 5) playPulse(1200, 0.1, 0.05);
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, playPulse]);

  return (
    <div className="relative min-h-screen w-full bg-[#050a15] text-white font-mono flex flex-col scroll-smooth">
      {/* Background Layers */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ x: mousePos.x, y: mousePos.y }}
          className="absolute -top-1/4 -left-1/4 w-[150%] h-[150%] rounded-full blur-[200px] opacity-40"
          style={{
            backgroundImage: `radial-gradient(circle, ${currentPrompt.color}, transparent)`,
          }}
        />
        <div className="absolute inset-0 bg-[#050a15]/60 backdrop-blur-[1px]" />
        <motion.div
          animate={{
            rotateX: streak > 10 ? 65 : 45,
            opacity: [0.05, 0.1, 0.05],
          }}
          className="absolute inset-0 z-1"
          style={{
            backgroundImage: `linear-gradient(${currentPrompt.color}22 1px, transparent 1px), linear-gradient(90deg, ${currentPrompt.color}22 1px, transparent 1px)`,
            backgroundSize: "80px 80px",
            transform: "perspective(1000px)",
          }}
        />
        <div className="absolute inset-0 z-50 opacity-[0.02] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
      </div>

      {/* Floating Shouts Overlay */}
      <div className="fixed inset-0 z-[45] pointer-events-none overflow-hidden text-center">
        <AnimatePresence>
          {shouts.map((s) => (
            <motion.div
              key={s.id}
              initial={{ y: 100, opacity: 0, scale: 0.5 }}
              animate={{ y: -200, opacity: [0, 1, 1, 0], scale: 1.2 }}
              transition={{ duration: 3 }}
              className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
            >
              <div className="bg-white text-black px-4 py-2 rounded-xl font-black text-xl skew-x-[-12deg] shadow-[8px_8px_0px_#000] border-2 border-cyan-500 uppercase">
                {String(s.msg)}
              </div>
              <div className="text-[10px] font-black uppercase text-cyan-400 bg-black/80 px-2 py-0.5 rounded text-center tracking-widest uppercase">
                FROM: {String(s.username)}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-cyan-500/10 backdrop-blur-xl pointer-events-none p-4 text-center"
          >
            <motion.div
              initial={{ scale: 0.5, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-black/90 p-8 md:p-14 rounded-[3rem] border-2 border-cyan-400 shadow-[0_0_50px_rgba(6,182,212,0.4)] max-w-full"
            >
              <TrendingUp
                size={60}
                className="text-cyan-400 mx-auto mb-4 animate-pulse hidden md:block"
              />
              <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-white text-center">
                LEVEL_UP
              </h2>
              <p className="text-base md:text-xl font-bold text-cyan-400 mt-2 tracking-[0.2em] text-center">
                SECTOR 0{String(currentLevel)} ACCESSED
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="relative z-10 w-full flex flex-col min-h-screen"
        onMouseMove={(e) =>
          setMousePos({
            x: (e.clientX / window.innerWidth - 0.5) * 30,
            y: (e.clientY / window.innerHeight - 0.5) * 30,
          })
        }
      >
        {/* HUD Navigation */}
        <nav className="sticky top-0 z-50 p-3 md:p-4 flex flex-wrap justify-between items-center bg-slate-900/80 backdrop-blur-2xl border-b border-white/10 shadow-lg gap-3">
          <div className="flex items-center gap-2 md:gap-3 text-left">
            <PlayerAvatar
              seed={String(username)}
              size={42}
              progress={(answers.length / 5) * 100}
            />
            <div>
              <div className="text-[12px] md:text-[14px] text-cyan-400 font-black tracking-widest uppercase truncate max-w-[100px]">
                {String(username || "OPERATOR")}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-left text-left">
                <div className="flex items-center gap-1 bg-cyan-500/20 px-1.5 rounded-full border border-cyan-500/30 text-[9px] font-black uppercase">
                  L{String(currentLevel)}
                </div>
                <div className="flex items-center gap-1">
                  <Wifi size={10} className="text-green-500" />
                  <span className="text-[9px] font-bold text-white/50 uppercase">
                    ACTIVE
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="order-3 md:order-2 w-full md:w-auto text-center bg-white/5 px-5 py-1.5 rounded-full border border-white/10">
            <div className="text-[7px] md:text-[8px] text-white/30 uppercase tracking-[0.3em] mb-0.5 uppercase tracking-widest text-center">
              SCORE_INDEX
            </div>
            <div
              className="text-2xl md:text-3xl font-black italic tabular-nums tracking-tighter"
              style={{ color: currentPrompt.color }}
            >
              {String(score)}
            </div>
          </div>

          <div className="flex gap-2 items-center order-2 md:order-3">
            <button
              onClick={() => setShowHelp(true)}
              className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all shadow text-cyan-400"
            >
              <HelpCircle size={18} />
            </button>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all text-white shadow"
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
        </nav>

        {/* Scrollable Game Body */}
        <main className="flex-grow flex flex-col items-center justify-center px-4 md:px-6 py-8 w-full">
          {gameState === "IDLE" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center max-w-4xl py-6"
            >
              <motion.div
                animate={
                  {
                    scale: [1, 1.03],
                    transition: {
                      duration: 2,
                      repeat: Infinity,
                      repeatType: "mirror",
                    },
                  } as any
                }
                className="inline-flex items-center gap-2 mb-6 px-5 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-white text-[10px] md:text-[12px] font-black uppercase tracking-[0.3em] backdrop-blur-2xl shadow-[0_0_20px_rgba(6,182,212,0.2)] uppercase"
              >
                <ShieldCheck className="text-cyan-400 w-4 h-4 md:w-5 md:h-5" />{" "}
                Link_Stabilized
              </motion.div>
              <h1 className="text-4xl md:text-[8vw] font-black italic leading-none tracking-tighter mb-12 md:mb-16 uppercase text-white drop-shadow-[0_0_50px_rgba(255,255,255,0.15)] text-center">
                Neural
                <br />
                <span
                  className="text-transparent"
                  style={{ WebkitTextStroke: `2px ${currentPrompt.color}` }}
                >
                  Overdrive
                </span>
              </h1>
              <div className="flex flex-col md:flex-row gap-6 justify-center">
                <button
                  onClick={() => {
                    init();
                    setGameState("LOBBY");
                  }}
                  className="group relative px-8 md:px-14 py-5 md:py-8 bg-white text-black font-black text-xl md:text-3xl hover:bg-cyan-500 hover:text-white transition-all skew-x-[-12deg] shadow-[15px_15px_0px_#000] border-4 border-black uppercase italic active:scale-95 overflow-hidden"
                >
                  Initialize_Sync
                </button>
              </div>
            </motion.div>
          )}

          {gameState === "LOBBY" && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-full max-w-lg bg-slate-900/60 border border-white/10 p-6 md:p-10 rounded-[3rem] md:rounded-[4rem] backdrop-blur-3xl shadow-2xl relative my-6 border-t-white/20 text-white text-left text-left"
            >
              <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6 text-left">
                {lobbyMode && (
                  <button
                    onClick={() => {
                      setLobbyMode(null);
                      setRoomCode("");
                    }}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-xl mr-2 text-cyan-400 shadow-lg"
                  >
                    <ChevronLeft size={20} />
                  </button>
                )}
                <Server size={28} className="text-cyan-400" />
                <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-widest uppercase text-left">
                  Sector_Config
                </h2>
              </div>
              {!lobbyMode ? (
                <div className="grid gap-5 md:gap-7 text-left">
                  <button
                    onClick={() => {
                      setRoomCode(
                        Math.random().toString(36).substring(2, 8).toUpperCase()
                      );
                      setLobbyMode("HOST");
                      prefetch();
                    }}
                    className="w-full group p-6 md:p-8 bg-white/5 border border-white/10 rounded-[2.5rem] flex items-center justify-between hover:bg-white hover:text-black transition-all text-left"
                  >
                    <div>
                      <div className="text-[12px] font-black uppercase opacity-30 mb-1 tracking-widest text-left text-left">
                        Option_A
                      </div>
                      <div className="text-xl md:text-2xl font-black italic uppercase text-left text-left">
                        Host_Sector
                      </div>
                    </div>
                    <Plus
                      size={32}
                      className="text-cyan-400 group-hover:text-black"
                    />
                  </button>
                  <button
                    onClick={() => {
                      setLobbyMode("JOIN");
                      prefetch();
                    }}
                    className="w-full group p-6 md:p-8 bg-white/5 border border-white/10 rounded-[2.5rem] flex items-center justify-between hover:bg-cyan-500 transition-all text-left shadow-2xl text-white hover:text-black"
                  >
                    <div>
                      <div className="text-[12px] font-black uppercase mb-1 opacity-40 uppercase tracking-widest text-left text-left">
                        Option_B
                      </div>
                      <div className="text-xl md:text-2xl font-black italic uppercase text-inherit text-left text-left text-left text-left">
                        Join_Sector
                      </div>
                    </div>
                    <ArrowRight size={32} />
                  </button>
                </div>
              ) : (
                <div className="space-y-8 text-left text-left">
                  <div className="space-y-2 text-left text-left text-left">
                    <label className="text-[10px] md:text-[12px] font-black text-white/30 uppercase block ml-3 tracking-widest uppercase text-left text-left text-left">
                      Operator_Handle
                    </label>
                    <div className="relative text-left text-left text-left">
                      <User
                        size={20}
                        className="absolute left-6 top-1/2 -translate-y-1/2 text-cyan-500/30"
                      />
                      <input
                        value={username}
                        onChange={(e) =>
                          setUsername(e.target.value.toUpperCase().slice(0, 12))
                        }
                        placeholder="NAME..."
                        className="w-full bg-white/5 border border-white/10 p-5 md:p-6 pl-14 rounded-[2rem] focus:outline-none focus:border-cyan-500 font-bold uppercase text-white text-xl md:text-2xl tracking-widest shadow-inner text-left text-left text-left text-left"
                      />
                    </div>
                  </div>
                  {lobbyMode === "HOST" ? (
                    <div className="space-y-2 text-left text-left text-left text-left">
                      <label className="text-[10px] md:text-[12px] font-black text-white/30 uppercase block ml-3 tracking-widest uppercase text-left text-left text-left text-left">
                        Sector_Code
                      </label>
                      <div className="flex items-center justify-between bg-cyan-500/5 border border-cyan-500/10 p-5 rounded-[2rem] shadow-inner text-white text-left text-left text-left">
                        <span className="text-2xl md:text-3xl font-black tracking-[0.4em] text-cyan-400 text-left text-left">
                          {String(roomCode)}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(roomCode);
                            setIsCopied(true);
                            setTimeout(() => setIsCopied(false), 2000);
                          }}
                          className="p-3 bg-cyan-500/10 hover:bg-cyan-500 hover:text-black rounded-xl transition-all text-cyan-400 shadow-xl text-left"
                        >
                          {isCopied ? <Check size={24} /> : <Copy size={24} />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-left text-left text-left text-left">
                      <label className="text-[10px] md:text-[12px] font-black text-white/30 uppercase block ml-3 tracking-widest uppercase text-left text-left text-left text-left">
                        Sector_Key
                      </label>
                      <input
                        value={roomCode}
                        onChange={(e) =>
                          setRoomCode(e.target.value.toUpperCase().slice(0, 8))
                        }
                        placeholder="PASTE_KEY..."
                        className="w-full bg-white/5 border border-white/10 p-5 md:p-6 rounded-[2rem] focus:outline-none focus:border-cyan-500 font-bold uppercase text-white text-xl md:text-2xl tracking-widest shadow-inner text-left text-left text-left text-left"
                      />
                    </div>
                  )}
                  <button
                    onClick={handleConnect}
                    className="w-full p-8 md:p-10 bg-cyan-500 text-black font-black uppercase tracking-[0.1em] rounded-[3rem] hover:bg-white transition-all text-xl md:text-2xl italic shadow-[0_20px_60px_rgba(6,182,212,0.3)] active:scale-95 text-center text-center"
                  >
                    Establish_Uplink
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {gameState === "WAITING" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-4xl bg-slate-900/60 border border-white/20 p-6 md:p-12 rounded-[3rem] md:rounded-[5rem] backdrop-blur-3xl text-center shadow-2xl my-4 text-white text-left text-left text-left"
            >
              <div className="flex items-center justify-between mb-10 text-left border-b border-white/10 pb-8 text-left text-left text-left text-left">
                <button
                  onClick={() => {
                    socketRef.current?.disconnect();
                    setGameState("LOBBY");
                  }}
                  className="p-3 bg-red-500/10 hover:bg-red-500/20 rounded-2xl transition-all text-red-500 shadow border border-red-500/10 text-left text-left"
                >
                  <ChevronLeft size={28} />
                </button>
                <div>
                  <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter mb-1 text-center md:text-left text-left text-left text-left">
                    Sync_Pool
                  </h2>
                  <div className="text-cyan-400 text-[12px] md:text-[14px] font-black tracking-[0.3em] uppercase bg-cyan-500/5 px-5 py-1.5 rounded-full border border-cyan-500/10 shadow-inner text-center md:text-left tracking-widest uppercase text-left text-left text-left">
                    Sector: {String(roomCode)}
                  </div>
                </div>
                <div className="w-10" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-8 mb-12 text-left text-left">
                {players.map((p, i) => (
                  <div
                    key={i}
                    className="p-6 md:p-8 bg-white/5 border border-white/10 rounded-[3rem] flex flex-col items-center gap-4 relative group shadow backdrop-blur-sm transition-all hover:bg-white/10"
                  >
                    <PlayerAvatar
                      seed={String(p.name)}
                      size={60}
                      status={String(p.status)}
                    />
                    <span className="text-sm md:text-lg font-black uppercase truncate w-full tracking-widest drop-shadow-md text-center text-center">
                      {String(p.name)}
                    </span>
                    <div className="absolute top-4 right-4 w-2 h-2 bg-green-500 rounded-full animate-ping" />
                  </div>
                ))}
                {Array.from({ length: Math.max(0, 3 - players.length) }).map(
                  (_, i) => (
                    <div
                      key={i}
                      className="p-6 md:p-8 border-2 border-dashed border-white/10 rounded-[3rem] flex flex-col items-center justify-center opacity-20 text-white/50 text-left text-left text-left text-left"
                    >
                      <Loader2
                        className="animate-spin mb-3 text-center mx-auto"
                        size={32}
                      />
                      <span className="text-xs font-black uppercase tracking-widest uppercase tracking-widest block text-center text-center text-center">
                        Syncing...
                      </span>
                    </div>
                  )
                )}
              </div>
              <div className="flex flex-col md:flex-row gap-6 md:gap-8 text-center text-center justify-center">
                <button
                  onClick={toggleReady}
                  className={`flex-1 p-8 md:p-10 rounded-[2.5rem] font-black text-xl md:text-2xl uppercase italic transition-all shadow-xl text-center text-center ${
                    isReady
                      ? "bg-green-500 text-black border-2 border-black scale-105"
                      : "bg-white/5 border-4 border-white/20 text-white hover:bg-white/10"
                  }`}
                >
                  {isReady ? "READY_SYNC" : "READY_UP?"}
                </button>
                <button
                  onClick={handleHostStart}
                  className="flex-1 p-8 md:p-10 bg-white text-black font-black uppercase rounded-[2.5rem] hover:bg-cyan-500 hover:text-white transition-all text-xl md:text-2xl italic shadow-[0_0_80px_rgba(255,255,255,0.15)] active:scale-95 text-center text-center"
                >
                  Initiate_Sector
                </button>
              </div>
            </motion.div>
          )}

          {gameState === "PLAYING" && (
            <motion.div
              animate={mainControls}
              className="w-full space-y-8 md:space-y-12 flex flex-col items-center py-4 text-center"
            >
              <div className="w-full max-w-xl relative px-4 text-left text-left">
                <div className="flex justify-between text-[9px] md:text-[11px] font-black text-white/30 uppercase mb-3 px-2 tracking-[0.2em] uppercase tracking-widest text-left text-left text-left text-left">
                  <div className="flex items-center gap-2 md:gap-3 text-left text-left text-left">
                    <Radiation
                      size={14}
                      className="animate-spin text-cyan-400"
                    />{" "}
                    Neural_Integrity
                  </div>
                  <div className="flex items-center gap-2 text-cyan-400 font-black uppercase tracking-[0.1em] italic tracking-widest text-left text-left text-left">
                    <TrendingUp size={12} /> LEVEL 0{String(currentLevel)}
                  </div>
                </div>
                <div className="h-2.5 md:h-3.5 w-full bg-slate-950 border-2 border-white/10 rounded-full overflow-hidden shadow-inner">
                  <motion.div
                    animate={{
                      width: `${integrity}%`,
                      backgroundColor:
                        integrity < 30 ? "#ff003c" : currentPrompt.color,
                    }}
                    className="h-full shadow-[0_0_25px_rgba(0,243,255,0.8)] transition-colors duration-500"
                  />
                </div>
              </div>

              <div className="text-center w-full px-4 md:px-6 text-center">
                <div className="inline-flex items-center gap-2 mb-4 px-6 py-1.5 bg-white/5 border border-white/10 rounded-full text-white/40 text-[10px] md:text-[13px] font-black tracking-[0.4em] backdrop-blur-xl italic uppercase shadow uppercase text-center text-center tracking-widest text-center text-center">
                  <ScanSearch size={18} className="text-cyan-400" />{" "}
                  Current_Sector
                </div>
                <h2
                  className="text-3xl md:text-5xl lg:text-7xl font-black italic uppercase tracking-tighter leading-none text-white transition-all duration-300 break-words uppercase text-center text-center tracking-tighter text-center text-center"
                  style={{ textShadow: `0 0 60px ${currentPrompt.color}` }}
                >
                  {isSyncing ? "UPLINKING..." : String(currentPrompt.text)}
                </h2>
              </div>

              <div className="relative w-40 h-40 md:w-56 md:h-56 flex items-center justify-center shrink-0 text-white text-center text-center text-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle
                    cx="50%"
                    cy="50%"
                    r="45%"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="4"
                    fill="none"
                  />
                  <motion.circle
                    cx="50%"
                    cy="50%"
                    r="45%"
                    stroke={timeLeft <= 5 ? "#ff003c" : currentPrompt.color}
                    strokeWidth={timeLeft <= 5 ? 12 : 8}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray="283"
                    animate={{
                      strokeDashoffset: 283 - (283 * timeLeft) / MAX_TIME,
                    }}
                  />
                </svg>
                <div className="text-center">
                  <motion.span
                    animate={
                      timeLeft <= 5
                        ? {
                            scale: [1, 1.3],
                            transition: {
                              duration: 0.1,
                              repeat: Infinity,
                              repeatType: "mirror",
                            },
                          }
                        : {}
                    }
                    className={`text-6xl md:text-8xl font-black tabular-nums transition-all ${
                      timeLeft <= 5 ? "text-red-500" : "text-white"
                    }`}
                  >
                    {String(timeLeft)}
                  </motion.span>
                </div>
              </div>

              <div className="w-full max-w-4xl relative text-center px-4 md:px-6 text-center text-center text-center">
                <form
                  onSubmit={handleSubmit}
                  className="relative z-10 text-center text-center text-center text-center"
                >
                  <input
                    autoFocus
                    disabled={isSyncing || isValidating}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      playPulse(500, 0.02, 0.02);
                    }}
                    className={`w-full bg-transparent border-b-4 md:border-b-8 border-white/5 pb-4 md:pb-6 text-3xl md:text-6xl font-black text-center text-center focus:outline-none transition-all uppercase placeholder:opacity-5 focus:border-cyan-500 ${
                      streak >= 5
                        ? "text-yellow-400 border-yellow-400 shadow-[0_15px_40px_rgba(234,179,8,0.2)]"
                        : "text-white"
                    }`}
                    placeholder={isValidating ? "SCAN..." : "INPUT..."}
                  />

                  <AnimatePresence>
                    {isValidating && (
                      <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute -top-12 md:-top-20 left-0 right-0 flex items-center justify-center gap-4 text-cyan-400 font-black italic tracking-[0.3em] text-sm md:text-lg uppercase bg-cyan-500/10 py-3 md:py-4 rounded-[2rem] border-2 border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.3)] uppercase tracking-widest text-center text-center text-center text-center text-center"
                      >
                        <Loader2 className="animate-spin w-5 h-5 md:w-8 md:h-8" />{" "}
                        Verifying_Synapse
                      </motion.div>
                    )}
                    {streak >= 3 && !isValidating && (
                      <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute -top-12 md:-top-20 left-0 right-0 text-yellow-400 font-black italic text-sm md:text-2xl animate-pulse flex items-center justify-center gap-3 uppercase font-black tracking-widest leading-none uppercase tracking-widest text-center text-center text-center text-center text-center"
                      >
                        <Flame
                          className="w-6 h-6 md:w-10 md:h-10"
                          fill="currentColor"
                        />{" "}
                        {String(stats.tier)} | {String(stats.multiplier)}X_GAIN
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>
                <div className="mt-8 md:mt-12 flex flex-wrap justify-center gap-3 md:gap-6 py-6 px-4 md:px-10 text-white text-center pb-60 text-center text-center">
                  <AnimatePresence mode="popLayout">
                    {answers.map((w, idx) => (
                      <motion.div
                        key={w + idx}
                        layout
                        initial={{ scale: 0, y: 30 }}
                        animate={{ scale: 1, y: 0 }}
                        className="px-5 md:px-8 py-2 md:py-4 bg-white/5 border border-white/10 rounded-[2rem] text-lg md:text-2xl font-black text-white/80 flex items-center gap-3 backdrop-blur-md shadow-lg border-b-4 uppercase tracking-widest italic leading-none"
                        style={{ borderColor: currentPrompt.color }}
                      >
                        <Binary
                          size={20}
                          className="text-cyan-400 opacity-30"
                        />{" "}
                        {String(w).toUpperCase()}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </main>

        {/* Footer */}
        <footer className="sticky bottom-0 p-3 md:p-6 bg-slate-900/90 border-t border-white/10 flex flex-wrap justify-between items-center backdrop-blur-3xl z-50 gap-4 text-left text-left">
          <div className="space-y-1 text-left text-white text-left text-left text-left text-left">
            {logs.map((log, i) => (
              <motion.div
                key={i}
                initial={{ x: -10 }}
                animate={{ x: 0 }}
                className={`text-[10px] md:text-[12px] font-black tracking-widest ${
                  i === 0 ? "text-cyan-400" : "text-white/20"
                }`}
              >
                {`> ${String(log)}`}
              </motion.div>
            ))}
          </div>
          <div className="text-right flex items-center gap-6 text-white/20 text-left text-left text-left text-left">
            <div className="hidden lg:block text-[11px] font-black uppercase tracking-[0.5em] italic leading-none uppercase tracking-widest text-left text-left text-left text-left text-left">
              Terminal_Arch_V12.0_Scaled
            </div>
            <div className="flex items-center gap-4 text-left text-left text-left">
              <Command size={24} />
              <HardDrive size={24} />
            </div>
          </div>
        </footer>
      </div>

      {/* Help Modal Overlay */}
      <AnimatePresence>
        {showHelp && (
          <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 overflow-y-auto text-left text-left text-left">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-slate-900 border border-white/20 p-8 md:p-12 rounded-[3rem] max-w-2xl w-full relative shadow-3xl my-auto text-left text-left text-left text-left"
            >
              <button
                onClick={() => setShowHelp(false)}
                className="absolute top-8 right-8 text-white/40 hover:text-white transition-all"
              >
                <X size={32} />
              </button>
              <h2 className="text-4xl font-black italic uppercase text-cyan-400 mb-8 flex items-center gap-4 text-left text-left text-left text-left text-left">
                <HelpCircle size={40} /> Protocol_Guide
              </h2>
              <div className="space-y-6 text-lg md:text-xl text-white/80 leading-relaxed font-bold italic text-left text-left text-left text-left text-left">
                <p>{">"} ENTER A SECTOR AND DECODE THE TARGET CATEGORY.</p>
                <p>{">"} TYPE VALID WORDS TO RECOVER NEURAL DATA.</p>
                <p>{">"} STREAKS INCREASE MULTIPLIERS (UP TO 5X).</p>
                <p>{">"} REACH SCORE THRESHOLDS TO UNLOCK NEW SECTORS.</p>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="mt-12 w-full py-6 bg-white text-black font-black uppercase text-2xl rounded-2xl hover:bg-cyan-500 hover:text-white transition-all text-center text-center"
              >
                Acknowledged
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Game Over Screen */}
      <AnimatePresence>
        {gameState === "GAMEOVER" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#020512]/98 flex flex-col items-center justify-start p-6 md:p-12 overflow-y-auto scroll-smooth text-white text-center text-center text-center text-center"
          >
            <motion.div
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center space-y-8 md:space-y-16 max-w-6xl w-full py-8 md:py-16 pb-60 text-center text-center text-center text-center text-center text-center"
            >
              <div className="relative inline-block px-10 text-center text-center text-center text-center text-center">
                <motion.h2
                  animate={{ skewX: [-10, 10] }}
                  transition={{
                    duration: 0.1,
                    repeat: Infinity,
                    repeatType: "mirror",
                  }}
                  className="text-red-500 text-5xl md:text-[12vw] font-black italic uppercase tracking-tighter drop-shadow-[0_0_60px_rgba(255,0,0,0.8)] leading-none text-center tracking-tighter text-center text-center text-center text-center"
                >
                  SIGNAL_LOST
                </motion.h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-20 items-center text-left text-white text-left text-left text-left text-left text-left">
                <div className="space-y-10 md:space-y-16 text-left text-left text-left text-left text-left">
                  <div className="flex flex-col sm:flex-row items-center gap-8 bg-white/5 p-6 md:p-10 rounded-[3rem] md:rounded-[7rem] border border-white/10 shadow-2xl text-center sm:text-left backdrop-blur-md text-white text-left text-left text-left text-left text-left text-left">
                    <PlayerAvatar
                      seed={String(username)}
                      size={100}
                      className="border-red-600 border-4 shadow-3xl text-left text-left text-left"
                    />
                    <div className="flex-1 text-left text-left text-left text-left text-left">
                      <div className="text-[12px] md:text-[14px] font-black text-white/20 uppercase tracking-[0.4em] mb-1.5 uppercase tracking-widest text-left text-left text-left text-left text-left">
                        Operator_Index
                      </div>
                      <div className="text-4xl md:text-6xl font-black text-red-500 uppercase italic tracking-tighter leading-none mb-3 text-left text-left text-left text-left text-left">
                        {String(username || "UNKNOWN")}
                      </div>
                      <div className="inline-flex items-center gap-2 bg-red-600/20 text-red-500 border border-red-500/30 px-4 py-1 rounded-full font-black text-[10px] uppercase tracking-widest animate-pulse text-left text-left text-left text-left text-left text-left">
                        Disconnected
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 md:space-y-10 px-4 text-left text-left text-left text-left text-left">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-end border-b-2 border-white/5 pb-6 group text-left text-left text-left text-left text-left">
                      <span className="text-sm md:text-xl font-black text-white/15 uppercase tracking-[0.3em] transition-colors group-hover:text-cyan-400 uppercase tracking-widest text-left text-left text-left text-left text-left">
                        Archive_Result
                      </span>
                      <span className="text-5xl md:text-8xl font-black text-white tabular-nums tracking-tighter leading-none drop-shadow-xl text-left text-left text-left text-left text-left">
                        {String(score)}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-end border-b-2 border-white/5 pb-6 group text-left text-left text-left text-left text-left text-left">
                      <span className="text-sm md:text-xl font-black text-white/15 uppercase tracking-[0.3em] transition-colors group-hover:text-yellow-400 uppercase tracking-widest text-left text-left text-left text-left text-left text-left">
                        Peak_Synapse
                      </span>
                      <span className="text-7xl md:text-8xl font-black text-yellow-500 tabular-nums tracking-tighter leading-none drop-shadow-xl text-left text-left text-left text-left text-left text-left text-left">
                        {String(streak)}x
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/90 p-8 md:p-16 rounded-[4rem] border-l-[16px] md:border-l-[32px] border-red-700 backdrop-blur-3xl shadow-3xl border border-white/10 text-left relative overflow-hidden text-white text-left text-left text-left text-left text-left">
                  <div className="relative z-10 text-left text-left text-left text-left text-left">
                    <div className="flex items-center justify-between mb-12 border-b border-white/10 pb-6 uppercase italic text-sm md:text-base uppercase tracking-widest text-left text-white text-left text-left text-left text-left text-left text-left text-left">
                      <p className="text-white/30 font-black tracking-[0.6em] uppercase text-xs md:text-sm italic uppercase text-left text-left text-left text-left text-left">
                        Session_Analysis
                      </p>
                      <Sparkles className="text-white/10" size={24} />
                    </div>
                    <p className="text-[10px] font-black text-white/15 uppercase tracking-[0.8em] mb-3 uppercase tracking-widest text-white/40 text-left text-left text-left text-left text-left text-left">
                      Classification
                    </p>
                    <p className="text-4xl md:text-7xl font-black text-white italic tracking-tighter uppercase leading-none mb-12 drop-shadow-2xl uppercase text-left tracking-tighter text-white text-left text-left text-left text-left text-left text-left">
                      {score >= 8000
                        ? "NEURAL_GOD"
                        : score >= 4000
                        ? "SYNC_ELITE"
                        : "DATA_GHOST"}
                    </p>
                    <div className="flex items-center gap-8 pt-10 border-t border-white/5 text-left text-left text-left text-left text-left text-left">
                      <div className="p-5 md:p-6 bg-cyan-600/20 rounded-[2rem] border-2 border-cyan-500/20 shadow-xl text-white text-left text-left text-left">
                        <Trophy
                          size={40}
                          className="text-cyan-400 animate-bounce"
                        />
                      </div>
                      <div className="text-left text-left text-left text-left text-left">
                        <div className="text-[10px] md:text-[12px] font-black text-white/20 uppercase tracking-[0.3em] mb-1.5 uppercase tracking-widest text-white/40 text-left text-left text-left text-left text-left text-left">
                          Global_Peak
                        </div>
                        <div className="text-3xl md:text-5xl font-black text-cyan-400 italic uppercase tabular-nums tracking-tight drop-shadow-lg text-left text-left text-left text-left text-left text-left">
                          {String(highScore)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-6 md:gap-10 justify-center pt-16 pb-40 text-center text-center text-center text-center text-center text-center">
                <button
                  onClick={() => window.location.reload()}
                  className="group relative px-12 md:px-20 py-8 md:py-12 bg-white text-black font-black text-xl md:text-4xl hover:bg-red-600 hover:text-white transition-all skew-x-[-12deg] shadow-[20px_20px_0px_#000] active:translate-x-3 active:translate-y-3 active:shadow-none uppercase italic overflow-hidden text-center text-center text-center text-center"
                >
                  <span className="relative z-10 flex items-center gap-5 md:gap-8 uppercase font-black font-black italic tracking-widest text-center text-center text-center text-center text-center">
                    RE-INITIALIZE <Zap size={32} fill="currentColor" />
                  </span>
                </button>

                <button
                  onClick={handleShareResult}
                  className="px-10 md:px-16 py-8 md:py-12 border-4 border-cyan-500/30 font-black text-lg md:text-3xl hover:bg-cyan-500 hover:text-white transition-all skew-x-[-12deg] uppercase italic text-cyan-400 tracking-widest shadow-xl text-center text-center text-center text-center"
                >
                  SHARE_RESULT <Share2 className="inline ml-2" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
