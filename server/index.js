import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { Game } from "./game.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;
const publicDir = join(__dirname, "..", "public");

app.use(express.static(publicDir));

app.get("/health", (req, res) => {
  res.json({ status: "ok", queue: queue.length, games: games.size });
});

let queue = [];
const games = new Map();

function removeFromQueue(id) {
  queue = queue.filter((s) => s.id !== id);
}

function createMatch(a, b) {
  const roomId = "room_" + Math.random().toString(36).slice(2, 9);
  a.join(roomId);
  b.join(roomId);
  a.data.roomId = roomId;
  b.data.roomId = roomId;

  const game = new Game(io, roomId);
  game.addPlayer(a.id);
  game.addPlayer(b.id);
  games.set(roomId, game);

  a.emit("matchFound", { roomId, you: a.id, opponent: b.id, opponentName: b.data.name });
  b.emit("matchFound", { roomId, you: b.id, opponent: a.id, opponentName: a.data.name });
}

io.on("connection", (socket) => {
  socket.on("findMatch", (profile = {}) => {
    socket.data.name = profile.name || "Jugador";
    removeFromQueue(socket.id);
    if (queue.length > 0) {
      const opponent = queue.shift();
      createMatch(opponent, socket);
    } else {
      queue.push(socket);
      socket.emit("searching");
    }
  });

  socket.on("cancelMatch", () => {
    removeFromQueue(socket.id);
    socket.emit("searchCancelled");
  });

  socket.on("ready", () => {
    const game = games.get(socket.data.roomId);
    if (game) game.markReady(socket.id);
  });

  socket.on("claim", () => {
    const game = games.get(socket.data.roomId);
    if (game) game.claim(socket.id);
  });

  socket.on("leaveGame", () => {
    const roomId = socket.data.roomId;
    const game = games.get(roomId);
    if (game) {
      game.stop();
      socket.to(roomId).emit("opponentLeft");
      games.delete(roomId);
    }
    socket.leave(roomId);
    socket.data.roomId = null;
  });

  socket.on("disconnect", () => {
    removeFromQueue(socket.id);
    const roomId = socket.data.roomId;
    const game = games.get(roomId);
    if (game) {
      game.stop();
      socket.to(roomId).emit("opponentLeft");
      games.delete(roomId);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log("Servidor escuchando en puerto " + PORT);
});
