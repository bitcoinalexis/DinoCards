let socket = null;
const listeners = new Map();

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
    socket.on("searching", () => emit("searching"));
    socket.on("searchCancelled", () => emit("searchCancelled"));
    socket.on("matchFound", (d) => emit("matchFound", d));
    socket.on("opponentLeft", () => emit("opponentLeft"));
    socket.on("gameAction", (d) => emit("gameAction", d));
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

export function findMatch(profile) {
  if (socket && socket.connected) socket.emit("findMatch", profile);
}

export function cancelMatch() {
  if (socket && socket.connected) socket.emit("cancelMatch");
}

export function sendAction(payload) {
  if (socket && socket.connected) socket.emit("gameAction", payload);
}

export function isOnline() {
  return !!(socket && socket.connected);
}
