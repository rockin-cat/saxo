// So: un sol AudioContext, mostres de la carpeta assets/sons (llicència MIT,
// vegeu assets/sons/LLICENCIA.txt) i una cadena de sortida senzilla
// (busos → compressor suau → limitador → altaveus).
//
// Tot el que sona es programa amb temps de l'AudioContext: la banda, la
// bateria de la demostració, el clic i els cops de l'alumnat.

import SOUNDS from './data/sons.js';

let ctx = null;
const bus = {};
const buffers = {}; // set -> Map(midi|name -> AudioBuffer)
const loading = {};
const live = new Set(); // fonts programades, per poder-les aturar

const NOTE_PC = { C: 0, Db: 1, D: 2, Eb: 3, E: 4, F: 5, Gb: 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
export const nameToMidi = (name) => {
  const m = /^([A-G]b?)(-?\d)$/.exec(name);
  return m ? NOTE_PC[m[1]] + (Number(m[2]) + 1) * 12 : null;
};

export function audioContext() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  // Retard mínim: el navegador fa servir el búfer més petit que pugui (els teus cops sonen abans).
  // Si en algun ordinador el so peta, a la configuració es pot tornar al valor normal.
  try { ctx = new AC({ latencyHint: 'interactive' }); } catch { ctx = new AC(); }
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 2.5; comp.attack.value = 0.01; comp.release.value = 0.2;
  const lim = ctx.createDynamicsCompressor();
  lim.threshold.value = -2; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.08;
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(comp); comp.connect(lim); lim.connect(ctx.destination);
  bus.master = master;
  bus.meter = ctx.createAnalyser();
  lim.connect(bus.meter);
  // Sala curta per a la banda: tot sona al mateix lloc.
  const room = makeRoom(master);
  for (const [id, gain, send] of [['band', 0.8, 0.18], ['drums', 0.85, 0.06], ['click', 0.55, 0], ['me', 0.95, 0.12]]) {
    const g = ctx.createGain();
    g.gain.value = gain;
    g.connect(master);
    if (send) {
      const s = ctx.createGain();
      s.gain.value = send;
      g.connect(s); s.connect(room);
    }
    bus[id] = g;
  }
  return ctx;
}

function makeRoom(out) {
  const sr = ctx.sampleRate, len = Math.round(sr * 0.8);
  const ir = ctx.createBuffer(2, len, sr);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) { const x = i / len; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - x, 2.4) * Math.exp(-3 * x); }
  }
  const conv = ctx.createConvolver();
  conv.buffer = ir;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 250;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4500;
  hp.connect(conv); conv.connect(lp); lp.connect(out);
  return hp;
}

export const busGain = (id) => bus[id]?.gain;
/** Nivell (RMS) del que surt ara mateix, per a les proves. */
export function outputLevel() {
  if (!bus.meter) return 0;
  const a = new Float32Array(bus.meter.fftSize);
  bus.meter.getFloatTimeDomainData(a);
  return Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length);
}

export async function resumeAudio() {
  const c = audioContext();
  if (c.state !== 'running') {
    try { await c.resume(); } catch { /* cal un clic */ }
  }
  return c.state === 'running';
}

/** Carrega un joc de mostres ('bateria', 'baix', 'rhodes', 'guitarra', 'guitarra_dist', 'acustica'). */
export function loadSet(set) {
  if (loading[set]) return loading[set];
  const c = audioContext();
  const map = new Map();
  buffers[set] = map;
  loading[set] = Promise.all(
    (SOUNDS[set] ?? []).map(async (name) => {
      try {
        const res = await fetch(`assets/sons/${set}/${encodeURIComponent(name)}.mp3`);
        const buf = await c.decodeAudioData(await res.arrayBuffer());
        buf.onset = onsetOf(buf);
        map.set(set === 'bateria' ? name : nameToMidi(name), buf);
      } catch (e) {
        console.warn(`[So] no s'ha pogut carregar ${set}/${name}`, e);
      }
    }),
  ).then(() => map);
  return loading[set];
}

export const setsReady = (sets) => sets.every((s) => buffers[s] && buffers[s].size);

/** On comença de debò el so (els mp3 porten uns mil·lisegons de silenci al davant). */
function onsetOf(buf) {
  const d = buf.getChannelData(0);
  let peak = 0;
  const n = Math.min(d.length, Math.round(buf.sampleRate * 0.2));
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i]));
  const thr = peak * 0.05;
  for (let i = 0; i < n; i++) if (Math.abs(d[i]) > thr) return Math.max(0, i - 8) / buf.sampleRate;
  return 0;
}

