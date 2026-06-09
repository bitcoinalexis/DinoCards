import { MenuScene } from "./menu.js";
import { GameScene } from "./game.js";
import { LocalGame } from "./localGame.js";
import * as audio from "./audio.js";
import * as net from "./net.js";

const canvas = document.getElementById("scene");
const menu = new MenuScene(canvas);
menu.start();

let game = null;
let local = null;
let mode = null;
let match = null;
let currentDiff = "normal";

const el = {
  menuUI: document.getElementById("ui"),
  mainMenu: document.getElementById("mainMenu"),
  searchPanel: document.getElementById("searchPanel"),
  searchText: document.getElementById("searchText"),
  difficultyPanel: document.getElementById("difficultyPanel"),
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
  el.difficultyPanel.classList.add("hidden");
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
  el.takeBtn.classList.toggle("armed", !!on);
}

function setupGameView(youId, oppId, oppName) {
  match = { you: youId, opponent: oppId, scores: {} };
  match.scores[youId] = 0;
  match.scores[oppId] = 0;

  el.oppName.textContent = (oppName || "RIVAL").toUpperCase();
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
}

function enterGameOnline(data) {
  mode = "online";
  setupGameView(data.you, data.opponent, data.opponentName);
  net.ready();
}

function enterGameLocal(diff) {
  mode = "local";
  currentDiff = diff;
  setupGameView("human", "ia", "IA");
  local = new LocalGame(gameHandlers, { difficulty: diff });
  local.start();
}

function updateScores(scores) {
  if (!match) return;
  match.scores = scores;
  el.scoreYou.textContent = String(scores[match.you] ?? 0);
  el.scoreOpp.textContent = String(scores[match.opponent] ?? 0);
}

function endGameInstances() {
  if (game) {
    game.stop();
    game = null;
  }
  if (local) {
    local.stop();
    local = null;
  }
}

function leaveToMenu() {
  endGameInstances();
  if (mode === "online") net.leaveGame();
  mode = null;
  match = null;
  el.gameUI.classList.add("hidden");
  el.result.classList.add("hidden");
  el.menuUI.classList.remove("hidden");
  showMenuPanel(el.mainMenu);
  menu.start();
}

const gameHandlers = {
  countdown(n) {
    if (n > 0) {
      el.countdown.classList.remove("hidden");
      el.countNum.textContent = String(n);
    } else {
      el.countNum.textContent = "¡YA!";
      setTimeout(() => el.countdown.classList.add("hidden"), 500);
    }
  },
  cardRevealed(d) {
    audio.play("cardFlip");
    if (game) game.addCard(d.card, d.index);
  },
  matchAvailable(d) {
    if (game) game.highlight(d.cards);
    armTake(true);
  },
  claimResult(d) {
    armTake(false);
    if (game) game.removeCards(d.removed);
    updateScores(d.scores);
    if (match) {
      if (d.winner === match.you) toast("¡Tomaste el par!");
      else toast("El rival tomó el par");
    }
  },
  penalty() {
    el.takeBtn.classList.add("locked");
    armTake(false);
    toast("¡Sin par! Bloqueado", 1200);
    setTimeout(() => el.takeBtn.classList.remove("locked"), 1500);
  },
  gameOver(d) {
    armTake(false);
    updateScores(d.scores);
    const win = match && d.winner === match.you;
    el.resultTitle.textContent = d.winner ? (win ? "¡GANASTE!" : "PERDISTE") : "EMPATE";
    if (match) {
      el.resultDetail.textContent =
        "Pares  " + (d.scores[match.you] ?? 0) + " - " + (d.scores[match.opponent] ?? 0);
    }
    setTimeout(() => el.result.classList.remove("hidden"), 700);
  }
};

document.body.addEventListener("click", (e) => {
  audio.initAudio();
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
  } else if (action === "vsAI") {
    showMenuPanel(el.difficultyPanel);
  } else if (action === "startAI") {
    enterGameLocal(btn.dataset.diff || "normal");
  } else if (action === "howto" || action === "credits") {
    el.infoTitle.textContent = INFO[action].title;
    el.infoBody.textContent = INFO[action].body;
    showMenuPanel(el.infoPanel);
  } else if (action === "back") {
    showMenuPanel(el.mainMenu);
  } else if (action === "take") {
    if (mode === "local" && local) local.claim();
    else net.claim();
  } else if (action === "rematch") {
    if (mode === "local") {
      const diff = currentDiff;
      endGameInstances();
      enterGameLocal(diff);
    } else {
      el.result.classList.add("hidden");
      el.gameUI.classList.add("hidden");
      el.menuUI.classList.remove("hidden");
      endGameInstances();
      menu.start();
      showMenuPanel(el.searchPanel);
      el.searchText.textContent = "Buscando oponente...";
      net.leaveGame();
      net.findMatch({ name: "Jugador" });
    }
  } else if (action === "toMenu") {
    leaveToMenu();
  }
});

net.on("status", (s) => setStatus(s === "online" ? "En línea" : "Sin conexión", s));
net.on("searching", () => {
  el.searchText.textContent = "Buscando oponente...";
});
net.on("matchFound", (data) => enterGameOnline(data));
net.on("countdown", (n) => gameHandlers.countdown(n));
net.on("cardRevealed", (d) => gameHandlers.cardRevealed(d));
net.on("matchAvailable", (d) => gameHandlers.matchAvailable(d));
net.on("claimResult", (d) => gameHandlers.claimResult(d));
net.on("penalty", (d) => gameHandlers.penalty(d));
net.on("gameOver", (d) => gameHandlers.gameOver(d));
net.on("opponentLeft", () => {
  toast("El rival abandonó", 2000);
  el.resultTitle.textContent = "¡GANASTE!";
  el.resultDetail.textContent = "Tu rival abandonó la partida";
  setTimeout(() => el.result.classList.remove("hidden"), 600);
});

setStatus("Conectando...");
net.connect();
