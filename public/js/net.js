let socket = null;
const listeners = new Map();

const FORWARD = [
  "searching",
  "searchCancelled",
  "matchFound",
  "opponentLeft",
  "gameStart",
  "countdown",
  "cardRevealed",
  "matchAvailable",
  "claimResult",
  "penalty",
  "gameOver"
];

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export async function connect() {
  if (socket) return socket;
  try {
    await loadScript("/socket.io/socket.io.js");
    socket = window.io({ transports: ["websocket", "polling"] });
    socket.on("connect", () => emit("status", "online"));
    socket.on("disconnect", () => emit("status", "offline"));
    for (const ev of FORWARD) socket.on(ev, (d) => emit(ev, d));
    return socket;
  } catch (err) {
    emit("status", "offline");
    return null;
  }
}

export function on(event, cb) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(cb);
}

function emit(event, data) {
  const set = listeners.get(event);
  if (set) set.forEach((cb) => cb(data));
}

function send(event, payload) {
  if (socket && socket.connected) socket.emit(event, payload);
}

export function findMatch(profile) {
  send("findMatch", profile);
}

export function cancelMatch() {
  send("cancelMatch");
}

export function ready() {
  send("ready");
}

export function claim() {
  send("claim");
}

export function leaveGame() {
  send("leaveGame");
}

export function myId() {
  return socket ? socket.id : null;
}

export function isOnline() {
  return !!(socket && socket.connected);
}
