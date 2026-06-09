import { MenuScene } from "./menu.js";
import * as net from "./net.js";

const canvas = document.getElementById("scene");
const scene = new MenuScene(canvas);
scene.start();

const mainMenu = document.getElementById("mainMenu");
const searchPanel = document.getElementById("searchPanel");
const searchText = document.getElementById("searchText");
const infoPanel = document.getElementById("infoPanel");
const infoTitle = document.getElementById("infoTitle");
const infoBody = document.getElementById("infoBody");
const statusEl = document.getElementById("status");

const INFO = {
  howto: {
    title: "Cómo jugar",
    body: "Despliega tus cartas sobre la mesa del bosque. Cada carta se revela con un giro. Conecta con otro jugador en tiempo real y enfréntate por turnos. Pronto más reglas."
  },
  credits: {
    title: "Créditos",
    body: "Dino Bey - Card Battle. Construido con Three.js y Socket.IO. Hospedado en Railway."
  }
};

function show(panel) {
  mainMenu.classList.add("hidden");
  searchPanel.classList.add("hidden");
  infoPanel.classList.add("hidden");
  if (panel) panel.classList.remove("hidden");
}

function setStatus(text, cls) {
  statusEl.textContent = text;
  statusEl.className = "status" + (cls ? " " + cls : "");
}

document.body.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;

  if (action === "play") {
    show(searchPanel);
    searchText.textContent = net.isOnline() ? "Buscando oponente..." : "Sin conexión al servidor";
    net.findMatch({ name: "Jugador" });
  } else if (action === "cancel") {
    net.cancelMatch();
    show(mainMenu);
  } else if (action === "howto" || action === "credits") {
    const info = INFO[action];
    infoTitle.textContent = info.title;
    infoBody.textContent = info.body;
    show(infoPanel);
  } else if (action === "back") {
    show(mainMenu);
  }
});

net.on("status", (s) => {
  if (s === "online") setStatus("En línea", "online");
  else setStatus("Sin conexión", "offline");
});

net.on("searching", () => {
  searchText.textContent = "Buscando oponente...";
});

net.on("matchFound", (data) => {
  searchText.textContent = "Oponente encontrado. Preparando partida...";
  console.log("matchFound", data);
});

net.on("opponentLeft", () => {
  searchText.textContent = "El oponente abandonó.";
});

setStatus("Conectando...");
net.connect();