function start(buffer, time, { gain = 1, rate = 1, dest = 'band', dur = null, release = 0.08, pan = 0, attack = 0, glide = null }) {
  const c = audioContext();
  const src = c.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = rate;
  const g = c.createGain();
  const t = Math.max(time, c.currentTime);
  if (attack) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
  } else g.gain.setValueAtTime(gain, t);
  // glide: [{ at (s des de l'inici), to (rate), dur }] per a glissandos i bendings
  if (glide) {
    for (const step of glide) {
      src.playbackRate.setValueAtTime(step.from ?? rate, t + step.at);
      src.playbackRate.linearRampToValueAtTime(step.to, t + step.at + step.dur);
    }
  }
  let node = g;
  if (pan && c.createStereoPanner) {
    const p = c.createStereoPanner();
    p.pan.value = pan;
    g.connect(p);
    node = p;
  }
  src.connect(g);
  node.connect(bus[dest] ?? bus.master);
  src.start(t, buffer.onset || 0);
  if (dur != null) {
    const end = t + Math.max(0.03, dur);
    g.gain.setValueAtTime(gain, end);
    g.gain.exponentialRampToValueAtTime(0.0001, end + release);
    src.stop(end + release + 0.02);
  }
  const item = { src, g, time: t };
  live.add(item);
  src.onended = () => live.delete(item);
  return item;
}

// ---- Bateria ----------------------------------------------------------------------------------------------

const DRUM_SAMPLE = { kk: 'kk', ghostkk: 'kk', sn: 'sn', ghost: 'sn', rim: 'stick', hh: 'hh', oh: 'oh', ride: 'ride', crash: 'crash', t1: 't1', t2: 't2', t3: 't3', stick: 'stick', pedal: 'hh' };
const DRUM_GAIN = { kk: 1, ghostkk: 0.45, sn: 0.8, ghost: 0.25, rim: 0.55, hh: 0.45, oh: 0.45, ride: 0.5, crash: 0.5, t1: 0.8, t2: 0.8, t3: 0.85, stick: 0.6, pedal: 0.15 };
const DRUM_PAN = { hh: -0.25, oh: -0.25, pedal: -0.25, crash: -0.35, ride: 0.35, t1: -0.1, t2: 0.1, t3: 0.3 };

/** Un cop de bateria. `vel` 0–1. Sense mostres encara, un so sintètic de recanvi. */
export function drum(piece, time, { vel = 1, dest = 'drums' } = {}) {
  const buf = buffers.bateria?.get(DRUM_SAMPLE[piece]);
  const gain = (DRUM_GAIN[piece] ?? 0.7) * (0.35 + 0.65 * vel);
  if (buf) {
    const dur = piece === 'oh' ? 0.5 : piece === 'pedal' ? 0.08 : null;
    return start(buf, time, { gain, dest, dur, release: 0.12, pan: DRUM_PAN[piece] ?? 0 });
  }
  return synthDrum(piece, time, gain, dest);
}

function synthDrum(piece, time, gain, dest) {
  const c = audioContext();
  const t = Math.max(time, c.currentTime);
  const g = c.createGain();
  g.connect(bus[dest]);
  const o = c.createOscillator();
  if (piece === 'kk' || piece === 'ghostkk' || piece.startsWith('t')) {
    const f = { kk: 150, ghostkk: 150, t1: 330, t2: 240, t3: 170 }[piece] ?? 150;
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f / 3, t + 0.12);
  } else {
    o.type = 'square';
    o.frequency.value = piece === 'sn' || piece === 'ghost' ? 220 : 3000;
  }
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
  o.connect(g);
  o.start(t);
  o.stop(t + 0.2);
  return null;
}

