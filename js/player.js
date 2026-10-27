// El rellotge: programa compàs a compàs la banda, la teva part (a la demostració)
// i el metrònom, i diu a l'animació on som.

import { audioContext, resumeAudio, loadSet, drum, click, tone, saxTone, stopAll, busGain } from './audio.js';
import { bandBar, clicksBar, BAND_SETS } from './band.js';
import { preparePart, voiceBar } from './parts.js';
import { metre } from './theory.js';

/**
 * Una cançó per tocar.
 *  { inst ('alt' | 'tenor'), bars (de parseProgression), metre, tempo, estil, part (spec), voice, extra(k) }
 * `content(k)` torna el compàs k de la progressió (amb repetició) ja calculat.
 * La banda sona sencera (el saxo és un membre més: no hi ha cap instrument a treure).
 */
export function makeSong(o) {
  const M = metre(o.metre);
  const cache = new Map();
  const partOf = o.part ? preparePart(o.part, o.inst, o.bars, M) : () => [];
  const song = {
    ...o, M,
    family: 'sax',
    content(k) {
      if (cache.has(k)) return cache.get(k);
      const bar = o.bars[((k % o.bars.length) + o.bars.length) % o.bars.length];
      const part = partOf(k);
      const c = {
        bar,
        band: bandBar(o.estil, bar, M, song.family),
        part,
        voice: voiceBar({ voice: o.voice }, bar, M, k, part),
      };
      if (o.extra) Object.assign(c, o.extra(k, bar, M));
      cache.set(k, c);
      return c;
    },
  };
  return song;
}

export const SETS_FOR = () => [...BAND_SETS];

export async function prepare(inst) {
  await resumeAudio();
  await Promise.all(SETS_FOR().map(loadSet));
}

// ---- Transport ------------------------------------------------------------------------------------------------

let run = null;

export const isPlaying = () => !!run;

/**
 * Comença a tocar.
 *  plan(i) → { mode: 'count' | 'demo' | 'play' | 'sing' | 'question' | 'answer', k } o null quan s'acaba.
 *  opts: { metronome, guide (0–1: volum de la teva part quan toques tu), onEnd, onBar }
 */
export function start(song, plan, opts = {}) {
  stop();
  const ctx = audioContext();
  const spq = 60 / song.tempo / song.M.pulseLen; // segons per negra
  const barDur = song.M.beats * spq;
  const t0 = ctx.currentTime + 0.15;
  run = { song, plan, opts, spq, barDur, t0, next: 0, bars: [], ended: null, timer: null };
  const r = run;
  const tick = () => {
    if (run !== r) return;
    const horizon = ctx.currentTime + 0.35;
    while (r.ended == null && r.t0 + r.next * r.barDur < horizon) {
      const seg = plan(r.next);
      if (!seg) { r.ended = r.next; break; }
      scheduleBar(r, r.next, seg);
      r.next++;
    }
    if (r.ended != null && ctx.currentTime > r.t0 + r.ended * r.barDur + 0.25) {
      const cb = r.opts.onEnd;
      stop();
      cb?.();
    }
  };
  r.timer = setInterval(tick, 25);
  tick();
  return r;
}

export function stop() {
  if (!run) return;
  clearInterval(run.timer);
  run = null;
  stopAll();
}

function scheduleBar(r, i, seg) {
  const { song, spq } = r;
  const t = r.t0 + i * r.barDur;
  const content = seg.mode === 'count' ? null : song.content(seg.k);
  r.bars[i] = { i, t, seg, content };
  const at = (beat) => t + beat * spq;
  // metrònom: al compte, o sempre si està encès
  if (seg.mode === 'count' || r.opts.metronome || song.estil === 'metronom') {
    for (const c of clicksBar(song.M)) click(at(c.beat), c.accent);
  }
  if (!content) return;
  for (const e of content.band) playBand(e, at, spq);
  // 'sing': l'alumnat canta (el saxo del joc sona si hi ha guia de cant)
  const partGain = seg.mode === 'demo' || seg.mode === 'question' ? 1 : seg.mode === 'sing' ? (r.opts.singGuide ? 1 : 0) : seg.mode === 'play' ? (r.opts.guide ?? 0) : 0;
  if (partGain > 0) for (const e of content.part) playPart(song, e, at, spq, partGain);
  const voiceGain = seg.mode === 'demo' ? 1 : seg.mode === 'sing' ? (r.opts.singGuide ? 0.5 : 0) : seg.mode === 'play' ? Math.max(r.opts.guide ?? 0, r.opts.voiceGuide ? 0.6 : 0) : 0;
  if (voiceGain > 0) for (const v of content.voice) if (v.sing && v.midi) tone('rhodes', v.midi, at(v.beat), v.dur * spq, { gain: 0.32 * voiceGain, dest: 'me' });
  r.opts.onBar?.(r.bars[i]);
}

function playBand(e, at, spq) {
  if (e.inst === 'drum') { drum(e.piece, at(e.beat), { vel: e.vel ?? 1 }); return; }
  const t = at(e.beat);
  e.notes.forEach((m, j) => tone(e.inst, m, t + (e.strum ? j * e.strum : 0), e.dur * spq, { gain: e.gain }));
}

/** Fa sonar una nota de la teva part (el saxo sintètic). */
export function playPart(song, e, at, spq, gain = 1) {
  if (e.kind !== 'note' || e.midi == null) return;
  const t = at(e.beat);
  const dur = Math.max(0.1, e.dur * spq - 0.03);
  const vel = { p: 0.35, mf: 0.65, f: 0.95 }[e.dyn] ?? 0.72;
  saxTone(e.midi, t, dur, { gain: 0.55 * gain, dest: 'me', vel, legato: !!e.tied });
}

/**
 * On som ara (el que se sent pels altaveus): { i (compàs del pla), beat (dins del compàs),
 * bar (informació del compàs), abs (negres des de l'inici), time }.
 */
export function position() {
  if (!run) return null;
  const ctx = audioContext();
  const heard = ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0);
  const x = (heard - run.t0) / run.barDur;
  const i = Math.floor(x);
  return { i, beat: (x - i) * run.song.M.beats, abs: x * run.song.M.beats, bar: run.bars[i] ?? null, bars: run.bars, time: heard, spq: run.spq, song: run.song, barDur: run.barDur, t0: run.t0 };
}

export function setGuide(v) { if (run) run.opts.guide = v; }
export function setMetronome(v) { if (run) run.opts.metronome = v; }
export const bandVolume = (v) => { const g = busGain('band'); const d = busGain('drums'); if (g) g.value = 0.8 * v; if (d) d.value = 0.85 * v; };
