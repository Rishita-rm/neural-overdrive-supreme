# Neural Overdrive Supreme ⚡🧠

A **real-time, multiplayer, AI-powered trivia engine** where the “game master” is **Google Gemini**.
Unlike classic trivia apps with static question banks, Neural Overdrive Supreme generates **fresh categories on-the-fly** and validates answers using a **hybrid local-first + AI verification** system.

> **One-liner:** *Infinite trivia. Real-time multiplayer. AI as the judge.*

---

## Why This Exists (Problem → Solution)

### Problem
Most trivia games are **static**:
- Limited question database
- Repetitive categories
- Predictable gameplay

### Solution
Neural Overdrive Supreme makes the game **dynamic**:
- Gemini generates **unique categories** every round
- Players compete in **real-time** via WebSockets
- Answers are validated with a **smart hybrid system** (fast + accurate)

---

## Key Features

### ✅ Infinite Categories (AI-Generated)
Gemini creates new categories each session (e.g., **Cyberpunk Movies**, **Exotic Fruits**, **Underground Sports**).

### ⚡ Real-time Multiplayer Sync
Powered by **Socket.io**:
- Join/create a room (“Sector”)
- Host starts the session
- Everyone receives the same prompt at the same time

### 🧠 Hybrid Validation (Local-first + AI)
To reduce latency + API cost:
- **Common answers** → instant check using local examples list
- **Obscure answers** → Gemini verifies semantically (synonyms/spelling)

### 🔥 Streak Multipliers + Integrity System
- Streaks increase score multipliers
- “Neural Integrity” (health) grows with correct answers

### 🎛️ Performance Optimizations
- **Prefetch next category** during gameplay
- State-heavy UI optimized using React hooks + memoization

---

## Tech Stack

### Frontend
- **Next.js 13 (App Router)**
- **React + TypeScript**
- **Tailwind CSS** (cyberpunk + glassmorphism)
- **Framer Motion** (animations / transitions)
- **Lucide Icons**

### Real-time Layer
- **Socket.io** (rooms, events, sync)

### AI Engine
- **Google Gemini** (category generation + validation)

---

## System Architecture (High Level)

1. Player enters username → joins/creates a **Sector (room)**
2. Socket.io syncs players + room state
3. Host triggers `start-game`
4. Backend requests Gemini category (or uses prefetched prompt)
5. Client displays category + countdown timer
6. Player submits answers:
   - Local check first
   - If needed, Gemini verifies
7. Score updates in real-time
8. After 5 valid answers, new category is synced

---

## Folder Structure (Suggested)

```bash
.
├── app/
│   └── page.tsx            # Main UI (game)
├── server/
│   └── server.js           # Socket.io server
├── lib/
│   └── socket.ts           # (optional) shared socket client
├── public/
│   └── demo-*.png          # screenshots
└── README.md
```

---

## Getting Started

### 1) Clone

```bash
git clone <your-repo-url>
cd neural-overdrive-supreme
```

### 2) Install dependencies

```bash
npm install
```

### 3) Environment Variables

Create `.env.local` in the root:

```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
NEXT_PUBLIC_GEMINI_API_KEY=YOUR_KEY_HERE
```

> ⚠️ For best security, move Gemini calls to a server route (not client). This repo currently supports client-side Gemini for rapid prototyping.

### 4) Run the Socket.io server

In one terminal:

```bash
node server/server.js
```

### 5) Run the Next.js app

In another terminal:

```bash
npm run dev
```

Open:
- `http://localhost:3000`

---

## Socket Events (Client ↔ Server)

### Client → Server
- `join-room` → `{ roomCode, username }`
- `player-ready` → `{ roomCode, username, status }`
- `start-game-request` → `{ roomCode }`
- `change-question` → `{ roomCode, question, examples }`
- `submit-word` → `{ roomCode, word, username }`

### Server → Client
- `player-update` → `[{ name, status }]`
- `start-game-signal`
- `sync-question` → `{ question, examples }`
- `new-word` → `{ word, username }`
- `word-error` → `string`

---

## Roadmap

- 🎙️ **Voice-command answers**
- 🎚️ **Dynamic difficulty scaling** per player skill
- 🏆 **Global leaderboard** (Firestore)
- 🧩 Better anti-spam / rate limiting
- 🔐 Move Gemini calls to backend for secure key handling

---

## Recruiter Highlights

- **Real-time multiplayer** with Socket.io room sync
- **Hybrid AI validation** to reduce latency + cost
- **Prefetching** and state optimization for a smooth UX
- Strong product thinking: infinite replayability + scalable architecture

---

## License

Choose one:
- MIT
- Apache-2.0
- Proprietary

---

## Author

**Rishita Makkar**

- LinkedIn: (link)
- GitHub: (link)