/** Clic de metrònom (sintètic, net). */
export function click(time, accent = false) {
  const c = audioContext();
  const t = Math.max(time, c.currentTime);
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'square';
  o.frequency.value = accent ? 1760 : 1320;
  g.gain.setValueAtTime(accent ? 0.35 : 0.22, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
  o.connect(g); g.connect(bus.click);
  o.start(t); o.stop(t + 0.05);
  const item = { src: o, g, time: t };
  live.add(item);
  o.onended = () => live.delete(item);
}

// ---- Instruments afinats ------------------------------------------------------------------------------------

/** Una nota d'un instrument de mostres: fa servir la mostra més propera i en canvia l'afinació. */
export function tone(set, midi, time, dur, { gain = 0.6, dest = 'band', release = 0.12, pan = 0, attack = 0, glideTo = null } = {}) {
  const map = buffers[set];
  if (!map || !map.size) return null;
  let best = null;
  let dist = Infinity;
  for (const k of map.keys()) {
    const d = Math.abs(k - midi);
    if (d < dist) { dist = d; best = k; }
  }
  if (best == null) return null;
  const rate = Math.pow(2, (midi - best) / 12);
  // glideTo: [{ at, midi, dur }] → canvis d'afinació dins la mateixa nota
  let glide = null;
  if (glideTo) {
    let prev = rate;
    glide = glideTo.map((g) => { const to = Math.pow(2, (g.midi - best) / 12); const step = { at: g.at, dur: g.dur, from: prev, to }; prev = to; return step; });
  }
  return start(map.get(best), time, { gain, rate, dest, dur, release, pan, attack, glide });
}


// ---- Saxo sintètic ------------------------------------------------------------------------------------------
// No hi ha mostres de saxo: dues dents de serra una mica desafinades, un filtre que s'obre amb l'atac
// i un vibrato suau que entra a mig camí. Prou per sentir la melodia i la dinàmica.

/** Una nota de saxo. `vel` 0–1 (la pressió de l'aire: obre el filtre i puja el volum). */
export function saxTone(midi, time, dur, { gain = 0.5, dest = 'me', vel = 0.8, attack = 0.035, release = 0.09, legato = false } = {}) {
  const c = audioContext();
  const t = Math.max(time, c.currentTime);
  const f = 440 * Math.pow(2, (midi - 69) / 12);
  const g = c.createGain();
  const filt = c.createBiquadFilter();
  filt.type = 'lowpass';
  filt.Q.value = 1.2;
  const cut = Math.min(9000, f * (2.2 + 3 * vel));
  filt.frequency.setValueAtTime(cut * 0.45, t);
  filt.frequency.linearRampToValueAtTime(cut, t + attack + 0.04);
  const o1 = c.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = f;
  const o2 = c.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = f * 1.004;
  const o3 = c.createOscillator(); o3.type = 'square'; o3.frequency.value = f / 2; // una mica de cos al greu
  const g3 = c.createGain(); g3.gain.value = 0.12;
  // vibrato que entra a poc a poc
  const lfo = c.createOscillator(); lfo.frequency.value = 5.2;
  const lg = c.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.006, t + Math.min(0.5, dur * 0.6));
  lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
  o1.connect(filt); o2.connect(filt); o3.connect(g3); g3.connect(filt);
  filt.connect(g);
  g.connect(bus[dest] ?? bus.master);
  const peak = gain * (0.45 + 0.55 * vel);
  g.gain.setValueAtTime(legato ? peak * 0.7 : 0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + (legato ? 0.015 : attack));
  const end = t + Math.max(0.05, dur);
  g.gain.setValueAtTime(peak, end);
  g.gain.exponentialRampToValueAtTime(0.0001, end + release);
  for (const o of [o1, o2, o3, lfo]) { o.start(t); o.stop(end + release + 0.02); }
  const item = { src: o1, g, time: t };
  live.add(item);
  o1.onended = () => live.delete(item);
  return item;
}

/** El mateix so per a una nota que comença ara i no sabem quan acaba (el que toca l'alumnat sense TravelSax). */
export function saxStart(midi, { gain = 0.45, vel = 0.8 } = {}) {
  const c = audioContext();
  const item = saxTone(midi, c.currentTime, 30, { gain, vel, dest: 'me' });
  return {
    stop() {
      const now = c.currentTime;
      try { item.g.gain.cancelScheduledValues(now); item.g.gain.setValueAtTime(item.g.gain.value, now); item.g.gain.exponentialRampToValueAtTime(0.0001, now + 0.08); item.src.stop(now + 0.1); } catch { /* ja parada */ }
    },
  };
}

/** Atura tot el que s'havia programat (amb una baixada ràpida perquè no peti). */
export function stopAll() {
  if (!ctx) return;
  const now = ctx.currentTime;
  for (const item of live) {
    try {
      item.g.gain.cancelScheduledValues(now);
      item.g.gain.setValueAtTime(item.g.gain.value, now);
      item.g.gain.linearRampToValueAtTime(0.0001, now + 0.05);
      item.src.stop(now + 0.06);
    } catch { /* ja s'havia aturat */ }
  }
  live.clear();
}

/**
 * El temps de l'AudioContext que se sent als altaveus en el moment `perfMs`
 * (rellotge de performance.now, el mateix de les notes MIDI). Resta la latència
 * de sortida que el navegador coneix i la que ha ajustat l'usuari.
 */
let extraLatency = 0;
export const setExtraLatency = (ms) => { extraLatency = (Number(ms) || 0) / 1000; };
export function heardTime(perfMs = performance.now()) {
  const c = audioContext();
  const stamp = c.getOutputTimestamp?.();
  if (stamp && stamp.contextTime > 0 && stamp.performanceTime > 0) {
    return stamp.contextTime + (perfMs - stamp.performanceTime) / 1000 - extraLatency;
  }
  const lat = (c.outputLatency || 0) + (c.baseLatency || 0);
  return c.currentTime - lat - extraLatency + (perfMs - performance.now()) / 1000;
}

export const outputLatencyMs = () => {
  const c = audioContext();
  return Math.round(((c.outputLatency || 0) + (c.baseLatency || 0)) * 1000);
};
