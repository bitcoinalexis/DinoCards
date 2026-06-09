const TYPES = ["red", "blue", "b", "white", "bu", "wo", "cchong", "cvue", "rno"];

const DIFFICULTY = {
  facil: [950, 1900],
  normal: [600, 1200],
  dificil: [330, 720]
};

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

export class LocalGame {
  constructor(handlers, opts = {}) {
    this.h = handlers;
    this.you = "human";
    this.ai = "ia";
    this.scores = { human: 0, ia: 0 };
    this.deck = buildDeck(6);
    this.table = [];
    this.matchOpen = false;
    this.matchPair = null;
    this.lockedUntil = 0;
    this.target = 4;
    this.over = false;
    this.timer = null;
    this.aiTimer = null;
    this.aiRange = DIFFICULTY[opts.difficulty] || DIFFICULTY.normal;
  }

  emit(ev, data) {
    if (this.h[ev]) this.h[ev](data);
  }

  start() {
    let n = 3;
    this.emit("countdown", n);
    const cd = setInterval(() => {
      n -= 1;
      this.emit("countdown", n);
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

  scheduleAI() {
    this.cancelAI();
    const [min, max] = this.aiRange;
    const delay = min + Math.random() * (max - min);
    this.aiTimer = setTimeout(() => this.aiClaim(), delay);
  }

  cancelAI() {
    if (this.aiTimer) {
      clearTimeout(this.aiTimer);
      this.aiTimer = null;
    }
  }

  openMatchIfAny() {
    const pair = this.findPair();
    if (pair) {
      this.matchOpen = true;
      this.matchPair = pair;
      this.emit("matchAvailable", {
        cards: pair.map((c) => c.uid),
        type: pair[0].type
      });
      this.scheduleAI();
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
    this.emit("cardRevealed", { card, index: this.table.length - 1 });
    this.openMatchIfAny();
  }

  resolveClaim(winner) {
    this.matchOpen = false;
    this.cancelAI();
    const uids = this.matchPair.map((c) => c.uid);
    this.matchPair = null;
    this.scores[winner] += 1;
    this.table = this.table.filter((c) => !uids.includes(c.uid));

    this.emit("claimResult", {
      winner,
      removed: uids,
      scores: { ...this.scores }
    });

    if (this.scores[winner] >= this.target) {
      this.over = true;
      if (this.timer) clearInterval(this.timer);
      this.emit("gameOver", { winner, scores: { ...this.scores } });
      return;
    }
    this.openMatchIfAny();
  }

  claim() {
    if (this.over) return;
    if (Date.now() < this.lockedUntil) return;
    if (!this.matchOpen) {
      this.lockedUntil = Date.now() + 1500;
      this.emit("penalty", { until: this.lockedUntil });
      return;
    }
    this.resolveClaim(this.you);
  }

  aiClaim() {
    if (this.over || !this.matchOpen) return;
    this.resolveClaim(this.ai);
  }

  endByDeck() {
    this.over = true;
    if (this.timer) clearInterval(this.timer);
    this.cancelAI();
    let winner = null;
    if (this.scores.human > this.scores.ia) winner = "human";
    else if (this.scores.ia > this.scores.human) winner = "ia";
    this.emit("gameOver", { winner, scores: { ...this.scores } });
  }

  stop() {
    this.over = true;
    if (this.timer) clearInterval(this.timer);
    this.cancelAI();
  }
}
