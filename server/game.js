const TYPES = ["red", "blue", "b", "white", "bu", "wo"];

function buildDeck(copies) {
  const deck = [];
  let uid = 0;
  for (let c = 0; c < copies; c++) {
    for (const t of TYPES) deck.push({ uid: uid++, type: t });
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = deck[i];
    deck[i] = deck[j];
    deck[j] = tmp;
  }
  return deck;
}

export class Game {
  constructor(io, roomId) {
    this.io = io;
    this.roomId = roomId;
    this.players = [];
    this.ready = new Set();
    this.scores = {};
    this.deck = buildDeck(6);
    this.table = [];
    this.matchOpen = false;
    this.matchPair = null;
    this.locked = {};
    this.timer = null;
    this.over = false;
    this.target = 4;
  }

  addPlayer(id) {
    this.players.push(id);
    this.scores[id] = 0;
  }

  markReady(id) {
    this.ready.add(id);
    if (this.ready.size >= this.players.length && !this.started) {
      this.started = true;
      this.start();
    }
  }

  start() {
    this.io.to(this.roomId).emit("gameStart", {
      players: this.players,
      target: this.target
    });
    let n = 3;
    this.io.to(this.roomId).emit("countdown", n);
    const cd = setInterval(() => {
      n -= 1;
      this.io.to(this.roomId).emit("countdown", n);
      if (n <= 0) {
        clearInterval(cd);
        this.timer = setInterval(() => this.tick(), 1000);
      }
    }, 1000);
  }

  findPair() {
    const seen = new Map();
    for (const card of this.table) {
      if (seen.has(card.type)) return [seen.get(card.type), card];
      seen.set(card.type, card);
    }
    return null;
  }

  openMatchIfAny() {
    const pair = this.findPair();
    if (pair) {
      this.matchOpen = true;
      this.matchPair = pair;
      this.io.to(this.roomId).emit("matchAvailable", {
        cards: pair.map((c) => c.uid),
        type: pair[0].type
      });
      return true;
    }
    return false;
  }

  tick() {
    if (this.over || this.matchOpen) return;
    if (this.deck.length === 0) {
      this.endByDeck();
      return;
    }
    const card = this.deck.pop();
    this.table.push(card);
    this.io.to(this.roomId).emit("cardRevealed", {
      card,
      index: this.table.length - 1
    });
    this.openMatchIfAny();
  }

  claim(playerId) {
    if (this.over) return;
    const now = Date.now();
    if (this.locked[playerId] && this.locked[playerId] > now) return;

    if (!this.matchOpen) {
      this.locked[playerId] = now + 1500;
      this.io.to(playerId).emit("penalty", { until: this.locked[playerId] });
      return;
    }

    this.matchOpen = false;
    const pairUids = this.matchPair.map((c) => c.uid);
    this.matchPair = null;
    this.scores[playerId] += 1;
    this.table = this.table.filter((c) => !pairUids.includes(c.uid));

    this.io.to(this.roomId).emit("claimResult", {
      winner: playerId,
      removed: pairUids,
      scores: this.scores
    });

    if (this.scores[playerId] >= this.target) {
      this.over = true;
      if (this.timer) clearInterval(this.timer);
      this.io.to(this.roomId).emit("gameOver", {
        winner: playerId,
        scores: this.scores
      });
      return;
    }

    this.openMatchIfAny();
  }

  endByDeck() {
    this.over = true;
    if (this.timer) clearInterval(this.timer);
    const [a, b] = this.players;
    let winner = null;
    if (this.scores[a] > this.scores[b]) winner = a;
    else if (this.scores[b] > this.scores[a]) winner = b;
    this.io.to(this.roomId).emit("gameOver", {
      winner,
      scores: this.scores,
      reason: "deck"
    });
  }

  stop() {
    this.over = true;
    if (this.timer) clearInterval(this.timer);
  }
}
