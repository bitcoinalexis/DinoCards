import { MenuScene } from "./menu.js";
import { GameScene } from "./game.js";
import * as net from "./net.js";

const canvas = document.getElementById("scene");
const menu = new MenuScene(canvas);
menu.start();

let game = null;
let match = null;

const el = {
  menuUI: document.getElementById("ui"),
  mainMenu: document.getElementById("mainMenu"),
  searchPanel: document.getElementById("searchPanel"),
  searchText: document.getElementById("searchText"),
  infoPanel: document.getElementById("infoPanel"),
  infoTitle: document.getElementById("infoTitle"),
  infoBody: document.getElementById("infoBody"),
  status: document.getElementById("status"),
  gameUI: document.getElementById("gameUI"),
  scoreYou: document.getElementById("scoreYou"),
  scoreOpp: document.getElementById("scoreOpp"),
  oppName: document.getElementById("oppName"),
  takeBtn: document.getElementById("takeBtn"),
  toast: document.getElementById("toast"),
  countdown: document.getElementById("countdown"),
  countNum: document.getElementById("countNum"),
  result: document.getElementById("resultScreen"),
  resultTitle: document.getElementById("resultTitle"),
  resultDetail: document.getElementById("resultDetail")
};

const INFO = {
  howto: {
    title: "Cómo jugar",
    body: "Cada segundo cae una carta a la mesa girando hasta mostrar su cara. Cuando dos cartas iguales quedan sobre la mesa, el primero en pulsar TOMAR se lleva el par. Cuidado: pulsar sin par te bloquea un instante. Gana quien junte 4 pares."
  },
  credits: {
    title: "Créditos",
    body: "Dino Bey - Card Battle. Three.js + Socket.IO. Hospedado en Railway."
  }
};

function showMenuPanel(panel) {
  el.mainMenu.classList.add("hidden");
  el.searchPanel.classList.add("hidden");
  el.infoPanel.classList.add("hidden");
  if (panel) panel.classList.remove("hidden");
}

function setStatus(text, cls) {
  el.status.textContent = text;
  el.status.className = "status" + (cls ? " " + cls : "");
}

let toastTimer = null;
function toast(text, ms = 1400) {
  el.toast.textContent = text;
  el.toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.add("hidden"), ms);
}

function armTake(on) {
  if (on) el.takeBtn.classList.add("armed");
  else el.takeBtn.classList.remove("armed");
}

function enterGame(data) {
  match = { you: data.you, opponent: data.opponent, scores: {} };
  match.scores[data.you] = 0;
  match.scores[data.opponent] = 0;

  el.oppName.textContent = (data.opponentName || "RIVAL").toUpperCase();
  el.scoreYou.textContent = "0";
  el.scoreOpp.textContent = "0";

  menu.stop();
  el.menuUI.classList.add("hidden");
  el.result.classList.add("hidden");
  el.gameUI.classList.remove("hidden");
  armTake(false);
  el.takeBtn.classList.remove("locked");

  game = new GameScene(menu.renderer);
  game.start();

  net.ready();
}

function updateScores(scores) {
  if (!match) return;
  match.scores = scores;
  el.scoreYou.textContent = String(scores[match.you] ?? 0);
  el.scoreOpp.textContent = String(scores[match.opponent] ?? 0);
}

function leaveToMenu() {
  if (game) {
    game.stop();
    game = null;
  }
  net.leaveGame();
  match = null;
  el.gameUI.classList.add("hidden");
  el.result.classList.add("hidden");
  el.menuUI.classList.remove("hidden");
  showMenuPanel(el.mainMenu);
  menu.start();
}

document.body.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;

  if (action === "play") {
    showMenuPanel(el.searchPanel);
    el.searchText.textContent = net.isOnline() ? "Buscando oponente..." : "Sin conexión al servidor";
    net.findMatch({ name: "Jugador" });
  } else if (action === "cancel") {
    net.cancelMatch();
    showMenuPanel(el.mainMenu);
  } else if (action === "howto" || action === "credits") {
    el.infoTitle.textContent = INFO[action].title;
    el.infoBody.textContent = INFO[action].body;
    showMenuPanel(el.infoPanel);
  } else if (action === "back") {
    showMenuPanel(el.mainMenu);
  } else if (action === "take") {
    net.claim();
  } else if (action === "rematch") {
    el.result.classList.add("hidden");
    el.gameUI.classList.add("hidden");
    el.menuUI.classList.remove("hidden");
    if (game) { game.stop(); game = null; }
    menu.start();
    showMenuPanel(el.searchPanel);
    el.searchText.textContent = "Buscando oponente...";
    net.leaveGame();
    net.findMatch({ name: "Jugador" });
  } else if (action === "toMenu") {
    leaveToMenu();
  }
});

net.on("status", (s) => setStatus(s === "online" ? "En línea" : "Sin conexión", s));

net.on("searching", () => {
  el.searchText.textContent = "Buscando oponente...";
});

net.on("matchFound", (data) => enterGame(data));

net.on("countdown", (n) => {
  if (n > 0) {
    el.countdown.classList.remove("hidden");
    el.countNum.textContent = String(n);
  } else {
    el.countNum.textContent = "¡YA!";
    setTimeout(() => el.countdown.classList.add("hidden"), 500);
  }
});

net.on("cardRevealed", (d) => {
  if (game) game.addCard(d.card, d.index);
});

net.on("matchAvailable", (d) => {
  if (game) game.highlight(d.cards);
  armTake(true);
});

net.on("claimResult", (d) => {
  armTake(false);
  if (game) game.removeCards(d.removed);
  updateScores(d.scores);
  if (match) {
    if (d.winner === match.you) toast("¡Tomaste el par!");
    else toast("El rival tomó el par");
  }
});

net.on("penalty", () => {
  el.takeBtn.classList.add("locked");
  armTake(false);
  toast("¡Sin par! Bloqueado", 1200);
  setTimeout(() => el.takeBtn.classList.remove("locked"), 1500);
});

net.on("gameOver", (d) => {
  armTake(false);
  updateScores(d.scores);
  const win = match && d.winner === match.you;
  el.resultTitle.textContent = d.winner ? (win ? "¡GANASTE!" : "PERDISTE") : "EMPATE";
  if (match) {
    el.resultDetail.textContent =
      "Pares  " + (d.scores[match.you] ?? 0) + " - " + (d.scores[match.opponent] ?? 0);
  }
  setTimeout(() => el.result.classList.remove("hidden"), 700);
});

net.on("opponentLeft", () => {
  toast("El rival abandonó", 2000);
  el.resultTitle.textContent = "¡GANASTE!";
  el.resultDetail.textContent = "Tu rival abandonó la partida";
  setTimeout(() => el.result.classList.remove("hidden"), 600);
});

setStatus("Conectando...");
net.connect();
