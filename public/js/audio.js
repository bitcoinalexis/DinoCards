const BASE = "sound/";

export const SOUNDS = {
  cardFlip: {
    src: BASE + "freesound_community-card-sounds-35956.mp3",
    volume: 0.7,
    pool: 4
  }
};

let masterVolume = 1;
let muted = false;
let ready = false;
const pools = new Map();

function build() {
  for (const name in SOUNDS) {
    const cfg = SOUNDS[name];
    const items = [];
    const size = cfg.pool || 1;
    for (let i = 0; i < size; i++) {
      const a = new Audio(cfg.src);
      a.preload = "auto";
      a.volume = (cfg.volume ?? 1) * masterVolume;
      items.push(a);
    }
    pools.set(name, { items, idx: 0, cfg });
  }
}

export function initAudio() {
  if (ready) return;
  build();
  ready = true;
}

export function play(name) {
  if (muted) return;
  if (!ready) initAudio();
  const p = pools.get(name);
  if (!p) return;
  const a = p.items[p.idx];
  p.idx = (p.idx + 1) % p.items.length;
  try {
    a.currentTime = 0;
    a.volume = (p.cfg.volume ?? 1) * masterVolume;
    const r = a.play();
    if (r && r.catch) r.catch(() => {});
  } catch (e) {}
}

export function setMasterVolume(v) {
  masterVolume = Math.max(0, Math.min(1, v));
}

export function setMuted(m) {
  muted = !!m;
}

export function isMuted() {
  return muted;
}
