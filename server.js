const io = require("socket.io")(3000, {
  cors: { origin: "*" },
});

const rooms = {};

io.on("connection", (socket) => {
  console.log(`>>> Node Connected: ${socket.id}`);

  socket.on("join-room", ({ roomCode, username }) => {
    socket.join(roomCode);

    if (!rooms[roomCode]) {
      rooms[roomCode] = {
        words: [],
        players: [],
        currentQuestion: "WAITING FOR UPLINK...",
        isSyncing: false,
      };
    }

    const player = {
      id: socket.id,
      name: username,
      score: 0,
      streak: 0,
      lastSubmit: Date.now(),
    };
    rooms[roomCode].players.push(player);

    // Immediate sync for new player
    socket.emit("sync-question", rooms[roomCode].currentQuestion);
    io.to(roomCode).emit("player-update", rooms[roomCode].players);
  });

  socket.on("submit-word", ({ roomCode, word, username }) => {
    const room = rooms[roomCode];
    if (!room || room.isSyncing) return;

    const normalizedWord = word.toLowerCase().trim();

    if (normalizedWord && !room.words.includes(normalizedWord)) {
      room.words.push(normalizedWord);

      const player = room.players.find((p) => p.id === socket.id);
      if (player) {
        const timeDiff = Date.now() - player.lastSubmit;
        player.score += timeDiff < 3000 ? 150 : 100;
        player.lastSubmit = Date.now();
      }

      io.to(roomCode).emit("new-word", { word: normalizedWord, username });
      io.to(roomCode).emit("player-update", room.players);
    } else {
      socket.emit("word-error", "Duplicate Data Detected.");
    }
  });

  socket.on("change-question", ({ roomCode, question }) => {
    const room = rooms[roomCode];
    if (room) {
      room.isSyncing = false;
      room.words = [];
      room.currentQuestion = question;
      io.to(roomCode).emit("sync-question", question);
      io.to(roomCode).emit("player-update", room.players);
    }
  });

  socket.on("set-syncing", ({ roomCode, status }) => {
    if (rooms[roomCode]) {
      rooms[roomCode].isSyncing = status;
      io.to(roomCode).emit("sync-status", status);
    }
  });

  socket.on("disconnect", () => {
    for (const roomCode in rooms) {
      const room = rooms[roomCode];
      room.players = room.players.filter((p) => p.id !== socket.id);
      if (room.players.length === 0) delete rooms[roomCode];
      else io.to(roomCode).emit("player-update", room.players);
    }
  });
});

console.log("NEURAL SERVER: ONLINE ON PORT 3000");
