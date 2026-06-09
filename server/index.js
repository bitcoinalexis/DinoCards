import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

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
  res.json({ status: "ok", queue: queue.length, rooms: rooms.size });
});

let queue = [];
const rooms = new Map();

function removeFromQueue(id) {
  queue = queue.filter((p) => p.id !== id);
}

function createRoom(a, b) {
  const roomId = "room_" + Math.random().toString(36).slice(2, 9);
  rooms.set(roomId, { id: roomId, players: [a.id, b.id], turn: a.id });

  a.join(roomId);
  b.join(roomId);

  a.data.roomId = roomId;
  b.data.roomId = roomId;

  a.emit("matchFound", { roomId, you: a.id, opponent: b.id, first: true });
  b.emit("matchFound", { roomId, you: b.id, opponent: a.id, first: false });
}

io.on("connection", (socket) => {
  socket.on("findMatch", (profile = {}) => {
    socket.data.name = profile.name || "Jugador";
    removeFromQueue(socket.id);

    if (queue.length > 0) {
      const opponent = queue.shift();
      createRoom(opponent, socket);
    } else {
      queue.push(socket);
      socket.emit("searching");
    }
  });

  socket.on("cancelMatch", () => {
    removeFromQueue(socket.id);
    socket.emit("searchCancelled");
  });

  socket.on("gameAction", (payload) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    socket.to(roomId).emit("gameAction", payload);
  });

  socket.on("disconnect", () => {
    removeFromQueue(socket.id);
    const roomId = socket.data.roomId;
    if (roomId && rooms.has(roomId)) {
      socket.to(roomId).emit("opponentLeft");
      rooms.delete(roomId);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log("Servidor escuchando en puerto " + PORT);
});
